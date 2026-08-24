import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_SESSION_COOKIE = "admin_session";
const SESSION_VALIDITY_DAYS = 7;
export const ADMIN_SESSION_MAX_AGE_SECONDS = SESSION_VALIDITY_DAYS * 24 * 60 * 60;

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET environment variable is not set");
  }
  return secret;
}

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

function sign(payload: string): string {
  return base64urlEncode(
    createHmac("sha256", getSecret()).update(payload).digest("base64"),
  );
}

/** Constant-time string compare — avoids leaking match length/position via timing. */
function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Still do a compare of equal-length buffers so the elapsed time
    // doesn't reveal that the lengths differed.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/** Check submitted username/password against the configured admin credentials. */
export function verifyAdminCredentials(username: string, password: string): boolean {
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPass = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPass) return false;
  return timingSafeCompare(username, expectedUser) && timingSafeCompare(password, expectedPass);
}

/** Mint a signed, expiring session token to store in the admin_session cookie. */
export function mintAdminSession(): string {
  const payload = JSON.stringify({
    exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE_SECONDS,
  });
  const payloadStr = base64urlEncode(payload);
  return `${payloadStr}.${sign(payloadStr)}`;
}

/** Verify a session token from the admin_session cookie. */
export function verifyAdminSession(token: string | undefined | null): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [payloadStr, sig] = parts;
  const expected = sign(payloadStr);
  if (expected.length !== sig.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
    return false;
  }

  try {
    const payload = JSON.parse(base64urlDecode(payloadStr)) as { exp: number };
    return payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}
