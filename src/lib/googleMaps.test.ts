import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock "server-only" — vitest runs outside Next.js server context
vi.mock("server-only", () => ({}));

import {
  buildStaticMapUrl,
  fetchElevations,
  haversineMeters,
  _getCacheSize,
  _clearCache,
} from "./googleMaps";

// ── Helpers ───────────────────────────────────────────────────────────────

const setEnv = (overrides: Record<string, string | undefined>) => {
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
};

beforeEach(() => {
  _clearCache();
  setEnv({
    GOOGLE_MAPS_SERVER_KEY: "test-api-key",
    GOOGLE_MAPS_SIGNING_SECRET: undefined, // unsigned by default
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  setEnv({
    GOOGLE_MAPS_SERVER_KEY: undefined,
    GOOGLE_MAPS_SIGNING_SECRET: undefined,
  });
});

// ── haversineMeters re-export ─────────────────────────────────────────────

describe("haversineMeters (re-export)", () => {
  it("returns 0 for same point", () => {
    expect(haversineMeters(60, 10, 60, 10)).toBe(0);
  });

  it("returns reasonable distance Oslo → Bergen (~305 km)", () => {
    const d = haversineMeters(59.911, 10.753, 60.393, 5.324);
    expect(d).toBeGreaterThan(290_000);
    expect(d).toBeLessThan(320_000);
  });
});

// ── buildStaticMapUrl ─────────────────────────────────────────────────────

describe("buildStaticMapUrl", () => {
  it("generates URL with default params", () => {
    const url = buildStaticMapUrl();
    expect(url).toContain("https://maps.googleapis.com/maps/api/staticmap");
    expect(url).toContain("size=600x400");
    expect(url).toContain("maptype=terrain");
    expect(url).toContain("key=test-api-key");
    expect(url).toContain("language=no");
    expect(url).toContain("region=NO");
  });

  it("respects custom size and zoom", () => {
    const url = buildStaticMapUrl({ width: 800, height: 600, zoom: 12 });
    expect(url).toContain("size=800x600");
    expect(url).toContain("zoom=12");
  });

  it("includes markers with style", () => {
    const url = buildStaticMapUrl({
      markers: [{ lat: 60.0, lng: 10.0, label: "A", color: "red" }],
    });
    expect(url).toContain("markers=");
    expect(url).toContain("color%3Ared");
    expect(url).toContain("label%3AA");
    expect(url).toContain("60%2C10");
  });

  it("includes paths with style", () => {
    const url = buildStaticMapUrl({
      paths: [
        {
          points: [
            { lat: 60, lng: 10 },
            { lat: 61, lng: 11 },
          ],
          color: "0x0000FF80",
          weight: 3,
        },
      ],
    });
    expect(url).toContain("path=");
    expect(url).toContain("color%3A0x0000FF80");
    expect(url).toContain("weight%3A3");
  });

  it("throws if GOOGLE_MAPS_SERVER_KEY is missing", () => {
    setEnv({ GOOGLE_MAPS_SERVER_KEY: undefined });
    expect(() => buildStaticMapUrl()).toThrow("Missing GOOGLE_MAPS_SERVER_KEY");
  });

  it("appends signature when GOOGLE_MAPS_SIGNING_SECRET is set", () => {
    // Use a known test secret (base64url-encoded)
    setEnv({ GOOGLE_MAPS_SIGNING_SECRET: "vNIXE0xscrmjlyV-12Nj_BvUPaw=" });
    const url = buildStaticMapUrl();
    expect(url).toContain("&signature=");
  });

  it("does NOT append signature when secret is absent", () => {
    const url = buildStaticMapUrl();
    expect(url).not.toContain("&signature=");
  });
});

// ── fetchElevations + cache ───────────────────────────────────────────────

describe("fetchElevations", () => {
  it("returns empty array for empty input", async () => {
    const result = await fetchElevations([]);
    expect(result).toEqual([]);
  });

  it("fetches from API and populates cache", async () => {
    const mockResponse = {
      status: "OK",
      results: [{ location: { lat: 60, lng: 10 }, elevation: 123.4 }],
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const result = await fetchElevations([{ lat: 60, lng: 10 }]);
    expect(result).toHaveLength(1);
    expect(result[0].elevation).toBe(123.4);
    expect(_getCacheSize()).toBe(1);
  });

  it("serves cached values without API call", async () => {
    const mockResponse = {
      status: "OK",
      results: [{ location: { lat: 60, lng: 10 }, elevation: 100 }],
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      json: () => Promise.resolve(mockResponse),
    } as Response);

    // First call — hits API
    await fetchElevations([{ lat: 60, lng: 10 }]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Second call — should come from cache
    const result = await fetchElevations([{ lat: 60, lng: 10 }]);
    expect(fetchSpy).toHaveBeenCalledTimes(1); // no new call
    expect(result[0].elevation).toBe(100);
  });

  it("throws on API error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      json: () =>
        Promise.resolve({ status: "OVER_QUERY_LIMIT", error_message: "Quota" }),
    } as Response);

    await expect(fetchElevations([{ lat: 60, lng: 10 }])).rejects.toThrow(
      "Elevation API error",
    );
  });

  it("throws if GOOGLE_MAPS_SERVER_KEY is missing", async () => {
    setEnv({ GOOGLE_MAPS_SERVER_KEY: undefined });
    await expect(fetchElevations([{ lat: 60, lng: 10 }])).rejects.toThrow(
      "Missing GOOGLE_MAPS_SERVER_KEY",
    );
  });
});

