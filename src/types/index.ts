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

export enum RatingScore {
  Terrible = 1,
  Poor = 2,
  Ok = 3,
  Good = 4,
  Excellent = 5,
}

// ── Geo ─────────────────────────────────────────────
export interface GeoPoint {
  lat: number;
  lng: number;
  elevation: number;
  address?: string;
}

// ── Load item (per drop) ─────────────────────────────
export interface LoadItem {
  count: number; // antall kolli / enheter
  weightKg: number; // vekt i kg
  type: string; // f.eks. "betong", "stål", "verktøy"
}

export interface Drop extends GeoPoint {
  hpieces: number; // antall hiv (helikopter-løft)
  loadItems: LoadItem[];
}

// ── Flight estimate ─────────────────────────────────
export interface FlightEstimate {
  dropIndex: number;
  distanceKm: number;
  elevGainM: number;
  slopeDeg: number;
  speedKn: number;
  /** Number of hiv (round trips) this drop requires. */
  hiveCount: number;
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
  nettbruk: boolean;
  over15m: boolean; // last over 15 meter lengde
  desiredDate: string; // ISO date string (YYYY-MM-DD) eller ""
  flexibleDate: boolean; // "Fleksibel på dato"
  notes: string; // fritekst-kommentarer fra kunden
  selectedCompanyIds: string[]; // hvilke selskaper kunden vil sende forespørsel til
  imageRefs: string[]; // Storage paths, max 5
  estimates: FlightEstimate[];
  totalFlightTimeMin: number;
  pdfRef: string | null;
  acceptedCompanyId: string | null;
  acceptedAt: Timestamp | null;
  createdAt: Timestamp;
  expiresAt: Timestamp; // createdAt + 6 months
}

// ── Offer (subcollection: jobs/{jobId}/offers/{offerId}) ──
export interface Offer {
  _v: number;
  id?: string;
  companyId: string;
  token: string; // HMAC-signed, used in /tilbud/{token}
  tokenExpiresAt: Timestamp; // sentAt + 14 days
  price: number | null; // totalpris NOK, filled by company
  hourlyRate: number | null; // timepris overflygning NOK/time
  hivRate: number | null; // timepris med hiv NOK/time
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
export interface Company {
  _v: number;
  id?: string;
  name: string;
  email: string;
  phone: string;
  region: string[]; // e.g. ["nordland", "troms"]
  disabled: boolean;
  avgRating: number; // denormalized
  ratingCount: number; // denormalized
  createdAt: Timestamp;
}

// ── Rating ──────────────────────────────────────────
export interface Rating {
  _v: number;
  id?: string;
  jobId: string;
  companyId: string;
  customerId: string; // sha256(phone).slice(0,16)
  score: RatingScore;
  comment: string;
  approved: boolean; // 3-5 auto true; 1-2 requires admin
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
  type: "rfq_created" | "offer_sent" | "offer_viewed" | "offer_replied" | "offer_accepted" | "job_completed" | "rating_submitted";
  jobId: string;
  companyId?: string;
  offerId?: string;
  timestamp: Timestamp;
  metadata?: Record<string, string | number | boolean>;
}

// ── First-party analytics ────────────────────────────
export type AnalyticsPageName =
  | "customer_form"        // /
  | "company_map"          // /c/[token]/map
  | "company_offer"        // /c/[token]/offer
  | "customer_accept"      // /a/[token]/accept
  | "customer_rating"      // /r/[token]/rate
  | "company_public"       // /selskap/[id]
  | "admin";               // /admin/*

export type FunnelStep =
  | "form_start"           // user interacted with form
  | "pickup_set"           // pickup location chosen
  | "drops_added"          // at least one drop added
  | "companies_selected"   // companies chosen
  | "customer_info_filled" // name/email/phone filled
  | "rfq_submitted"        // form submitted successfully
  | "offer_viewed"         // company viewed the offer page
  | "offer_replied"        // company submitted an offer
  | "accept_viewed"        // customer viewed accept page
  | "accept_confirmed"     // customer confirmed acceptance
  | "rating_viewed"        // customer viewed rating page
  | "rating_submitted";    // customer submitted rating

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
export type RatingDTO = TimestampToString<Omit<Rating, "_v">> & { id: string };

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
  nettbruk: boolean;
  over15m: boolean;
  desiredDate: string;
  flexibleDate: boolean;
  notes: string;
  selectedCompanyIds: string[];
  imageRefs: string[]; // already uploaded Storage paths
}

// ── Offer reply input (what the company sends) ──────
export interface OfferReplyInput {
  token: string;
  price: number; // totalpris NOK
  hourlyRate?: number; // timepris overflygning NOK/time
  hivRate?: number; // timepris med hiv NOK/time
  comment?: string;
  // attachmentRef set server-side after upload
}

// ── Accept offer input (customer action) ────────────
export interface AcceptOfferInput {
  jobId: string;
  offerId: string;
  customerPhone: string; // must match job.customer.phone
}

// ── Rating input ────────────────────────────────────
export interface CreateRatingInput {
  jobId: string;
  companyId: string;
  score: RatingScore;
  comment: string;
  customerPhone: string;
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

export function isRatingScore(value: unknown): value is RatingScore {
  return typeof value === "number" && value >= 1 && value <= 5 && Number.isInteger(value);
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

