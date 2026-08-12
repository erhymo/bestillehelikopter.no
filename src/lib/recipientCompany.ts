/**
 * There is exactly one recipient for every job in this phase of the
 * product (currently Airlift AS) — not a customer choice. Stored as a
 * fixed-ID Firestore doc so admin can update its contact email without
 * a code change or redeploy.
 */
export const RECIPIENT_COMPANY_ID = "airlift";
