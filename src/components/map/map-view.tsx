"use client";

import { useState, useMemo } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from "@vis.gl/react-google-maps";
import { DropMarker } from "@/components/map/drop-marker";

// ── Types ─────────────────────────────────────────────────────

interface GeoPointData {
  lat: number;
  lng: number;
  elevation: number;
  address?: string;
}

interface DropData extends GeoPointData {
  hpieces: number;
  loadItems: { count: number; weightKg: number; type: string }[];
}

interface EstimateData {
  dropIndex: number;
  distanceKm: number;
  elevGainM: number;
  flightTimeMin: number;
}

export interface MapViewData {
  jobId: string;
  companyId: string;
  pickup: GeoPointData;
  drops: DropData[];
  estimates: EstimateData[];
  totalFlightTimeMin: number;
  desiredDate: string;
  flexibleDate: boolean;
  nettbruk: boolean;
  over15m: boolean;
}

type MapTypeId = "roadmap" | "satellite" | "terrain" | "hybrid";

const MAP_TYPE_LABELS: { id: MapTypeId; label: string }[] = [
  { id: "roadmap", label: "Kart" },
  { id: "satellite", label: "Satellitt" },
  { id: "terrain", label: "Terreng" },
  { id: "hybrid", label: "Hybrid" },
];

// ── Polyline component ────────────────────────────────────────

function Polylines({ pickup, drops }: { pickup: GeoPointData; drops: DropData[] }) {
  const map = useMap();

  useMemo(() => {
    if (!map || typeof google === "undefined") return;

    // Clear old polylines by re-adding — React manages lifecycle
    const lines: google.maps.Polyline[] = [];

    drops.forEach((drop) => {
      const line = new google.maps.Polyline({
        path: [
          { lat: pickup.lat, lng: pickup.lng },
          { lat: drop.lat, lng: drop.lng },
        ],
        strokeColor: "#1e3a5f",
        strokeOpacity: 0.7,
        strokeWeight: 2,
        geodesic: true,
        map,
      });
      lines.push(line);
    });

    return () => {
      lines.forEach((l) => l.setMap(null));
    };
  }, [map, pickup, drops]);

  return null;
}

// ── Main component ────────────────────────────────────────────

export function MapView({ data }: { data: MapViewData }) {
  const [mapType, setMapType] = useState<MapTypeId>("terrain");

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "";
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "";

  // Compute bounds center
  const allPoints = [data.pickup, ...data.drops];
  const centerLat = allPoints.reduce((s, p) => s + p.lat, 0) / allPoints.length;
  const centerLng = allPoints.reduce((s, p) => s + p.lng, 0) / allPoints.length;

  // Label helper
  const dropLabel = (i: number) => String.fromCharCode(65 + i);

  const dateStr = data.desiredDate
    ? data.desiredDate + (data.flexibleDate ? " (fleksibel)" : "")
    : "Ikke spesifisert";

  const extras: string[] = [];
  if (data.nettbruk) extras.push("Nettbruk");
  if (data.over15m) extras.push("Last over 15m");

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Map */}
      <div className="relative h-[60vh] w-full lg:h-screen lg:flex-1">
        <APIProvider apiKey={apiKey}>
          <Map
            defaultCenter={{ lat: centerLat, lng: centerLng }}
            defaultZoom={allPoints.length === 1 ? 12 : 9}
            mapTypeId={mapType}
            mapId={mapId}
            gestureHandling="greedy"
            clickableIcons={false}
            className="h-full w-full"
          >
            {/* Pickup marker */}
            <AdvancedMarker position={{ lat: data.pickup.lat, lng: data.pickup.lng }}>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-sm font-bold text-white shadow-lg ring-2 ring-white">
                P
              </div>
            </AdvancedMarker>

            {/* Drop markers */}
            {data.drops.map((drop, i) => (
              <DropMarker
                key={i}
                lat={drop.lat}
                lng={drop.lng}
                label={dropLabel(i)}
                color="red"
              />
            ))}

            {/* Polylines */}
            <Polylines pickup={data.pickup} drops={data.drops} />
          </Map>
        </APIProvider>

        {/* Map type selector */}
        <div className="absolute bottom-4 left-4 flex gap-1 rounded-lg bg-white/90 p-1 shadow-lg backdrop-blur">
          {MAP_TYPE_LABELS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setMapType(id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                mapType === id
                  ? "bg-[#1e3a5f] text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-full overflow-y-auto border-t bg-white p-6 lg:w-96 lg:border-l lg:border-t-0">
        <h1 className="mb-4 text-xl font-bold text-[#1e3a5f]">
          Forespørselsdetaljer
        </h1>

        {/* Metadata */}
        <div className="mb-6 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Ønsket dato</span>
            <span className="font-medium">{dateStr}</span>
          </div>
          {extras.length > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Tillegg</span>
              <span className="font-medium">{extras.join(", ")}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-2">
            <span className="font-semibold text-gray-700">Total flytid</span>
            <span className="font-bold text-[#1e3a5f]">
              {data.totalFlightTimeMin.toFixed(1)} min
            </span>
          </div>
        </div>

        {/* Pickup */}
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">
              P
            </span>
            <span className="font-semibold text-gray-800">Pickup</span>
          </div>
          <p className="text-xs text-gray-600">
            {data.pickup.lat.toFixed(5)}, {data.pickup.lng.toFixed(5)}
            {data.pickup.elevation > 0 && ` · ${Math.round(data.pickup.elevation)} moh`}
          </p>
        </div>

        {/* Drops */}
        <div className="space-y-3">
          {data.drops.map((drop, i) => {
            const est = data.estimates.find((e) => e.dropIndex === i);
            return (
              <div key={i} className="rounded-lg border p-3">
                <div className="mb-1 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                    {dropLabel(i)}
                  </span>
                  <span className="font-semibold text-gray-800">
                    Dropp {dropLabel(i)}
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  {drop.lat.toFixed(5)}, {drop.lng.toFixed(5)}
                  {drop.elevation > 0 && ` · ${Math.round(drop.elevation)} moh`}
                </p>
                {drop.loadItems.length > 0 && (
                  <div className="mt-1 text-xs text-gray-600">
                    {drop.loadItems.map((li, j) => (
                      <span key={j}>
                        {li.count}× {li.type} ({li.weightKg} kg)
                        {j < drop.loadItems.length - 1 && ", "}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-1 text-xs text-gray-600">
                  Hiv: {drop.hpieces}
                </div>
                {est && (
                  <div className="mt-2 flex gap-4 text-xs">
                    <span className="text-gray-600">
                      {est.distanceKm.toFixed(1)} km
                    </span>
                    <span className="text-gray-600">
                      +{Math.round(est.elevGainM)} m
                    </span>
                    <span className="font-semibold text-[#1e3a5f]">
                      {est.flightTimeMin.toFixed(1)} min
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
