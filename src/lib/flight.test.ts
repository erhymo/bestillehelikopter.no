import { describe, it, expect } from "vitest";
import { estimateDrop, estimateAll } from "./flight";
import { TURNAROUND_MIN_PER_HIV } from "./flightTime";
import type { GeoPoint, Drop } from "@/types";

const pickup: GeoPoint = { lat: 60.0, lng: 10.0, elevation: 0 };

function makeDrop(overrides: Partial<Drop> = {}): Drop {
  return {
    lat: 60.1,
    lng: 10.1,
    elevation: 0,
    hpieces: 1,
    loadItems: [],
    ...overrides,
  };
}

describe("estimateDrop", () => {
  it("multiplies flight time by hiv count as a round trip", () => {
    const oneHiv = estimateDrop(pickup, makeDrop({ hpieces: 1 }), 0);
    const fiveHiv = estimateDrop(pickup, makeDrop({ hpieces: 5 }), 0);

    // 5 hiv should cost ~5x the per-hiv cycle time (round trip + turnaround),
    // not the same as 1 hiv and not just 5x the one-way leg.
    const perHivMin = oneHiv.flightTimeMin;
    expect(fiveHiv.flightTimeMin).toBeCloseTo(perHivMin * 5, 0);
    expect(fiveHiv.hiveCount).toBe(5);
  });

  it("treats hpieces of 0 or negative as at least 1 hiv", () => {
    const zero = estimateDrop(pickup, makeDrop({ hpieces: 0 }), 0);
    const one = estimateDrop(pickup, makeDrop({ hpieces: 1 }), 0);
    expect(zero.flightTimeMin).toBe(one.flightTimeMin);
    expect(zero.hiveCount).toBe(1);
  });

  it("includes turnaround time per hiv, not just flight time", () => {
    // Zero distance → zero flight time, but turnaround still applies.
    const samePoint: GeoPoint = { lat: pickup.lat, lng: pickup.lng, elevation: 0 };
    const est = estimateDrop(pickup, { ...samePoint, hpieces: 3, loadItems: [] }, 0);
    expect(est.flightTimeMin).toBeCloseTo(TURNAROUND_MIN_PER_HIV * 3, 5);
  });

  it("caps speed based on total load weight divided across hiv", () => {
    const heavy = estimateDrop(
      pickup,
      makeDrop({
        hpieces: 1,
        loadItems: [{ count: 1, weightKg: 1200, type: "stål" }],
      }),
      0,
    );
    const light = estimateDrop(
      pickup,
      makeDrop({
        hpieces: 1,
        loadItems: [{ count: 1, weightKg: 50, type: "verktøy" }],
      }),
      0,
    );
    expect(heavy.speedKn).toBeLessThan(light.speedKn);
  });

  it("spreads load weight across multiple hiv before applying the speed cap", () => {
    // 1200kg over 1 hiv → heavy cap (40kn); same 1200kg over 3 hiv → 400kg/hiv → light cap (80kn)
    const oneHiv = estimateDrop(
      pickup,
      makeDrop({ hpieces: 1, loadItems: [{ count: 1, weightKg: 1200, type: "stål" }] }),
      0,
    );
    const threeHiv = estimateDrop(
      pickup,
      makeDrop({ hpieces: 3, loadItems: [{ count: 1, weightKg: 1200, type: "stål" }] }),
      0,
    );
    expect(oneHiv.speedKn).toBeLessThan(threeHiv.speedKn);
  });
});

describe("estimateAll", () => {
  it("sums per-drop flight time (each already accounting for its own hiv count)", () => {
    const drops = [makeDrop({ hpieces: 2 }), makeDrop({ hpieces: 3 })];
    const { estimates, totalFlightTimeMin } = estimateAll(pickup, drops);
    const expectedTotal =
      Math.round((estimates[0]!.flightTimeMin + estimates[1]!.flightTimeMin) * 10) / 10;
    expect(totalFlightTimeMin).toBeCloseTo(expectedTotal, 1);
  });
});
