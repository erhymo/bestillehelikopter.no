/**
 * BestilleHelikopter.no — Google Maps API integration layer (server-only)
 *
 * Provides:
 *   1. fetchElevations()   – Batched Elevation API with in-memory cache
 *   2. buildStaticMapUrl() – Signed Static Maps URL builder (no HTTP call)
 *   3. haversineMeters()   – Re-exported from flightTime.ts for convenience
 *
 * ── Caching strategy ──────────────────────────────────────────────────────
 * Elevation results are cached in two layers:
 *
 * Layer 1 — In-memory Map (this module):
 *   • Key = lat/lng rounded to 5 decimals (~1.1m precision)
 *   • Max 2 000 entries (~enough for one serverless cold start cycle)
 *   • Avoids repeat API calls within a single request / batch
 *
 * Layer 2 — Firestore document cache (future, recommended for prod):
 *   • Collection: `_cache/elevation/{geohash}`
 *   • Write elevation after each API call; read before calling API
 *   • TTL: 90 days (elevation data is stable)
 *   • Reduces Elevation API usage by ~80% for popular Norwegian regions
 *   • NOT implemented here — add when API costs justify it
 * ──────────────────────────────────────────────────────────────────────────
 */

import "server-only";
import { createHmac } from "crypto";

// Re-export haversine so callers can import from a single Google Maps module
export { haversineMeters } from "@/lib/flightTime";

// ── Types ────────────────────────────────────────────────────────────────

export interface ElevationResult {
  lat: number;
  lng: number;
  elevation: number; // meters above sea level
}

export interface StaticMapMarker {
  lat: number;
  lng: number;
  label?: string; // A-Z or 0-9
  color?: string; // e.g. "red", "0x00FF00"
}

export interface StaticMapPath {
  points: { lat: number; lng: number }[];
  color?: string; // e.g. "0x0000FF80"
  weight?: number; // line weight in pixels
}

export interface StaticMapOptions {
  width?: number; // default 600
  height?: number; // default 400
  zoom?: number; // omit for auto-fit
  mapType?: "roadmap" | "satellite" | "terrain" | "hybrid";
  markers?: StaticMapMarker[];
  paths?: StaticMapPath[];
}

// ── In-memory elevation cache ────────────────────────────────────────────

const CACHE_MAX = 2_000;
const elevationCache = new Map<string, number>();

/** Round to 5 decimals (~1.1m) for cache key stability. */
function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

function evictIfNeeded(): void {
  if (elevationCache.size <= CACHE_MAX) return;
  const toDelete = Math.floor(CACHE_MAX * 0.25);
  const keys = elevationCache.keys();
  for (let i = 0; i < toDelete; i++) {
    const next = keys.next();
    if (next.done) break;
    elevationCache.delete(next.value);
  }
}

// ── Elevation API ────────────────────────────────────────────────────────

/**
 * Fetch elevations for a batch of lat/lng points.
 * Uses in-memory cache to avoid redundant API calls.
 * Batches into max 512 points per Elevation API request.
 */
