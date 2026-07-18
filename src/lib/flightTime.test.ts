import { describe, it, expect } from "vitest";
import {
  computeFlightTime,
  computeFlightTimeBetweenPoints,
  haversineMeters,
  getWeightSpeedCapKnots,
  TURNAROUND_MIN_PER_HIV,
} from "./flightTime";

// ── Constants for assertions ──────────────────────────────────
const KNOTS_MAX = 80;
const KNOTS_MIN = 40;
const KN_TO_KMH = 1.852;

describe("computeFlightTime", () => {
  it("returns 0 time and max speed for 0 distance", () => {
    const r = computeFlightTime(0, 100, 500);
    expect(r.slopeDegrees).toBe(0);
    expect(r.speedKnots).toBe(KNOTS_MAX);
    expect(r.timeSeconds).toBe(0);
  });

  it("returns 0 time and max speed for negative distance", () => {
    const r = computeFlightTime(-100, 0, 100);
    expect(r.timeSeconds).toBe(0);
    expect(r.speedKnots).toBe(KNOTS_MAX);
  });

  it("returns max speed (80kn) for zero elevation gain (flat)", () => {
    const r = computeFlightTime(10_000, 500, 500);
    expect(r.slopeDegrees).toBe(0);
    expect(r.speedKnots).toBe(KNOTS_MAX);
    // time = (10km) / (80kn × 1.852) × 3600
    const expectedTime = (10_000 / 1000 / (KNOTS_MAX * KN_TO_KMH)) * 3600;
    expect(r.timeSeconds).toBeCloseTo(expectedTime, 2);
  });

  it("returns max speed (80kn) for negative elevation gain (downhill)", () => {
    const r = computeFlightTime(10_000, 1000, 200);
    expect(r.slopeDegrees).toBe(0);
    expect(r.speedKnots).toBe(KNOTS_MAX);
  });

  it("gradient at or below 50 m/nm gives max speed (80kn)", () => {
    // gradient = elevGain × 1852 / dist. dist=1852m, elevGain=50m → 50 m/nm exactly.
    const r = computeFlightTime(1852, 0, 50);
    expect(r.speedKnots).toBeCloseTo(KNOTS_MAX, 1);
  });

  it("gradient at or above 300 m/nm gives min speed (40kn)", () => {
    // dist=1852m, elevGain=300m → 300 m/nm exactly (the gHigh threshold).
    const r = computeFlightTime(1852, 0, 300);
    expect(r.speedKnots).toBeCloseTo(KNOTS_MIN, 1);
  });

  it("interpolates linearly at the midpoint gradient (175 m/nm → 60kn)", () => {
    // Halfway between gLow (50) and gHigh (300) → halfway between 80 and 40kn.
    const dist = 1852;
    const elevGain = 175; // 175 m/nm at this distance
    const r = computeFlightTime(dist, 0, elevGain);
    expect(r.speedKnots).toBeCloseTo(60, 1);
  });

  it("caps speed at minimum for very steep terrain, well beyond gHigh", () => {
    const r = computeFlightTime(100, 0, 10_000);
    expect(r.speedKnots).toBeCloseTo(KNOTS_MIN, 1);
  });

  it("caps speed at minimum for near-vertical terrain", () => {
    const r = computeFlightTime(1, 0, 1000);
    expect(r.speedKnots).toBeCloseTo(KNOTS_MIN, 1);
    // time should be nonzero since distance > 0
    expect(r.timeSeconds).toBeGreaterThan(0);
  });

  it("slopeDegrees is informational only and not capped at 45°", () => {
    // near-vertical: distance=1m, gain=1000m → atan ≈ 89.9°
    const r = computeFlightTime(1, 0, 1000);
    expect(r.slopeDegrees).toBeGreaterThan(45);
  });

  it("computes correct time for a known scenario", () => {
    // 10km horizontal, 0 elev gain → 80kn = 148.16 km/h
    // time = 10/148.16 × 3600 = 243.07s
    const r = computeFlightTime(10_000, 0, 0);
    const expectedTime = (10 / (80 * 1.852)) * 3600;
    expect(r.timeSeconds).toBeCloseTo(expectedTime, 1);
  });

  it("handles tiny distance correctly", () => {
    const r = computeFlightTime(0.001, 0, 0);
    expect(r.timeSeconds).toBeGreaterThan(0);
    expect(r.speedKnots).toBe(KNOTS_MAX);
    // time should be very small
    expect(r.timeSeconds).toBeLessThan(0.01);
  });

  it("treats undefined elevations as 0", () => {
    const r1 = computeFlightTime(5000, undefined, undefined);
    const r2 = computeFlightTime(5000, 0, 0);
    expect(r1.slopeDegrees).toBe(r2.slopeDegrees);
    expect(r1.speedKnots).toBe(r2.speedKnots);
    expect(r1.timeSeconds).toBeCloseTo(r2.timeSeconds, 5);
  });

  it("speed never goes below 40kn", () => {
    // Even at extreme slope
    const r = computeFlightTime(1, 0, 100_000);
    expect(r.speedKnots).toBeGreaterThanOrEqual(KNOTS_MIN);
  });

  it("caps speed for a heavy load even on flat terrain", () => {
    const r = computeFlightTime(10_000, 0, 0, 1200); // >1000kg → 40kn cap
    expect(r.speedKnots).toBe(40);
  });

  it("caps speed for a medium load even on flat terrain", () => {
    const r = computeFlightTime(10_000, 0, 0, 700); // 500-1000kg → 60kn cap
    expect(r.speedKnots).toBe(60);
  });

  it("does not raise speed above the terrain-derived value for a light load", () => {
    const r = computeFlightTime(10_000, 0, 0, 100); // light load, flat terrain
    expect(r.speedKnots).toBe(KNOTS_MAX);
  });

  it("weight cap never raises speed above what terrain slope already allows", () => {
    // Steep terrain forces 40kn; a light load's 80kn cap should not override that
    const dist = 1000;
    const r = computeFlightTime(dist, 0, dist, 100); // 45° slope → 40kn, light load cap 80kn
    expect(r.speedKnots).toBeCloseTo(KNOTS_MIN, 1);
  });

  it("ignores weight when not provided (backwards compatible)", () => {
    const r = computeFlightTime(10_000, 0, 0);
    expect(r.speedKnots).toBe(KNOTS_MAX);
  });
});

