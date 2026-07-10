import { createHash } from "crypto";

/**
 * Hash telefonnummer for bruk som customerId i ratings.
 */
export function hashPhone(phone: string): string {
  return createHash("sha256").update(phone).digest("hex").slice(0, 16);
}

/**
 * Formater minutter til "Xh Ym" streng.
 */
export function formatFlightTime(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}t ${m}min` : `${h}t`;
}

/**
 * Generer en tilfeldig token for tilbudslenker.
 */
export function generateToken(): string {
  return crypto.randomUUID();
}

