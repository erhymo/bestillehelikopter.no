/**
 * E2E Test Helpers for BestilleHelikopter.no
 *
 * Provides:
 *  - Token minting (same HMAC logic as src/lib/tokens.ts)
 *  - Firestore seeding via Firebase Admin REST API (emulator)
 *  - Constants for test data
 *
 * Forutsetter Firebase-emulator på localhost:8080 (Firestore)
 * og at TOKEN_SECRET er satt i .env.local / test-env.
 */

import { createHmac } from "crypto";

// ── Config ──────────────────────────────────────────────────────

const EMULATOR_FIRESTORE_URL =
  process.env.FIRESTORE_EMULATOR_HOST ?? "localhost:8080";
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "demo-project";
const TOKEN_SECRET = process.env.TOKEN_SECRET ?? "test-secret-for-e2e-minimum-32-chars!!";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

// ── Test data ───────────────────────────────────────────────────

export const TEST_JOB_ID = "e2e-test-job-001";
export const TEST_COMPANY_ID = "e2e-test-company-001";
export const TEST_OFFER_ID = "e2e-test-offer-001";
export const TEST_COMPANY_NAME = "E2E Helikopter AS";

export const TEST_JOB = {
  _v: 1,
  status: "open",
  customer: {
    name: "Ola Nordmann",
    email: "ola@example.com",
    phone: "+4712345678",
    invoiceAddress: "Storgata 1, 0001 Oslo",
    firebaseUid: "e2e-test-uid",
  },
  pickup: { lat: 60.3913, lng: 5.3221, elevation: 50 },
  drops: [{ lat: 61.1529, lng: 7.0056, elevation: 800, hpieces: 1, loadItems: [] }],
  nettbruk: false,
  over15m: false,
  desiredDate: "2026-06-15",
  flexibleDate: true,
  notes: "E2E test job",
  selectedCompanyIds: [TEST_COMPANY_ID],
  imageRefs: [],
  estimates: [{ legIndex: 0, distanceKm: 150, flightTimeMin: 55 }],
  totalFlightTimeMin: 55,
  pdfRef: null,
  acceptedCompanyId: null,
  acceptedAt: null,
};

export const TEST_COMPANY = {
  _v: 1,
  name: TEST_COMPANY_NAME,
  email: "selskap@example.com",
  phone: "+4798765432",
  region: "Vestland",
  disabled: false,
  avgRating: 0,
  ratingCount: 0,
};

// ── Token helpers (mirror of src/lib/tokens.ts) ─────────────────

function base64urlEncode(data: string): string {
  return Buffer.from(data, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sign(payload: string, secret: string): string {
  return base64urlEncode(
    createHmac("sha256", secret).update(payload).digest("base64"),
  );
}

export function mintTestToken(
  jobId = TEST_JOB_ID,
  companyId = TEST_COMPANY_ID,
  offerId = TEST_OFFER_ID,
  validityDays = 14,
): string {
  const payload = {
    jobId,
    companyId,
    offerId,
    exp: Math.floor(Date.now() / 1000) + validityDays * 24 * 60 * 60,
  };
  const payloadStr = base64urlEncode(JSON.stringify(payload));
  const sig = sign(payloadStr, TOKEN_SECRET);
  return `${payloadStr}.${sig}`;
}

// ── Firestore emulator helpers ──────────────────────────────────

const firestoreBaseUrl = `http://${EMULATOR_FIRESTORE_URL}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

/** Set a document in the Firestore emulator */
export async function seedFirestoreDoc(
  collectionPath: string,
  docId: string,
  data: Record<string, unknown>,
): Promise<void> {
  // Use Firestore REST API with PATCH (upsert)
  const url = `${firestoreBaseUrl}/${collectionPath}/${docId}`;
  const fields = toFirestoreFields(data);

  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firestore seed failed for ${collectionPath}/${docId}: ${res.status} ${text}`);
  }
}

/** Delete a document from the Firestore emulator */
export async function deleteFirestoreDoc(
  collectionPath: string,
  docId: string,
): Promise<void> {
  const url = `${firestoreBaseUrl}/${collectionPath}/${docId}`;
  await fetch(url, { method: "DELETE" });
}

/** Clear all emulator data */
export async function clearEmulatorData(): Promise<void> {
  const url = `http://${EMULATOR_FIRESTORE_URL}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
  await fetch(url, { method: "DELETE" });
}

// ── Firestore field conversion ──────────────────────────────────

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { arrayValue: { values: FirestoreValue[] } }
  | { mapValue: { fields: Record<string, FirestoreValue> } };

function toFirestoreValue(val: unknown): FirestoreValue {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "string") return { stringValue: val };
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === "object") {
    return { mapValue: { fields: toFirestoreFields(val as Record<string, unknown>) } };
  }
  return { stringValue: String(val) };
}

function toFirestoreFields(obj: Record<string, unknown>): Record<string, FirestoreValue> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [key, val] of Object.entries(obj)) {
    fields[key] = toFirestoreValue(val);
  }
  return fields;
}

export { BASE_URL };

