import type { GeoPoint, Drop, FlightEstimate } from "@/types";
import {
  haversineMeters,
  computeFlightTime,
  TURNAROUND_MIN_PER_HIV,
} from "@/lib/flightTime";

/**
 * Compute flight estimate for a single drop relative to a pickup.
 * Delegates core math to flightTime.ts.
 *
 * Each hiv is a round trip (out with the load, back empty to pick up the
 * next one), plus ground turnaround time to hook/unhook the load. Total
 * flight time for the drop is that per-hiv cycle time × number of hiv.
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
  const hiveCount = Math.max(1, drop.hpieces);
  const totalWeightKg = drop.loadItems.reduce(
    (sum, item) => sum + item.count * item.weightKg,
    0,
  );
  const weightPerHivKg = totalWeightKg / hiveCount;

  const { slopeDegrees, speedKnots, timeSeconds } = computeFlightTime(
    horizontalDistance,
    pickup.elevation,
    drop.elevation,
    weightPerHivKg,
  );
  const distanceKm = horizontalDistance / 1000;
  const oneWayMin = timeSeconds / 60;
  const roundTripMinPerHiv = oneWayMin * 2 + TURNAROUND_MIN_PER_HIV;
  const flightTimeMin = roundTripMinPerHiv * hiveCount;

  return {
    dropIndex,
    distanceKm: Math.round(distanceKm * 100) / 100,
    elevGainM: Math.round(elevGain),
    slopeDeg: Math.round(slopeDegrees * 10) / 10,
    speedKn: Math.round(speedKnots * 10) / 10,
    hiveCount,
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

