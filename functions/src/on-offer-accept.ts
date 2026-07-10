import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import {
  sendAcceptConfirmationEmail,
  sendOfferAcceptedEmail,
  sendJobClosedEmail,
} from "./email";

/**
 * Trigger: Firestore onUpdate on jobs/{jobId}/offers/{offerId}
 * Når status endres til "accepted":
 * - Sett job.status = accepted, job.acceptedCompanyId, job.acceptedAt
 * - Lukk alle andre tilbud (status → "closed")
 * - Send bekreftelse til kunde
 * - Send "akseptert" til vinnende selskap
 * - Send "lukket" til andre selskaper
 * - Logg events
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
    const price = afterData.price as number;

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

    // 2. Close all other offers
    const offersSnap = await db
      .collection(`jobs/${jobId}/offers`)
      .where("companyId", "!=", companyId)
      .get();

    const batch = db.batch();
    for (const doc of offersSnap.docs) {
      batch.update(doc.ref, { status: "closed" });
    }
    await batch.commit();
    console.log(
      `[onOfferAccept] Closed ${offersSnap.size} other offers for job ${jobId}`,
    );

    // 3. Fetch job + winning company for emails
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

    // 4. Send emails (fire-and-forget — log errors but don't fail)
    const emailPromises: Promise<unknown>[] = [];

    // 4a. Customer confirmation
    emailPromises.push(
      sendAcceptConfirmationEmail({
        jobId,
        customerEmail: customer.email,
        customerName: customer.name,
        companyName,
        price,
        offerId,
        companyId,
      }),
    );

    // 4b. Winning company notification
    emailPromises.push(
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
    );

    // 4c. Notify other companies (job closed)
    for (const otherOffer of offersSnap.docs) {
      const otherData = otherOffer.data();
      const otherCompanyId = otherData.companyId as string;
      const otherCompanySnap = await db
        .doc(`companies/${otherCompanyId}`)
        .get();
      const otherCompanyData = otherCompanySnap.data();
      if (otherCompanyData) {
        emailPromises.push(
          sendJobClosedEmail({
            jobId,
            companyEmail: otherCompanyData.email as string,
            companyName: otherCompanyData.name as string,
            offerId: otherOffer.id,
            companyId: otherCompanyId,
          }),
        );
      }
    }

    await Promise.allSettled(emailPromises);

    // 5. Log event
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

