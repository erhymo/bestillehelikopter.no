/**
 * Cloud Functions for BestilleHelikopter.no
 *
 * Eksporterer alle funksjoner som Firebase Functions runtime plukker opp.
 */

import * as admin from "firebase-admin";
admin.initializeApp();

export { onRfqCreate } from "./on-rfq-create";
export { onOfferAccept } from "./on-offer-accept";
export { scheduledAutoDelete } from "./scheduled-auto-delete";
export { scheduledAnalyticsRollup } from "./scheduled-analytics-rollup";

// Webhook handlers
export { sendgridWebhook } from "./sendgrid-webhook";

// Internal helpers (not Cloud Function triggers — called from other functions)
export { generateJobPdf } from "./generate-job-pdf";

