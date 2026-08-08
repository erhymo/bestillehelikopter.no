import { describe, it, expect } from "vitest";
import { calculateOfferTotal } from "./offerAddons";

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
