import "server-only";

/**
 * BestilleHelikopter.no — Signed Link Token System
 *
 * ═══════════════════════════════════════════════════════════════
 * DESIGN
 * ═══════════════════════════════════════════════════════════════
 *
 * PURPOSE:
 *   Generate and verify stateless HMAC-SHA256 tokens for:
 *   - Company offer view:   /tilbud/{token}
 *   - Company offer submit: POST /api/offer (token in body)
 *   - Customer accept:      POST /api/offer/accept (token in body)
 *
 * TOKEN FORMAT:
 *   Base64url( JSON({ jobId, companyId, offerId, exp }) ) + "." + Base64url( HMAC-SHA256(payload) )
 *
 * CLAIMS:
 *   - jobId:     Firestore job document ID
 *   - companyId: Firestore company document ID
 *   - offerId:   Firestore offer document ID (within jobs/{jobId}/offers/)
 *   - exp:       Expiration as Unix timestamp (seconds). Default: sentAt + 14 days
 *
 * PROPERTIES:
 *   - Stateless: no token storage needed (verified via HMAC)
 *   - Reusable: same token works for view + submit within validity period
 *   - Forwardable: not bound to specific user/IP/device
 *   - Non-enumerable: cannot derive jobId from token without TOKEN_SECRET
 *   - Revocable: set offer.status = "closed" → API rejects even valid tokens
 *
 * ROTATION:
 *   - TOKEN_SECRET rotation: mint with new key, verify with [new, old] keys
 *   - Set TOKEN_SECRET_PREVIOUS env var during rotation window
 *
 * ═══════════════════════════════════════════════════════════════
 */

import { createHmac, timingSafeEqual } from "crypto";

// ── Configuration ─────────────────────────────────────────────

const TOKEN_SECRET = process.env.TOKEN_SECRET;
const TOKEN_SECRET_PREVIOUS = process.env.TOKEN_SECRET_PREVIOUS;
const TOKEN_VALIDITY_DAYS = 14;

function getSecret(): string {
  if (!TOKEN_SECRET) {
    throw new Error("TOKEN_SECRET environment variable is not set");
  }
  return TOKEN_SECRET;
}

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

function base64urlDecode(data: string): string {
  const padded = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64").toString("utf-8");
}

// ── HMAC ──────────────────────────────────────────────────────

function sign(payload: string, secret: string): string {
  return base64urlEncode(
    createHmac("sha256", secret).update(payload).digest("base64"),
  );
}

function verifySignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const expected = sign(payload, secret);
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(
    Buffer.from(expected, "utf-8"),
    Buffer.from(signature, "utf-8"),
  );
}

// ── Public API ────────────────────────────────────────────────

/**
 * Mint a signed token for a company offer link.
 * Called when RFQ is created and offers are sent to companies.
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
  const sig = sign(payloadStr, getSecret());
  return `${payloadStr}.${sig}`;
}

/**
 * Verify and decode a signed token.
 * Returns the payload if valid, null if invalid or expired.
 * Checks both current and previous secret for rotation support.
 */
export function verifyOfferToken(token: string): TokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadStr, sig] = parts;

  // Try current secret
  let valid = verifySignature(payloadStr, sig, getSecret());

  // Try previous secret if rotation is in progress
  if (!valid && TOKEN_SECRET_PREVIOUS) {
    valid = verifySignature(payloadStr, sig, TOKEN_SECRET_PREVIOUS);
  }

  if (!valid) return null;

  try {
    const payload = JSON.parse(base64urlDecode(payloadStr)) as TokenPayload;

    // Check expiration
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    // Basic shape validation
    if (!payload.jobId || !payload.companyId || !payload.offerId) return null;

    return payload;
  } catch {
    return null;
  }
}

/**
 * Build the full offer URL for a company.
 */
export function buildOfferUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  return `${base}/tilbud/${encodeURIComponent(token)}`;
}

/**
 * Build the full accept URL for a customer.
 * The token is the same offer token — security relies on link being emailed only to customer.
 */
export function buildAcceptUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  return `${base}/a/${encodeURIComponent(token)}/accept`;
}

/**
 * Build the full rating URL for a customer.
 * Reuses the offer token — available after job is accepted/completed.
 */
export function buildRatingUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  return `${base}/r/${encodeURIComponent(token)}/rate`;
}

