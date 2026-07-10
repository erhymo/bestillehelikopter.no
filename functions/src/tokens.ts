/**
 * Token helpers for Cloud Functions (mirror of src/lib/tokens.ts).
 * Only includes mint + buildUrl — verification happens in Next.js API routes.
 */

import { createHmac } from "crypto";
import { defineString } from "firebase-functions/params";

// ── Configuration ─────────────────────────────────────────────

const tokenSecret = defineString("TOKEN_SECRET");
const baseUrl = defineString("NEXT_PUBLIC_BASE_URL", {
  default: "http://localhost:3000",
});

const TOKEN_VALIDITY_DAYS = 14;

// ── Token payload type ────────────────────────────────────────

export interface TokenPayload {
  jobId: string;
  companyId: string;
  offerId: string;
  exp: number; // Unix timestamp (seconds)
}

// ── Base64url helpers ─────────────────────────────────────────

function base64urlEncode(data: string): string {
  return Buffer.from(data, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ── HMAC ──────────────────────────────────────────────────────

function sign(payload: string, secret: string): string {
  return base64urlEncode(
    createHmac("sha256", secret).update(payload).digest("base64"),
  );
}

// ── Public API ────────────────────────────────────────────────

/**
 * Mint a signed token for a company offer link.
 */
export function mintOfferToken(
  jobId: string,
  companyId: string,
  offerId: string,
  validityDays: number = TOKEN_VALIDITY_DAYS,
): string {
  const payload: TokenPayload = {
    jobId,
    companyId,
    offerId,
    exp: Math.floor(Date.now() / 1000) + validityDays * 24 * 60 * 60,
  };

  const payloadStr = base64urlEncode(JSON.stringify(payload));
  const sig = sign(payloadStr, tokenSecret.value());
  return `${payloadStr}.${sig}`;
}

/**
 * Get the token expiration timestamp (seconds since epoch).
 */
export function getTokenExpiration(
  validityDays: number = TOKEN_VALIDITY_DAYS,
): number {
  return Math.floor(Date.now() / 1000) + validityDays * 24 * 60 * 60;
}

/**
 * Build the full offer URL for a company.
 */
export function buildOfferUrl(token: string): string {
  return `${baseUrl.value()}/tilbud/${encodeURIComponent(token)}`;
}

/**
 * Build the full accept URL for a customer.
 */
export function buildAcceptUrl(token: string): string {
  return `${baseUrl.value()}/a/${encodeURIComponent(token)}/accept`;
}

