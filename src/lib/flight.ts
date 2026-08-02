import type { GeoPoint, Drop, FlightEstimate, TransportType } from "@/types";
import {
  haversineMeters,
  computeFlightTime,
  computeCruiseFlightTime,
  TURNAROUND_MIN_PER_HIV,
} from "@/lib/flightTime";

/**
 * Compute flight estimate for a single drop relative to a pickup.
 * Delegates core math to flightTime.ts.
 *
 * Sling load ("sling"): each hiv is a round trip (out with the load, back
 * empty to pick up the next one), plus ground turnaround time to hook/unhook
 * the load. Total flight time for the drop is that per-hiv cycle time ×
 * number of hiv.
 *
 * Passenger transport ("passenger"): a single one-way leg at fixed cruise
 * speed — no repeated round trips, no terrain- or weight-based slowdown.
 */
export function estimateDrop(
  pickup: GeoPoint,
  drop: Drop,
  dropIndex: number,
  transportType: TransportType = "sling",
): FlightEstimate {
  const horizontalDistance = haversineMeters(
    pickup.lat,
    pickup.lng,
    drop.lat,
    drop.lng,
  );
  const elevGain = Math.max(0, drop.elevation - pickup.elevation);

  if (transportType === "passenger") {
    const { slopeDegrees, speedKnots, timeSeconds } = computeCruiseFlightTime(
      horizontalDistance,
    );
    const distanceKm = horizontalDistance / 1000;
    const oneWayMin = timeSeconds / 60;

    return {
      dropIndex,
      distanceKm: Math.round(distanceKm * 100) / 100,
      elevGainM: Math.round(elevGain),
      slopeDeg: Math.round(slopeDegrees * 10) / 10,
      speedKn: Math.round(speedKnots * 10) / 10,
      hiveCount: 1,
      passengers: Math.max(1, drop.passengers),
      flightTimeMin: Math.ceil(oneWayMin),
    };
  }

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
    // Round up, never down — an optimistic estimate is worse than a
    // slightly conservative one for something companies price against.
    flightTimeMin: Math.ceil(flightTimeMin),
  };
}

/**
 * Compute estimates for all drops and return array + total.
 */
export function estimateAll(
  pickup: GeoPoint,
  drops: Drop[],
  transportType: TransportType = "sling",
): { estimates: FlightEstimate[]; totalFlightTimeMin: number } {
  const estimates = drops.map((drop, i) => estimateDrop(pickup, drop, i, transportType));
  // Each estimate is already a whole minute, so the sum is too — this
  // keeps the total matching what the per-row breakdown actually shows.
  const totalFlightTimeMin = estimates.reduce((sum, e) => sum + e.flightTimeMin, 0);
  return { estimates, totalFlightTimeMin };
}

