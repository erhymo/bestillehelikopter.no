import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { generateJobPdf } from "./generate-job-pdf";
import { mintOfferToken, buildOfferUrl, getTokenExpiration } from "./tokens";
import { sendRfqEmail } from "./email";

// ── Types (mirrored subset) ───────────────────────────────────

interface JobCustomer {
  name: string;
  company?: string;
  email: string;
  phone: string;
}

interface JobData {
  customer: JobCustomer;
  selectedCompanyIds: string[];
  desiredDate: string;
  flexibleDate: boolean;
  nettbruk: boolean;
  over15m: boolean;
  totalFlightTimeMin: number;
  drops: Array<{ lat: number; lng: number }>;
}

interface CompanyDoc {
  name: string;
  email: string;
  disabled: boolean;
}



// ── Main trigger ──────────────────────────────────────────────

/**
 * Trigger: Firestore onCreate on jobs/{jobId}
 * 1. Generate PDF
 * 2. Create offer subdocs with signed tokens
 * 3. Send RFQ emails via SendGrid
 * 4. Update offer statuses to "sent"
 * 5. Write event log
 */
export const onRfqCreate = onDocumentCreated(
  { document: "jobs/{jobId}", region: "europe-west1" },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const jobId = event.params.jobId;
    const job = snapshot.data() as JobData;
    const db = admin.firestore();

    console.log(`[onRfqCreate] Processing job ${jobId}`);

    // 1. Generate PDF
    let pdfBytes: Uint8Array;
    try {
      const result = await generateJobPdf(jobId);
      pdfBytes = result.pdfBytes;
      console.log(`[onRfqCreate] PDF generated: ${result.pdfRef}`);
    } catch (err) {
      console.error(`[onRfqCreate] PDF generation failed for ${jobId}:`, err);
      // Log error event but don't block — we can still send emails without PDF
      await db.collection("events").add({
        type: "rfq.pdf_error",
        jobId,
        error: err instanceof Error ? err.message : String(err),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      // Use empty PDF bytes — email will be sent without attachment
      pdfBytes = new Uint8Array(0);
    }

    // 2. Fetch selected companies
    const companyIds = job.selectedCompanyIds ?? [];
    if (companyIds.length === 0) {
      console.warn(`[onRfqCreate] No companies selected for job ${jobId}`);
      return;
    }

    const companySnaps = await Promise.all(
      companyIds.map((id) => db.doc(`companies/${id}`).get()),
    );

    const companies = companySnaps
      .filter((snap) => snap.exists)
      .map((snap) => ({
        id: snap.id,
        ...(snap.data() as CompanyDoc),
      }))
      .filter((c) => !c.disabled);

    if (companies.length === 0) {
      console.warn(`[onRfqCreate] No active companies found for job ${jobId}`);
      return;
    }

    // 3. Create offer subdocs + mint tokens
    const batch = db.batch();
    const offerData: Array<{
      offerId: string;
      companyId: string;
      companyName: string;
      companyEmail: string;
      token: string;
      offerUrl: string;
    }> = [];

    const tokenExpSeconds = getTokenExpiration(14);
    const now = admin.firestore.Timestamp.now();

    for (const company of companies) {
      const offerRef = db.collection(`jobs/${jobId}/offers`).doc();
      const token = mintOfferToken(jobId, company.id, offerRef.id);
      const offerUrl = buildOfferUrl(token);

      batch.set(offerRef, {
        _v: 1,
        companyId: company.id,
        token,
        tokenExpiresAt: admin.firestore.Timestamp.fromMillis(
          tokenExpSeconds * 1000,
        ),
        price: null,
        hourlyRate: null,
        hivRate: null,
        comment: null,
        attachmentRef: null,
        status: "pending",
        emailOpens: 0,
        linkClicks: 0,
        sentAt: now,
        viewedAt: null,
        repliedAt: null,
      });

      offerData.push({
        offerId: offerRef.id,
        companyId: company.id,
        companyName: company.name,
        companyEmail: company.email,
        token,
        offerUrl,
      });
    }

    await batch.commit();
    console.log(
      `[onRfqCreate] Created ${offerData.length} offer subdocs for job ${jobId}`,
    );

    // 4. Send emails via sendRfqEmail
    const pdfBase64 =
      pdfBytes.length > 0
        ? Buffer.from(pdfBytes).toString("base64")
        : null;

    const emailPromises = offerData.map((offer) =>
      sendRfqEmail({
        jobId,
        companyName: offer.companyName,
        companyEmail: offer.companyEmail,
        companyId: offer.companyId,
        offerId: offer.offerId,
        offerUrl: offer.offerUrl,
        dropCount: job.drops.length,
        totalFlightTimeMin: job.totalFlightTimeMin,
        desiredDate: job.desiredDate,
        flexibleDate: job.flexibleDate,
        nettbruk: job.nettbruk,
        over15m: job.over15m,
        pdfBase64,
      }),
    );

    const results = await Promise.all(emailPromises);

    // 5. Update sent offers to status "sent"
    const sentBatch = db.batch();
    for (const result of results) {
      if (result.success) {
        sentBatch.update(db.doc(`jobs/${jobId}/offers/${result.offerId}`), {
          status: "sent",
        });
      }
    }
    await sentBatch.commit();

    const sentCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    console.log(
      `[onRfqCreate] Emails sent: ${sentCount}/${results.length} (${failedCount} failed)`,
    );

    // 6. Write event log
    await db.collection("events").add({
      type: "rfq.created",
      jobId,
      companiesSent: sentCount,
      companiesFailed: failedCount,
      totalCompanies: companies.length,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`[onRfqCreate] Done processing job ${jobId}`);
  },
);

