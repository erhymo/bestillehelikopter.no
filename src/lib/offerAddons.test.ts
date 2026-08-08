import { describe, it, expect } from "vitest";
import { calculateOfferTotal, calculateFlightCost } from "./offerAddons";

describe("calculateOfferTotal", () => {
  it("returns the base price when there are no addons", () => {
    expect(calculateOfferTotal(45000, [])).toBe(45000);
  });

  it("sums the base price and every addon price", () => {
    const total = calculateOfferTotal(45000, [
      { key: "tilflyging", label: "Tilflyging", price: 5000 },
      { key: "ventetid", label: "Ventetid", price: 1500 },
    ]);
    expect(total).toBe(51500);
  });

  it("handles a zero base price (edge case, still sums addons)", () => {
    expect(calculateOfferTotal(0, [{ key: "x", label: "X", price: 200 }])).toBe(200);
  });
});

describe("calculateFlightCost", () => {
  it("multiplies hourly rate by flight time in hours", () => {
    // 3500 NOK/t × 24 min (0.4t) = 1400
    expect(calculateFlightCost(3500, 24)).toBe(1400);
  });

  it("rounds to the nearest whole NOK", () => {
    // 4000 NOK/t × 7 min = 466.666...
    expect(calculateFlightCost(4000, 7)).toBe(467);
  });

  it("returns 0 for zero flight time", () => {
    expect(calculateFlightCost(5000, 0)).toBe(0);
  });
});
