/**
 * Cloud Functions for BestilleHelikopter.no
 *
 * Eksporterer alle funksjoner som Firebase Functions runtime plukker opp.
 */

export { onRfqCreate } from "./on-rfq-create";
export { onOfferAccept } from "./on-offer-accept";
export { onRatingCreate } from "./on-rating-create";
export { scheduledAutoComplete } from "./scheduled-auto-complete";
export { scheduledAutoDelete } from "./scheduled-auto-delete";
export { scheduledAnalyticsRollup } from "./scheduled-analytics-rollup";

// Webhook handlers
export { sendgridWebhook } from "./sendgrid-webhook";

// Internal helpers (not Cloud Function triggers — called from other functions)
export { generateJobPdf } from "./generate-job-pdf";

