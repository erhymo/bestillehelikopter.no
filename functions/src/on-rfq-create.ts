import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { generateJobPdf } from "./generate-job-pdf";
import { mintOfferToken, buildOfferUrl, getTokenExpiration } from "./tokens";
import { sendRfqEmail } from "./email";
import { RECIPIENT_COMPANY_ID } from "./recipientCompany";

// ── Types (mirrored subset) ───────────────────────────────────

interface JobCustomer {
  name: string;
  company?: string;
  email: string;
  phone: string;
}

interface JobData {
  customer: JobCustomer;
  desiredDate: string;
  flexibleDate: boolean;
  totalFlightTimeMin: number;
  drops: Array<{ lat: number; lng: number }>;
}

// ── Main trigger ──────────────────────────────────────────────

/**
 * Trigger: Firestore onCreate on jobs/{jobId}
 * 1. Generate PDF
 * 2. Create the offer subdoc (single fixed recipient) with a signed token
 * 3. Send the RFQ email via SendGrid
 * 4. Update offer status to "sent"
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

    // 2. Fetch the fixed recipient company
    const companySnap = await db.doc(`companies/${RECIPIENT_COMPANY_ID}`).get();
    if (!companySnap.exists) {
      console.error(
        `[onRfqCreate] Recipient company doc "${RECIPIENT_COMPANY_ID}" not found for job ${jobId}`,
      );
      return;
    }
    const company = companySnap.data() as { name: string; email: string };

    // 3. Create offer subdoc + mint token
    const offerRef = db.collection(`jobs/${jobId}/offers`).doc();
    const token = mintOfferToken(jobId, RECIPIENT_COMPANY_ID, offerRef.id);
    const offerUrl = buildOfferUrl(token);

    const tokenExpSeconds = getTokenExpiration(14);
    const now = admin.firestore.Timestamp.now();

    await offerRef.set({
      _v: 1,
      companyId: RECIPIENT_COMPANY_ID,
      token,
      tokenExpiresAt: admin.firestore.Timestamp.fromMillis(tokenExpSeconds * 1000),
      price: null,
      hourlyRate: null,
      addons: [],
      totalPrice: null,
      comment: null,
      attachmentRef: null,
      status: "pending",
      emailOpens: 0,
      linkClicks: 0,
      sentAt: now,
      viewedAt: null,
      repliedAt: null,
    });

    console.log(`[onRfqCreate] Created offer subdoc for job ${jobId}`);

    // 4. Send email via sendRfqEmail
    const pdfBase64 =
      pdfBytes.length > 0 ? Buffer.from(pdfBytes).toString("base64") : null;

    const result = await sendRfqEmail({
      jobId,
      companyName: company.name,
      companyEmail: company.email,
      companyId: RECIPIENT_COMPANY_ID,
      offerId: offerRef.id,
      offerUrl,
      dropCount: job.drops.length,
      totalFlightTimeMin: job.totalFlightTimeMin,
      desiredDate: job.desiredDate,
      flexibleDate: job.flexibleDate,
      pdfBase64,
    });

    if (result.success) {
      await offerRef.update({ status: "sent" });
    }

    console.log(
      `[onRfqCreate] Email ${result.success ? "sent" : "FAILED"} for job ${jobId}${result.error ? `: ${result.error}` : ""}`,
    );

    // 5. Write event log
    await db.collection("events").add({
      type: "rfq.created",
      jobId,
      companiesSent: result.success ? 1 : 0,
      companiesFailed: result.success ? 0 : 1,
      totalCompanies: 1,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`[onRfqCreate] Done processing job ${jobId}`);
  },
);
