/**
 * BestilleHelikopter.no — Pure flight-time estimation module
 *
 * Takes raw horizontal distance (meters) and elevation gain (meters)
 * and computes slope, speed, and flight time. No geo/Firestore dependencies.
 *
 * Algorithm (calibrated to match Vortix's proven model):
 *   1. elevGain = max(0, dropElev - pickupElev)   (negative slope → 0 → 80kn)
 *   2. gradient = elevGain × 1852 / horizontalDistanceM   (meters of climb per nautical mile)
 *   3. speedKn interpolates linearly 80kn → 40kn between gradient 50 → 300 m/nm,
 *      clamped outside that range (NOT degrees — a plain angle cap badly
 *      underestimates how much typical Norwegian mountain terrain slows a
 *      sling-load leg down; this m/nm gradient matches Vortix's calibration)
 *   4. timeSeconds = (horizontalDistanceM / 1000) / (speedKn × 1.852) × 3600
 */

// ── Constants ─────────────────────────────────────────────────

const KNOTS_MAX = 80;
const KNOTS_MIN = 40;
const KN_TO_KMH = 1.852;
const NM_TO_M = 1852;

// ── Terrain gradient → speed ─────────────────────────────────
// Gradient in meters of climb per nautical mile of horizontal distance.
// Below G_LOW: flat enough for max speed. Above G_HIGH: steep enough that
// minimum speed is already required. Linear interpolation in between.
const G_LOW_M_PER_NM = 50;
const G_HIGH_M_PER_NM = 300;

function computeWorkSpeedKnots(gradientMPerNm: number): number {
  if (gradientMPerNm <= G_LOW_M_PER_NM) return KNOTS_MAX;
  if (gradientMPerNm >= G_HIGH_M_PER_NM) return KNOTS_MIN;
  const t = (gradientMPerNm - G_LOW_M_PER_NM) / (G_HIGH_M_PER_NM - G_LOW_M_PER_NM);
  return KNOTS_MAX + t * (KNOTS_MIN - KNOTS_MAX);
}

// ── Load weight → speed cap ──────────────────────────────────
// Heavier sling loads require slower, more careful flight. Brackets are
// deliberately simple defaults (kg thresholds → knot caps) — tune as needed.
const WEIGHT_CAP_LIGHT_KG = 500;
const WEIGHT_CAP_MEDIUM_KG = 1000;
const SPEED_CAP_LIGHT_KN = 80;
const SPEED_CAP_MEDIUM_KN = 60;
const SPEED_CAP_HEAVY_KN = 40;

/**
 * Maximum safe speed (knots) for a given sling-load weight.
 */
export function getWeightSpeedCapKnots(weightKg: number): number {
  if (weightKg <= WEIGHT_CAP_LIGHT_KG) return SPEED_CAP_LIGHT_KN;
  if (weightKg <= WEIGHT_CAP_MEDIUM_KG) return SPEED_CAP_MEDIUM_KN;
  return SPEED_CAP_HEAVY_KN;
}

/**
 * Minutes spent per hiv hooking/unhooking the load on the ground
 * (not flight time, but part of the cycle time for each lift).
 */
export const TURNAROUND_MIN_PER_HIV = 2;

// ── Result type ───────────────────────────────────────────────

export interface FlightTimeResult {
  /** Slope in degrees, informational only (speed is derived from gradient, not this). 0 for negative/zero elevation gain. */
  slopeDegrees: number;
  /** Interpolated speed in knots (40–80). */
  speedKnots: number;
  /** Estimated flight time in seconds. */
  timeSeconds: number;
}

// ── Haversine ─────────────────────────────────────────────────

/**
 * Haversine distance in meters between two lat/lng points.
 */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      sinLng *
      sinLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// ── Core computation ──────────────────────────────────────────

/**
 * Compute flight time from raw horizontal distance and elevation values.
 *
 * @param horizontalDistanceM - Horizontal distance in meters (≥ 0)
 * @param pickupElevation     - Pickup point elevation in meters (can be undefined → treated as 0)
 * @param dropElevation       - Drop point elevation in meters (can be undefined → treated as 0)
 * @param loadWeightKg        - Weight of the load being carried this leg, if any (caps speed further)
 * @returns FlightTimeResult with slope, speed, and time
 */
export function computeFlightTime(
  horizontalDistanceM: number,
  pickupElevation?: number,
  dropElevation?: number,
  loadWeightKg?: number,
): FlightTimeResult {
  // Guard: zero or negative distance → instant
  if (horizontalDistanceM <= 0) {
    return { slopeDegrees: 0, speedKnots: KNOTS_MAX, timeSeconds: 0 };
  }

  const elevGain = Math.max(0, (dropElevation ?? 0) - (pickupElevation ?? 0));
  const slopeDegrees = Math.atan(elevGain / horizontalDistanceM) * (180 / Math.PI);
  const gradientMPerNm = (elevGain * NM_TO_M) / horizontalDistanceM;

  let speedKnots = computeWorkSpeedKnots(gradientMPerNm);

  if (loadWeightKg !== undefined && loadWeightKg > 0) {
    speedKnots = Math.min(speedKnots, getWeightSpeedCapKnots(loadWeightKg));
  }

  const speedKmh = speedKnots * KN_TO_KMH;
  const distanceKm = horizontalDistanceM / 1000;
  const timeSeconds = (distanceKm / speedKmh) * 3600;

  return { slopeDegrees, speedKnots, timeSeconds };
}

// ── Convenience: from lat/lng points ──────────────────────────

/**
 * Compute flight time between two geographic points.
 * Computes haversine distance internally.
 */
export function computeFlightTimeBetweenPoints(
  pickup: { lat: number; lng: number; elevation?: number },
  drop: { lat: number; lng: number; elevation?: number },
): FlightTimeResult {
  const horizontalDistanceM = haversineMeters(
    pickup.lat,
    pickup.lng,
    drop.lat,
    drop.lng,
  );
  return computeFlightTime(
    horizontalDistanceM,
    pickup.elevation,
    drop.elevation,
  );
}

