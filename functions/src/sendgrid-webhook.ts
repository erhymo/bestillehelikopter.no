/**
 * SendGrid Event Webhook handler for BestilleHelikopter.no
 *
 * - Verifies ECDSA signature from SendGrid
 * - Writes tracking events to Firestore events collection
 * - Updates offer subdocs (emailOpens, linkClicks, viewedAt, status)
 */

import { onRequest } from "firebase-functions/v2/https";
import { defineString } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { EventWebhook, EventWebhookHeader } from "@sendgrid/eventwebhook";

// ── Params ────────────────────────────────────────────────────

const webhookVerifyKey = defineString("SENDGRID_WEBHOOK_VERIFY_KEY");

// ── Types ─────────────────────────────────────────────────────

interface SendGridEvent {
  event: string;
  timestamp: number;
  email: string;
  sg_event_id: string;
  sg_message_id?: string;
  url?: string; // present on click events
  // custom_args from sendRfqEmail
  jobId?: string;
  companyId?: string;
  offerId?: string;
}

// Map SendGrid event types to our internal event types
const EVENT_TYPE_MAP: Record<string, string> = {
  delivered: "email_delivered",
  open: "email_open",
  click: "email_click",
  bounce: "email_bounce",
  dropped: "email_dropped",
  spamreport: "email_spam",
  deferred: "email_deferred",
};

// ── Webhook handler ───────────────────────────────────────────

export const sendgridWebhook = onRequest(
  { region: "europe-west1", cors: false },
  async (req, res) => {
    // Only accept POST
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    // 1. Verify ECDSA signature
    const signature = req.headers[
      EventWebhookHeader.SIGNATURE().toLowerCase()
    ] as string | undefined;
    const timestamp = req.headers[
      EventWebhookHeader.TIMESTAMP().toLowerCase()
    ] as string | undefined;

    if (!signature || !timestamp) {
      console.warn("[sendgrid-webhook] Missing signature headers");
      res.status(401).send("Unauthorized");
      return;
    }

    try {
      const ew = new EventWebhook();
      const ecPublicKey = ew.convertPublicKeyToECDSA(webhookVerifyKey.value());
      const payload =
        typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      const valid = ew.verifySignature(
        ecPublicKey,
        payload,
        signature,
        timestamp,
      );

      if (!valid) {
        console.warn("[sendgrid-webhook] Invalid signature");
        res.status(401).send("Unauthorized");
        return;
      }
    } catch (err) {
      console.error("[sendgrid-webhook] Signature verification error:", err);
      res.status(401).send("Unauthorized");
      return;
    }

    // 2. Parse events
    const events: SendGridEvent[] = Array.isArray(req.body)
      ? req.body
      : JSON.parse(req.body);

    if (!Array.isArray(events) || events.length === 0) {
      res.status(200).send("OK");
      return;
    }

    const db = admin.firestore();

    // 3. Process each event
    const promises: Promise<void>[] = [];

    for (const evt of events) {
      const eventType = EVENT_TYPE_MAP[evt.event];
      if (!eventType) continue; // ignore untracked event types

      const { jobId, companyId, offerId } = evt;
      if (!jobId || !companyId || !offerId) {
        console.warn(
          `[sendgrid-webhook] Missing custom_args on ${evt.event} event`,
        );
        continue;
      }

      // Write to events collection
      const eventPromise = db
        .collection("events")
        .add({
          type: eventType,
          jobId,
          companyId,
          offerId,
          email: evt.email,
          url: evt.url ?? null,
          sgEventId: evt.sg_event_id,
          sgMessageId: evt.sg_message_id ?? null,
          originalTimestamp: evt.timestamp,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        .then(() => undefined);

      promises.push(eventPromise);

      // Update offer subdoc for specific events
      const offerRef = db.doc(`jobs/${jobId}/offers/${offerId}`);

      if (evt.event === "open") {
        promises.push(
          offerRef
            .update({
              emailOpens: admin.firestore.FieldValue.increment(1),
              // Set viewedAt only if null (first open)
              ...(await offerRef.get().then((snap) => {
                const data = snap.data();
                if (data && !data.viewedAt) {
                  return {
                    viewedAt: admin.firestore.FieldValue.serverTimestamp(),
                    // Update status to viewed only if still "sent"
                    ...(data.status === "sent" ? { status: "viewed" } : {}),
                  };
                }
                return {};
              })),
            })
            .then(() => undefined),
        );
      } else if (evt.event === "click") {
        promises.push(
          offerRef
            .update({
              linkClicks: admin.firestore.FieldValue.increment(1),
            })
            .then(() => undefined),
        );
      }
    }

    await Promise.all(promises);

    console.log(
      `[sendgrid-webhook] Processed ${promises.length} operations from ${events.length} events`,
    );

    res.status(200).send("OK");
  },
);

