import { describe, it, expect } from "vitest";
import { calculateFlightCost } from "./offerAddons";

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
