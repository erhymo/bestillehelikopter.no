"use client";

import { useEffect } from "react";
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import { DropMarker } from "@/components/map/drop-marker";

interface Point {
  lat: number;
  lng: number;
}

interface OfferMapViewProps {
  pickup: Point;
  drops: Point[];
  className?: string;
}

const NORWAY_CENTER = { lat: 63.5, lng: 10.0 };

function FitBounds({ pickup, drops }: { pickup: Point; drops: Point[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(pickup);
    for (const drop of drops) bounds.extend(drop);
    map.fitBounds(bounds, 48);
  }, [map, pickup, drops]);

  return null;
}

/**
 * Read-only kartutsnitt zoomet til å vise hele oppdraget (oppmøtested + hiv).
 */
export function OfferMapView({ pickup, drops, className = "" }: OfferMapViewProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "";
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "";
  const dropLabels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  return (
    <div className={`relative min-h-0 ${className}`}>
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={NORWAY_CENTER}
          defaultZoom={6}
          mapTypeId="terrain"
          mapId={mapId}
          gestureHandling="greedy"
          disableDefaultUI={false}
          mapTypeControl={false}
          clickableIcons={false}
          className="h-full w-full rounded-lg"
        >
          <FitBounds pickup={pickup} drops={drops} />
          <DropMarker lat={pickup.lat} lng={pickup.lng} label="H" color="green" />
          {drops.map((drop, i) => (
            <DropMarker
              key={i}
              lat={drop.lat}
              lng={drop.lng}
              label={dropLabels[i] ?? String(i + 1)}
              color="red"
            />
          ))}
        </Map>
      </APIProvider>
    </div>
  );
}
