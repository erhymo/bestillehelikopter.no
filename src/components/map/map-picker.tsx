"use client";

import { useCallback, useState } from "react";
import { APIProvider, Map, type MapMouseEvent } from "@vis.gl/react-google-maps";
import { DropMarker } from "@/components/map/drop-marker";

export type MapMode = "pickup" | "drop";

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

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Map type toggle — part of the map module, sits above the canvas so
          it never covers Google's own attribution/controls at the bottom. */}
      <div className="flex shrink-0 flex-wrap gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
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

      <div className="relative min-h-0 flex-1">
        <APIProvider apiKey={apiKey}>
          <Map
            defaultCenter={NORWAY_CENTER}
            defaultZoom={DEFAULT_ZOOM}
            mapTypeId={mapType}
            mapId={mapId}
            onClick={handleClick}
            gestureHandling="greedy"
            disableDefaultUI={false}
            mapTypeControl={false}
            clickableIcons={false}
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
      </div>
    </div>
  );
}
