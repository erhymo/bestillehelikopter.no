"use client";

/**
 * Best-effort reverse geocode of a point to its Norwegian fylke
 * (administrative_area_level_1), using the Maps JS API already loaded by
 * MapPicker's APIProvider. Returns null on any failure — this only powers a
 * soft UX suggestion, never a hard requirement.
 */
export async function reverseGeocodeRegion(
  lat: number,
  lng: number,
): Promise<string | null> {
  if (typeof google === "undefined" || !google.maps?.Geocoder) return null;

  try {
    const geocoder = new google.maps.Geocoder();
    const response = await geocoder.geocode({ location: { lat, lng } });

    for (const result of response.results) {
      const admin = result.address_components.find((c) =>
        c.types.includes("administrative_area_level_1"),
      );
      if (admin) return admin.long_name.toLowerCase();
    }
    return null;
  } catch {
    return null;
  }
}
