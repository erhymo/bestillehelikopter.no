import { describe, expect, it } from "vitest";
import { formatCoordinate, parseCoordinateInput } from "./coordinates";

describe("parseCoordinateInput", () => {
  it("parses comma separated coordinates", () => {
    expect(parseCoordinateInput("60.472024, 5.322054")).toEqual({
      lat: 60.472024,
      lng: 5.322054,
    });
  });

  it("parses Google Maps urls", () => {
    expect(parseCoordinateInput("https://www.google.com/maps/@60.472024,5.322054,15z")).toEqual({
      lat: 60.472024,
      lng: 5.322054,
    });
  });

  it("accepts lng-first coordinates when the first value cannot be latitude", () => {
    expect(parseCoordinateInput("145.1 60.2")).toEqual({ lat: 60.2, lng: 145.1 });
  });

  it("returns null for invalid input", () => {
    expect(parseCoordinateInput("ikke koordinater")).toBeNull();
    expect(parseCoordinateInput("1000, 5")).toBeNull();
  });

  it("formats coordinates consistently", () => {
    expect(formatCoordinate({ lat: 60.472024, lng: 5.322054 })).toBe("60.47202, 5.32205");
  });
});
