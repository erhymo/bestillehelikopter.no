"use client";

import { useEffect, useState } from "react";

interface Point {
  lat: number;
  lng: number;
}

const DEBOUNCE_MS = 500;

/**
 * Best-effort live elevation lookup for the flight-time preview shown while
 * filling out the RFQ form. Debounced so dragging/re-clicking points doesn't
 * hammer the server; falls back to 0 (flat terrain) until the first
 * successful fetch resolves, so there's no loading-state regression from
 * before this existed — the estimate just gets more accurate a moment later.
 */
export function useLiveElevations(points: Point[]): number[] {
  const [elevations, setElevations] = useState<number[]>([]);
  const key = points.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join("|");

  useEffect(() => {
    if (points.length === 0) {
      setElevations([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/elevation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ points }),
        });
        const data = await res.json();
        if (!cancelled && data.ok) {
          setElevations(data.elevations);
        }
      } catch {
        // Silent — this is a best-effort preview, not a required field.
        // The estimate just keeps using whatever elevations it already had.
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // `key` is a stable, value-based fingerprint of `points` — re-running
    // only when the actual coordinates change (not on every array identity
    // change) is the point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return elevations;
}
