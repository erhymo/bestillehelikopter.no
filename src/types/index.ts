/**
 * BestilleHelikopter.no — Firestore Data Model
 *
 * All document types include a `_v` field for future schema migrations.
 * Timestamps use Firebase Timestamp in Firestore docs, ISO strings in API DTOs.
 */

import { Timestamp } from "firebase/firestore";

// ── Schema version ──────────────────────────────────
export const CURRENT_SCHEMA_VERSION = 1;

// ── Enums ───────────────────────────────────────────
export enum JobStatus {
  Open = "open",
  Accepted = "accepted",
  Completed = "completed",
  Closed = "closed",
  Deleted = "deleted",
}

export enum OfferStatus {
  Pending = "pending",
  Sent = "sent",
  Viewed = "viewed",
  Replied = "replied",
  Accepted = "accepted",
  Closed = "closed",
}

// ── Geo ─────────────────────────────────────────────
export interface GeoPoint {
  lat: number;
  lng: number;
  elevation: number;
  address?: string;
}

// ── Transport type (job-level) ───────────────────────
// "sling"     = underhengende last (hiv), terreng-sensitiv arbeidsfart
// "passenger" = persontransport i kabin, fast cruisefart
export type TransportType = "sling" | "passenger";

// ── Load item (per drop) ─────────────────────────────
export interface LoadItem {
  count: number; // antall kolli / enheter
  weightKg: number; // vekt i kg
  type: string; // f.eks. "betong", "stål", "verktøy"
}

export interface Drop extends GeoPoint {
  hpieces: number; // antall hiv (helikopter-løft) — kun relevant ved transportType "sling"
  loadItems: LoadItem[]; // kun relevant ved transportType "sling"
  passengers: number; // antall personer — kun relevant ved transportType "passenger"
}

// ── Flight estimate ─────────────────────────────────
export interface FlightEstimate {
  dropIndex: number;
  distanceKm: number;
  elevGainM: number;
  slopeDeg: number;
  speedKn: number;
  /** Number of hiv (round trips) this drop requires. Always 1 for passenger transport. */
  hiveCount: number;
  /** Number of passengers on this leg. Only set for transportType "passenger". */
  passengers?: number;
  flightTimeMin: number;
}

// ── Customer (embedded in Job) ──────────────────────
export interface Customer {
  name: string;
  company?: string; // firmanavn (valgfritt)
  email: string;
  phone: string; // +47XXXXXXXX, OTP-verified
  invoiceAddress: string; // fakturaadresse
  orgnr?: string; // organisasjonsnummer (valgfritt)
  firebaseUid?: string; // anonymous auth uid from phone verification
}

// ── Job ─────────────────────────────────────────────
export interface Job {
  _v: number;
  id?: string;
  status: JobStatus;
  customer: Customer;
  pickup: GeoPoint;
  drops: Drop[];
  transportType: TransportType;
  desiredDate: string; // ISO date string (YYYY-MM-DD) eller ""
  flexibleDate: boolean; // "Fleksibel på dato"
  notes: string; // fritekst-kommentarer fra kunden
  companyId: string; // fast mottaker (kunden velger ikke selv)
  imageRefs: string[]; // Storage paths, max 5
  estimates: FlightEstimate[];
  totalFlightTimeMin: number;
  pdfRef: string | null;
  acceptedCompanyId: string | null;
  acceptedAt: Timestamp | null;
  confirmedDate: string | null; // ISO date (YYYY-MM-DD) — avtalt med kunden, satt av selskapet
  confirmedTime: string | null; // HH:mm — avtalt oppmøtetidspunkt
  confirmedAt: Timestamp | null; // sist registrert/endret
  createdAt: Timestamp;
  expiresAt: Timestamp; // createdAt + 3 months
}

// ── Offer add-on (tilleggskostnad) ───────────────────
export interface OfferAddon {
  key: string;
  label: string;
  price: number;
}

// ── Offer (subcollection: jobs/{jobId}/offers/{offerId}) ──
export interface Offer {
  _v: number;
  id?: string;
  companyId: string;
  token: string; // HMAC-signed, used in /c/[token]/offer
  tokenExpiresAt: Timestamp; // sentAt + 14 days
  price: number | null; // flytidskostnad NOK — systemberegnet: hourlyRate × jobbens flytid
  hourlyRate: number | null; // timepris NOK/time, fylt inn av selskapet
  addons: OfferAddon[]; // tilleggskostnader (kun "Tilflygning/oppmøte")
  totalPrice: number | null; // endelig totalpris vist til kunden — kan overstyres fritt i steg 2
  comment: string | null;
  attachmentRef: string | null; // Storage path for company's PDF
  status: OfferStatus;
  emailOpens: number;
  linkClicks: number;
  sentAt: Timestamp;
  viewedAt: Timestamp | null;
  repliedAt: Timestamp | null;
}

// ── Company ─────────────────────────────────────────
// Kun ett fast selskap (Airlift) i denne fasen — ikke lenger en liste
// kunden velger fra. Feltsettet er derfor holdt minimalt.
export interface Company {
  _v: number;
  id?: string;
  name: string;
  email: string; // eneste felt admin kan redigere
  createdAt: Timestamp;
}

// ── Stats (per month: stats/2026-03) ────────────────
export interface MonthlyStats {
  _v: number;
  rfqCount: number;
  offersSent: number;
  acceptedCount: number;
  avgResponseTimeH: number;
}

