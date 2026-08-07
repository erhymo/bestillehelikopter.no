import { haversineMeters } from "@/lib/flightTime";
import type { BaseLocation } from "@/types";

export interface CompanyForSort {
  id: string;
  name: string;
  region: string[];
  baseLocations: BaseLocation[];
}

export interface SortedCompany extends CompanyForSort {
  /** Great-circle distance from pickup to the company's nearest base, in km. Null when unknown. */
  distanceKm: number | null;
  /** The base that produced distanceKm, if any — useful for display ("42 km from Bergen"). */
  nearestBase: BaseLocation | null;
}

/**
 * Sort companies by real distance from the pickup point to their nearest
 * base — a company with bases scattered around the country should be judged
 * by whichever base would actually take the job, not some average or first
 * entry. Companies without any known base (or when pickup itself is
 * unknown) sort last, alphabetically — there's no fair way to rank them by
 * proximity, so we don't pretend to.
 */
export function sortCompaniesByDistance(
  companies: CompanyForSort[],
  pickup: { lat: number; lng: number } | null,
): SortedCompany[] {
  return companies
    .map((c) => {
      if (!pickup || c.baseLocations.length === 0) {
        return { ...c, distanceKm: null, nearestBase: null };
      }
      let nearestBase = c.baseLocations[0]!;
      let minDistanceKm = haversineMeters(pickup.lat, pickup.lng, nearestBase.lat, nearestBase.lng) / 1000;
      for (const base of c.baseLocations.slice(1)) {
        const d = haversineMeters(pickup.lat, pickup.lng, base.lat, base.lng) / 1000;
        if (d < minDistanceKm) {
          minDistanceKm = d;
          nearestBase = base;
        }
      }
      return { ...c, distanceKm: minDistanceKm, nearestBase };
    })
    .sort((a, b) => {
      if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
      if (a.distanceKm !== null) return -1;
      if (b.distanceKm !== null) return 1;
      return a.name.localeCompare(b.name, "no");
    });
}
