"use client";

import { AdvancedMarker } from "@vis.gl/react-google-maps";

interface DropMarkerProps {
  lat: number;
  lng: number;
  label: string; // H, A, B, C…
  color?: "red" | "green" | "blue";
  onClick?: () => void;
}

/**
 * Pin marker with a labeled bubble on top and a pointed tip at the bottom.
 * AdvancedMarker anchors content at its bottom-center by default, so the
 * tip of the pin (not the bubble) marks the exact coordinate.
 */
export function DropMarker({
  lat,
  lng,
  label,
  color = "red",
  onClick,
}: DropMarkerProps) {
  const bg =
    color === "green"
      ? "bg-green-600"
      : color === "blue"
        ? "bg-blue-600"
        : "bg-red-600";

  return (
    <AdvancedMarker position={{ lat, lng }} onClick={onClick}>
      <div
        className="flex flex-col items-center"
        style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.4))" }}
      >
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${bg} text-xs font-bold text-white ring-2 ring-white`}
        >
          {label}
        </div>
        <div
          className={`-mt-[2px] h-[7px] w-[10px] shrink-0 ${bg}`}
          style={{ clipPath: "polygon(50% 100%, 0 0, 100% 0)" }}
        />
      </div>
    </AdvancedMarker>
  );
}
