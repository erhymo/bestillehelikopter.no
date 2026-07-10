"use client";

import { useMemo } from "react";
import { estimateAll } from "@/lib/flight";
import type { GeoPoint, Drop, FlightEstimate } from "@/types";

// Hook som beregner flytidsestimat live mens brukeren legger til drops

export function useFlightEstimate(pickup: GeoPoint | null, drops: Drop[]) {
  return useMemo(() => {
    if (!pickup || drops.length === 0) {
      return { estimates: [] as FlightEstimate[], totalFlightTimeMin: 0 };
    }
    return estimateAll(pickup, drops);
  }, [pickup, drops]);
}

