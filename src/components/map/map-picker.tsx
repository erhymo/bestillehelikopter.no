"use client";

import { useCallback, useState } from "react";
import { APIProvider, Map, type MapMouseEvent } from "@vis.gl/react-google-maps";
import { DropMarker } from "@/components/map/drop-marker";

export type MapMode = "pickup" | "drop" | "idle";

interface PickupPoint {
  lat: number;
  lng: number;
}

interface DropPoint {
  lat: number;
  lng: number;
}

interface MapPickerProps {
  mode: MapMode;
  pickup: PickupPoint | null;
  drops: DropPoint[];
  activeDropIndex?: number | null;
  onPickupSet: (point: PickupPoint) => void;
  onDropAdd: (point: DropPoint) => void;
  onDropUpdate?: (index: number, point: DropPoint) => void;
  onDropClick?: (index: number) => void;
  className?: string;
}

const NORWAY_CENTER = { lat: 63.5, lng: 10.0 };
const DEFAULT_ZOOM = 6;
type MapTypeId = "roadmap" | "satellite" | "terrain" | "hybrid";

const MAP_TYPE_LABELS: { id: MapTypeId; label: string }[] = [
  { id: "roadmap", label: "Kart" },
  { id: "satellite", label: "Satellitt" },
  { id: "terrain", label: "Terreng" },
  { id: "hybrid", label: "Hybrid" },
];

export function MapPicker({
  mode,
  pickup,
  drops,
  activeDropIndex = null,
  onPickupSet,
  onDropAdd,
  onDropUpdate,
  onDropClick,
  className = "",
}: MapPickerProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "";
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "";
  const [mapType, setMapType] = useState<MapTypeId>("terrain");
  const activeDrop = typeof activeDropIndex === "number" ? drops[activeDropIndex] : undefined;

  const handleClick = useCallback(
    (e: MapMouseEvent) => {
      const pos = e.detail.latLng;
      if (!pos) return;
      const point = { lat: pos.lat, lng: pos.lng };

      if (mode === "pickup") {
        onPickupSet(point);
      } else if (mode === "drop") {
        if (activeDrop && typeof activeDropIndex === "number" && onDropUpdate) {
          onDropUpdate(activeDropIndex, point);
        } else {
          onDropAdd(point);
        }
      }
    },
    [activeDrop, activeDropIndex, mode, onDropAdd, onDropUpdate, onPickupSet],
  );

  const dropLabels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const activeDropLabel =
    typeof activeDropIndex === "number"
      ? (dropLabels[activeDropIndex] ?? String(activeDropIndex + 1))
      : null;

  return (
    <div className={`relative ${className}`}>
      {/* Mode indicator */}
      <div className="absolute top-3 right-3 left-3 z-10 max-w-md rounded-lg bg-white/95 px-3 py-2 text-sm font-medium shadow-md backdrop-blur-sm">
        {mode === "pickup" && "🟢 Klikk for å sette hentepunkt"}
        {mode === "drop" &&
          activeDropLabel &&
          `🔴 Klikk i kartet for å flytte leveringspunkt ${activeDropLabel}`}
        {mode === "drop" &&
          !activeDropLabel &&
          "🔴 Klikk i kartet for å legge til nytt leveringspunkt"}
        {mode === "idle" && "Kart – velg modus nedenfor"}
      </div>

      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={NORWAY_CENTER}
          defaultZoom={DEFAULT_ZOOM}
          mapTypeId={mapType}
          mapId={mapId}
          onClick={handleClick}
          gestureHandling="greedy"
          disableDefaultUI={false}
          className="h-full w-full rounded-lg"
        >
          {/* Pickup marker */}
          {pickup && <DropMarker lat={pickup.lat} lng={pickup.lng} label="H" color="green" />}

          {/* Drop markers */}
          {drops.map((drop, i) => (
            <DropMarker
              key={i}
              lat={drop.lat}
              lng={drop.lng}
              label={dropLabels[i] ?? String(i + 1)}
              color="red"
              onClick={() => onDropClick?.(i)}
            />
          ))}
        </Map>
      </APIProvider>

      <div className="absolute bottom-3 left-3 z-10 flex max-w-[calc(100%-1.5rem)] gap-1 overflow-x-auto rounded-lg bg-white/95 p-1 shadow-md backdrop-blur-sm">
        {MAP_TYPE_LABELS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMapType(id)}
            className={`rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
              mapType === id ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
