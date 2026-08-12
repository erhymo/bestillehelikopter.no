import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { sendAcceptConfirmationEmail, sendOfferAcceptedEmail } from "./email";

/**
 * Trigger: Firestore onUpdate on jobs/{jobId}/offers/{offerId}
 * Når status endres til "accepted":
 * - Sett job.status = accepted, job.acceptedCompanyId, job.acceptedAt
 * - Send bekreftelse til kunde
 * - Send "akseptert" til selskapet
 * - Logg event
 *
 * Det finnes kun ett tilbud per jobb (én fast mottaker), så det er ikke
 * lenger noe "lukk andre tilbud"-steg å gjøre her.
 */
export const onOfferAccept = onDocumentUpdated(
  {
    document: "jobs/{jobId}/offers/{offerId}",
    region: "europe-west1",
  },
  async (event) => {
    const before = event.data?.before;
    const after = event.data?.after;
    if (!before || !after) return;

    const beforeData = before.data();
    const afterData = after.data();

    // Only react when status changes to "accepted"
    if (beforeData.status === "accepted" || afterData.status !== "accepted") {
      return;
    }

    const jobId = event.params.jobId;
    const offerId = event.params.offerId;
    const companyId = afterData.companyId as string;
    // totalPrice er den endelige, ev. overstyrte prisen fra steg 2 — det er
    // dette kunden faktisk aksepterte, ikke bare den systemberegnede grunnprisen.
    const price = (afterData.totalPrice as number) ?? (afterData.price as number) ?? 0;

    const db = admin.firestore();

    console.log(
      `[onOfferAccept] Offer ${offerId} accepted for job ${jobId}, company ${companyId}`,
    );

    // 1. Update job doc
    await db.doc(`jobs/${jobId}`).update({
      status: "accepted",
      acceptedCompanyId: companyId,
      acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 2. Fetch job + company for emails
    const [jobSnap, companySnap] = await Promise.all([
      db.doc(`jobs/${jobId}`).get(),
      db.doc(`companies/${companyId}`).get(),
    ]);

    const jobData = jobSnap.data();
    const companyData = companySnap.data();
    if (!jobData || !companyData) {
      console.error(
        `[onOfferAccept] Missing job or company data for ${jobId}/${companyId}`,
      );
      return;
    }

    const customer = jobData.customer as {
      name: string;
      email: string;
      phone: string;
    };
    const companyName = companyData.name as string;
    const companyEmail = companyData.email as string;

    // 3. Send emails (fire-and-forget — log errors but don't fail)
    const results = await Promise.allSettled([
      sendAcceptConfirmationEmail({
        jobId,
        customerEmail: customer.email,
        customerName: customer.name,
        companyName,
        price,
        offerId,
        companyId,
      }),
      sendOfferAcceptedEmail({
        jobId,
        companyEmail,
        companyName,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        price,
        offerId,
        companyId,
      }),
    ]);

    for (const result of results) {
      if (result.status === "rejected") {
        console.error("[onOfferAccept] Email failed:", result.reason);
      }
    }

    // 4. Log event
    await db.collection("events").add({
      type: "offer_accepted",
      jobId,
      companyId,
      offerId,
      metadata: { price },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(
      `[onOfferAccept] Completed accept processing for job ${jobId}`,
    );
  },
);
