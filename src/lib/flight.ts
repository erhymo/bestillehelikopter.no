import type { GeoPoint, Drop, FlightEstimate } from "@/types";
import { haversineMeters, computeFlightTime } from "@/lib/flightTime";

/**
 * Compute flight estimate for a single drop relative to a pickup.
 * Delegates core math to flightTime.ts.
 */
export function estimateDrop(
  pickup: GeoPoint,
  drop: Drop,
  dropIndex: number,
): FlightEstimate {
  const horizontalDistance = haversineMeters(
    pickup.lat,
    pickup.lng,
    drop.lat,
    drop.lng,
  );
  const elevGain = Math.max(0, drop.elevation - pickup.elevation);
  const { slopeDegrees, speedKnots, timeSeconds } = computeFlightTime(
    horizontalDistance,
    pickup.elevation,
    drop.elevation,
  );
  const distanceKm = horizontalDistance / 1000;
  const flightTimeMin = timeSeconds / 60;

  return {
    dropIndex,
    distanceKm: Math.round(distanceKm * 100) / 100,
    elevGainM: Math.round(elevGain),
    slopeDeg: Math.round(slopeDegrees * 10) / 10,
    speedKn: Math.round(speedKnots * 10) / 10,
    flightTimeMin: Math.round(flightTimeMin * 10) / 10,
  };
}

/**
 * Compute estimates for all drops and return array + total.
 */
export function estimateAll(
  pickup: GeoPoint,
  drops: Drop[],
): { estimates: FlightEstimate[]; totalFlightTimeMin: number } {
  const estimates = drops.map((drop, i) => estimateDrop(pickup, drop, i));
  const totalFlightTimeMin =
    Math.round(
      estimates.reduce((sum, e) => sum + e.flightTimeMin, 0) * 10,
    ) / 10;
  return { estimates, totalFlightTimeMin };
}

