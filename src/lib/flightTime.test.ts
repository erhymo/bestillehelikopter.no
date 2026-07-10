import { describe, it, expect } from "vitest";
import {
  computeFlightTime,
  computeFlightTimeBetweenPoints,
  haversineMeters,
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

  it("interpolates speed linearly for moderate slope", () => {
    // 45° slope → exactly 40kn
    // At 45°: elevGain/distance = tan(45°) = 1, so elevGain = distance
    const dist = 1000;
    const r = computeFlightTime(dist, 0, dist); // tan(45°) = 1
    expect(r.slopeDegrees).toBeCloseTo(45, 1);
    expect(r.speedKnots).toBeCloseTo(KNOTS_MIN, 1);
  });

  it("caps slope at 45° for very steep terrain", () => {
    // elevGain >> distance → atan > 45°, should cap
    const r = computeFlightTime(100, 0, 10_000);
    expect(r.slopeDegrees).toBe(45);
    expect(r.speedKnots).toBeCloseTo(KNOTS_MIN, 1);
  });

  it("caps slope at 45° for extreme vertical (>45°)", () => {
    // near-vertical: distance=1m, gain=1000m → atan ≈ 89.9°, capped to 45°
    const r = computeFlightTime(1, 0, 1000);
    expect(r.slopeDegrees).toBe(45);
    expect(r.speedKnots).toBeCloseTo(KNOTS_MIN, 1);
    // time should be nonzero since distance > 0
    expect(r.timeSeconds).toBeGreaterThan(0);
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

  it("computes mid-range slope correctly (22.5° → 60kn)", () => {
    // At 22.5°: speed = 80 - 40*(22.5/45) = 80 - 20 = 60kn
    // tan(22.5°) ≈ 0.4142
    const dist = 1000;
    const elevGain = Math.tan((22.5 * Math.PI) / 180) * dist;
    const r = computeFlightTime(dist, 0, elevGain);
    expect(r.slopeDegrees).toBeCloseTo(22.5, 1);
    expect(r.speedKnots).toBeCloseTo(60, 1);
  });

  it("speed never goes below 40kn", () => {
    // Even at extreme slope
    const r = computeFlightTime(1, 0, 100_000);
    expect(r.speedKnots).toBeGreaterThanOrEqual(KNOTS_MIN);
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

