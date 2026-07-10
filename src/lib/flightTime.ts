/**
 * BestilleHelikopter.no — Pure flight-time estimation module
 *
 * Takes raw horizontal distance (meters) and elevation gain (meters)
 * and computes slope, speed, and flight time. No geo/Firestore dependencies.
 *
 * Algorithm:
 *   1. elevGain = max(0, dropElev - pickupElev)   (negative slope → 0 → 80kn)
 *   2. slopeDeg = atan(elevGain / horizontalDistanceM) × 180/π
 *   3. slopeDeg capped at 45°
 *   4. speedKn  = 80 − (80 − 40) × (slopeDeg / 45), floor 40kn
 *   5. timeSeconds = (horizontalDistanceM / 1000) / (speedKn × 1.852) × 3600
 */

// ── Constants ─────────────────────────────────────────────────

const KNOTS_MAX = 80;
const KNOTS_MIN = 40;
const MAX_SLOPE_DEG = 45;
const KN_TO_KMH = 1.852;

// ── Result type ───────────────────────────────────────────────

export interface FlightTimeResult {
  /** Slope in degrees (0–45, capped). 0 for negative/zero elevation gain. */
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
 * @returns FlightTimeResult with slope, speed, and time
 */
export function computeFlightTime(
  horizontalDistanceM: number,
  pickupElevation?: number,
  dropElevation?: number,
): FlightTimeResult {
  // Guard: zero or negative distance → instant
  if (horizontalDistanceM <= 0) {
    return { slopeDegrees: 0, speedKnots: KNOTS_MAX, timeSeconds: 0 };
  }

  const elevGain = Math.max(0, (dropElevation ?? 0) - (pickupElevation ?? 0));

  let slopeDegrees: number;
  let speedKnots: number;

  if (elevGain === 0) {
    // Flat or downhill → max speed
    slopeDegrees = 0;
    speedKnots = KNOTS_MAX;
  } else {
    slopeDegrees = Math.atan(elevGain / horizontalDistanceM) * (180 / Math.PI);
    slopeDegrees = Math.min(slopeDegrees, MAX_SLOPE_DEG);
    speedKnots =
      KNOTS_MAX - ((KNOTS_MAX - KNOTS_MIN) * slopeDegrees) / MAX_SLOPE_DEG;
    speedKnots = Math.max(speedKnots, KNOTS_MIN);
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

