import { describe, it, expect } from "vitest";
import { sortCompaniesByDistance, type CompanyForSort } from "./companyDistance";

const pickup = { lat: 60.0, lng: 10.0 };

function makeCompany(overrides: Partial<CompanyForSort> = {}): CompanyForSort {
  return {
    id: "id",
    name: "Selskap",
    region: [],
    baseLocations: [],
    ...overrides,
  };
}

describe("sortCompaniesByDistance", () => {
  it("sorts companies with a known base ascending by real distance", () => {
    const near = makeCompany({ id: "near", name: "Near", baseLocations: [{ lat: 60.01, lng: 10.01 }] });
    const far = makeCompany({ id: "far", name: "Far", baseLocations: [{ lat: 61.0, lng: 12.0 }] });

    const sorted = sortCompaniesByDistance([far, near], pickup);

    expect(sorted.map((c) => c.id)).toEqual(["near", "far"]);
    expect(sorted[0]!.distanceKm).toBeLessThan(sorted[1]!.distanceKm!);
  });

  it("uses the nearest of multiple bases, not the first or an average", () => {
    const company = makeCompany({
      id: "multi",
      baseLocations: [
        { lat: 70.0, lng: 25.0, label: "Langt unna" }, // far
        { lat: 60.02, lng: 10.02, label: "Nærme" }, // close
      ],
    });

    const [sorted] = sortCompaniesByDistance([company], pickup);

    expect(sorted!.nearestBase?.label).toBe("Nærme");
    expect(sorted!.distanceKm).toBeLessThan(10);
  });

  it("puts companies without a base after all companies with a known distance", () => {
    const withBase = makeCompany({ id: "withBase", baseLocations: [{ lat: 60.1, lng: 10.1 }] });
    const withoutBase = makeCompany({ id: "withoutBase", baseLocations: [] });

    const sorted = sortCompaniesByDistance([withoutBase, withBase], pickup);

    expect(sorted.map((c) => c.id)).toEqual(["withBase", "withoutBase"]);
    expect(sorted[1]!.distanceKm).toBeNull();
    expect(sorted[1]!.nearestBase).toBeNull();
  });

  it("falls back to alphabetical order when neither has a known distance", () => {
    const b = makeCompany({ id: "b", name: "Bravo" });
    const a = makeCompany({ id: "a", name: "Alfa" });

    const sorted = sortCompaniesByDistance([b, a], pickup);

    expect(sorted.map((c) => c.id)).toEqual(["a", "b"]);
    expect(sorted.every((c) => c.distanceKm === null)).toBe(true);
  });

  it("treats every company as distance-unknown when pickup is null", () => {
    const withBase = makeCompany({ id: "withBase", baseLocations: [{ lat: 60.1, lng: 10.1 }] });

    const sorted = sortCompaniesByDistance([withBase], null);

    expect(sorted[0]!.distanceKm).toBeNull();
  });
});
