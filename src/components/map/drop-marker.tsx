"use client";

import { AdvancedMarker } from "@vis.gl/react-google-maps";

interface DropMarkerProps {
  lat: number;
  lng: number;
  label: string; // A, B, C…
  color?: "red" | "green" | "blue";
  onClick?: () => void;
}

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
        className={`flex h-8 w-8 items-center justify-center rounded-full ${bg} text-sm font-bold text-white shadow-lg ring-2 ring-white`}
      >
        {label}
      </div>
    </AdvancedMarker>
  );
}

