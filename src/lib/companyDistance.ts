import { haversineMeters } from "@/lib/flightTime";

export interface CompanyForSort {
  id: string;
  name: string;
  region: string[];
  baseLocation: { lat: number; lng: number } | null;
}

export interface SortedCompany extends CompanyForSort {
  /** Great-circle distance from pickup to the company's base, in km. Null when either is unknown. */
  distanceKm: number | null;
}

/**
 * Sort companies by real distance from the pickup point. Companies without a
 * known base (or when pickup itself is unknown) sort last, alphabetically —
 * there's no fair way to rank them by proximity, so we don't pretend to.
 */
export function sortCompaniesByDistance(
  companies: CompanyForSort[],
  pickup: { lat: number; lng: number } | null,
): SortedCompany[] {
  return companies
    .map((c) => ({
      ...c,
      distanceKm:
        pickup && c.baseLocation
          ? haversineMeters(pickup.lat, pickup.lng, c.baseLocation.lat, c.baseLocation.lng) / 1000
          : null,
    }))
    .sort((a, b) => {
      if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
      if (a.distanceKm !== null) return -1;
      if (b.distanceKm !== null) return 1;
      return a.name.localeCompare(b.name, "no");
    });
}