export async function fetchElevations(
  points: { lat: number; lng: number }[],
): Promise<ElevationResult[]> {
  if (points.length === 0) return [];

  const results: ElevationResult[] = new Array(points.length);
  const uncachedIndices: number[] = [];

  // 1. Check cache
  for (let i = 0; i < points.length; i++) {
    const ck = cacheKey(points[i].lat, points[i].lng);
    const cached = elevationCache.get(ck);
    if (cached !== undefined) {
      results[i] = { lat: points[i].lat, lng: points[i].lng, elevation: cached };
    } else {
      uncachedIndices.push(i);
    }
  }

  if (uncachedIndices.length === 0) return results;

  // 2. Fetch uncached from API
  const apiKey = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!apiKey) throw new Error("Missing GOOGLE_MAPS_SERVER_KEY");

  const BATCH_SIZE = 512;
  for (let b = 0; b < uncachedIndices.length; b += BATCH_SIZE) {
    const batch = uncachedIndices.slice(b, b + BATCH_SIZE);
    const locations = batch
      .map((i) => `${points[i].lat},${points[i].lng}`)
      .join("|");

    const url = `https://maps.googleapis.com/maps/api/elevation/json?locations=${encodeURIComponent(locations)}&key=${apiKey}`;
    const res = await fetch(url);
    const data = (await res.json()) as {
      status: string;
      error_message?: string;
      results: { location: { lat: number; lng: number }; elevation: number }[];
    };

    if (data.status !== "OK") {
      throw new Error(
        `Elevation API error: ${data.status} – ${data.error_message ?? ""}`,
      );
    }

    for (let j = 0; j < batch.length; j++) {
      const idx = batch[j];
      const elev = data.results[j].elevation;
      results[idx] = {
        lat: points[idx].lat,
        lng: points[idx].lng,
        elevation: elev,
      };
      elevationCache.set(cacheKey(points[idx].lat, points[idx].lng), elev);
    }
    evictIfNeeded();
  }

  return results;
}

// ── Static Maps URL builder ──────────────────────────────────────────────

/**
 * Sign a Static Maps URL using HMAC-SHA1 (Google's required method).
 * Requires GOOGLE_MAPS_SIGNING_SECRET env var (base64url-encoded).
 *
 * @see https://developers.google.com/maps/documentation/maps-static/digital-signature
 */
function signUrl(unsignedUrl: string): string {
  const secret = process.env.GOOGLE_MAPS_SIGNING_SECRET;
  if (!secret) {
    // In dev/test, return unsigned URL (works with API key alone for low volume)
    return unsignedUrl;
  }

  const url = new URL(unsignedUrl);
  const pathAndQuery = url.pathname + url.search;

  // Google delivers the secret as modified-base64url → convert to standard base64
  const decodedSecret = Buffer.from(
    secret.replace(/-/g, "+").replace(/_/g, "/"),
    "base64",
  );
  const signature = createHmac("sha1", decodedSecret)
    .update(pathAndQuery)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${unsignedUrl}&signature=${signature}`;
}

/**
 * Build a signed Google Static Maps URL.
 * Does NOT make an HTTP request — returns the URL string for embedding in
 * emails, PDFs, or <img> tags.
 */
export function buildStaticMapUrl(options: StaticMapOptions = {}): string {
  const {
    width = 600,
    height = 400,
    zoom,
    mapType = "terrain",
    markers = [],
    paths = [],
  } = options;

  const apiKey = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!apiKey) throw new Error("Missing GOOGLE_MAPS_SERVER_KEY");

  const params = new URLSearchParams();
  params.set("size", `${width}x${height}`);
  params.set("maptype", mapType);
  params.set("key", apiKey);
  params.set("language", "no");
  params.set("region", "NO");

  if (zoom !== undefined) {
    params.set("zoom", String(zoom));
  }

  // Add markers
  for (const m of markers) {
    const styleParts: string[] = [];
    if (m.color) styleParts.push(`color:${m.color}`);
    if (m.label) styleParts.push(`label:${m.label}`);
    const style = styleParts.length > 0 ? styleParts.join("|") + "|" : "";
    params.append("markers", `${style}${m.lat},${m.lng}`);
  }

  // Add paths
  for (const p of paths) {
    const styleParts: string[] = [];
    if (p.color) styleParts.push(`color:${p.color}`);
    if (p.weight) styleParts.push(`weight:${p.weight}`);
    const style = styleParts.length > 0 ? styleParts.join("|") + "|" : "";
    const coords = p.points.map((pt) => `${pt.lat},${pt.lng}`).join("|");
    params.append("path", `${style}${coords}`);
  }

  const unsignedUrl = `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
  return signUrl(unsignedUrl);
}

// ── Cache inspection (for testing) ───────────────────────────────────────

/** @internal — exposed for testing only */
export function _getCacheSize(): number {
  return elevationCache.size;
}

/** @internal — exposed for testing only */
export function _clearCache(): void {
  elevationCache.clear();
}