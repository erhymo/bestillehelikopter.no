export interface CoordinatePoint {
  lat: number;
  lng: number;
}

function isValidCoordinate(lat: number, lng: number) {
  return (
    Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
  );
}

export function parseCoordinateInput(input: string): CoordinatePoint | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const urlMatch = trimmed.match(/[@?&=]([+-]?[0-9]+(?:\.[0-9]+)?),\s*([+-]?[0-9]+(?:\.[0-9]+)?)/);
  if (urlMatch) {
    const lat = Number(urlMatch[1]);
    const lng = Number(urlMatch[2]);
    return isValidCoordinate(lat, lng) ? { lat, lng } : null;
  }

  const nsewMatch = trimmed.match(
    /^([+-]?[0-9]+(?:\.[0-9]+)?)\s*([NSns])[,\s]+([+-]?[0-9]+(?:\.[0-9]+)?)\s*([EWew])$/,
  );
  if (nsewMatch) {
    let lat = Number(nsewMatch[1]);
    let lng = Number(nsewMatch[3]);
    if (nsewMatch[2].toUpperCase() === "S") lat = -lat;
    if (nsewMatch[4].toUpperCase() === "W") lng = -lng;
    return isValidCoordinate(lat, lng) ? { lat, lng } : null;
  }

  const parts = trimmed.replace(/,/g, " ").replace(/\s+/g, " ").split(" ");
  if (parts.length !== 2) return null;

  const first = Number(parts[0]);
  const second = Number(parts[1]);
  if (isValidCoordinate(first, second)) return { lat: first, lng: second };
  if (isValidCoordinate(second, first)) return { lat: second, lng: first };

  return null;
}

export function formatCoordinate(point: CoordinatePoint) {
  return `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
}