describe("getWeightSpeedCapKnots", () => {
  it("returns 80kn for light loads (<=500kg)", () => {
    expect(getWeightSpeedCapKnots(0)).toBe(80);
    expect(getWeightSpeedCapKnots(500)).toBe(80);
  });

  it("returns 60kn for medium loads (500-1000kg)", () => {
    expect(getWeightSpeedCapKnots(501)).toBe(60);
    expect(getWeightSpeedCapKnots(1000)).toBe(60);
  });

  it("returns 40kn for heavy loads (>1000kg)", () => {
    expect(getWeightSpeedCapKnots(1001)).toBe(40);
    expect(getWeightSpeedCapKnots(5000)).toBe(40);
  });
});

describe("TURNAROUND_MIN_PER_HIV", () => {
  it("is a small positive number of minutes", () => {
    expect(TURNAROUND_MIN_PER_HIV).toBeGreaterThan(0);
    expect(TURNAROUND_MIN_PER_HIV).toBeLessThan(10);
  });
});

describe("haversineMeters", () => {
  it("returns 0 for same point", () => {
    expect(haversineMeters(59.9, 10.7, 59.9, 10.7)).toBe(0);
  });

  it("computes known Oslo-Bergen distance (~305km)", () => {
    // Oslo (59.91, 10.75) → Bergen (60.39, 5.32)
    const d = haversineMeters(59.91, 10.75, 60.39, 5.32);
    expect(d / 1000).toBeCloseTo(305, -1); // within ~10km
  });

  it("computes equator 1° longitude ≈ 111km", () => {
    const d = haversineMeters(0, 0, 0, 1);
    expect(d / 1000).toBeCloseTo(111.2, 0);
  });
});

describe("computeFlightTimeBetweenPoints", () => {
  it("computes flight time from lat/lng points", () => {
    const pickup = { lat: 59.91, lng: 10.75, elevation: 0 };
    const drop = { lat: 59.92, lng: 10.76, elevation: 500 };
    const r = computeFlightTimeBetweenPoints(pickup, drop);
    expect(r.timeSeconds).toBeGreaterThan(0);
    expect(r.slopeDegrees).toBeGreaterThan(0);
    expect(r.speedKnots).toBeLessThan(KNOTS_MAX);
  });

  it("works without elevation (defaults to 0)", () => {
    const pickup = { lat: 60.0, lng: 10.0 };
    const drop = { lat: 60.1, lng: 10.1 };
    const r = computeFlightTimeBetweenPoints(pickup, drop);
    expect(r.slopeDegrees).toBe(0);
    expect(r.speedKnots).toBe(KNOTS_MAX);
    expect(r.timeSeconds).toBeGreaterThan(0);
  });
});