// ── Event tracking (stats/{yearMonth}/events/{eventId}) ──
export interface TrackingEvent {
  _v: number;
  type: "rfq_created" | "offer_sent" | "offer_viewed" | "offer_replied" | "offer_accepted" | "job_completed";
  jobId: string;
  companyId?: string;
  offerId?: string;
  timestamp: Timestamp;
  metadata?: Record<string, string | number | boolean>;
}

// ── First-party analytics ────────────────────────────
export type AnalyticsPageName =
  | "customer_form"        // /
  | "company_offer"        // /c/[token]/offer
  | "company_register"     // /c/[token]/register
  | "customer_accept"      // /a/[token]/accept
  | "admin";               // /admin/*

export type FunnelStep =
  | "form_start"           // user interacted with form
  | "pickup_set"           // pickup location chosen
  | "drops_added"          // at least one drop added
  | "customer_info_filled" // name/email/phone filled
  | "rfq_submitted"        // form submitted successfully
  | "offer_viewed"         // company viewed the offer page
  | "offer_replied"        // company submitted an offer
  | "accept_viewed"        // customer viewed accept page
  | "accept_confirmed";    // customer confirmed acceptance

export interface AnalyticsEvent {
  /** "pv" = page view, "fn" = funnel event */
  t: "pv" | "fn";
  /** Page name (for pv) or funnel step (for fn) */
  n: AnalyticsPageName | FunnelStep;
  /** Client-generated session ID (random, no PII) */
  sid: string;
  /** ISO timestamp from client */
  ts: string;
  /** Optional referrer (first page view only) */
  ref?: string;
  /** Optional metadata */
  meta?: Record<string, string | number | boolean>;
}

/** Daily aggregated analytics doc: analytics_daily/{YYYY-MM-DD} */
export interface DailyAnalytics {
  _v: number;
  date: string; // YYYY-MM-DD
  pageViews: Record<AnalyticsPageName, number>;
  funnelSteps: Record<FunnelStep, number>;
  uniqueSessions: number;
  updatedAt: Timestamp;
}

/** Monthly rollup: analytics_monthly/{YYYY-MM} */
export interface MonthlyAnalytics {
  _v: number;
  month: string; // YYYY-MM
  pageViews: Record<AnalyticsPageName, number>;
  funnelSteps: Record<FunnelStep, number>;
  uniqueSessions: number;
  updatedAt: Timestamp;
}

// ── Admin config (admin/config) ─────────────────────
export interface AdminConfig {
  allowedAdmins: string[]; // Firebase UIDs
}

// ═══════════════════════════════════════════════════════
// API DTOs (serialized — Timestamp → ISO string)
// ═══════════════════════════════════════════════════════

type TimestampToString<T> = {
  [K in keyof T]: T[K] extends Timestamp
    ? string
    : T[K] extends Timestamp | null
      ? string | null
      : T[K] extends object
        ? TimestampToString<T[K]>
        : T[K];
};

export type JobDTO = TimestampToString<Omit<Job, "_v">> & { id: string };
export type OfferDTO = TimestampToString<Omit<Offer, "_v">> & { id: string };
export type CompanyDTO = TimestampToString<Omit<Company, "_v">> & { id: string };

// ── Create RFQ input (what the customer sends) ──────
export interface CreateRfqInput {
  customer: {
    name: string;
    company?: string;
    email: string;
    phone: string;
    invoiceAddress: string;
    orgnr?: string;
  };
  pickup: Omit<GeoPoint, "elevation">; // elevation fetched server-side
  drops: Array<Omit<Drop, "elevation">>; // elevation fetched server-side
  transportType: TransportType;
  desiredDate: string;
  flexibleDate: boolean;
  notes: string;
  imageRefs: string[]; // already uploaded Storage paths
}

// ── Offer reply input (what the company sends) ──────
export interface OfferReplyInput {
  token: string;
  hourlyRate: number; // timepris NOK/time — systemet beregner price = hourlyRate × jobbens flytid
  addons?: OfferAddon[]; // tilleggskostnader
  comment?: string;
  // attachmentRef set server-side after upload
}

// ── Accept offer input (customer action) ────────────
export interface AcceptOfferInput {
  jobId: string;
  offerId: string;
  customerPhone: string; // must match job.customer.phone
}

// ═══════════════════════════════════════════════════════
// Type Guards
// ═══════════════════════════════════════════════════════

export function isJobStatus(value: unknown): value is JobStatus {
  return Object.values(JobStatus).includes(value as JobStatus);
}

export function isOfferStatus(value: unknown): value is OfferStatus {
  return Object.values(OfferStatus).includes(value as OfferStatus);
}

export function isValidDrop(value: unknown): value is Drop {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.lat === "number" &&
    typeof v.lng === "number" &&
    typeof v.elevation === "number" &&
    (v.address === undefined || typeof v.address === "string") &&
    typeof v.hpieces === "number" &&
    v.hpieces > 0 &&
    Number.isInteger(v.hpieces)
  );
}

export function isGeoPoint(value: unknown): value is GeoPoint {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.lat === "number" &&
    typeof v.lng === "number" &&
    typeof v.elevation === "number" &&
    (v.address === undefined || typeof v.address === "string")
  );
}
