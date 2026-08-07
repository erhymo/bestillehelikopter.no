"use client";

import { useEffect, useRef, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { MapPin } from "lucide-react";
import { db } from "@/lib/firebase/client";
import { Spinner } from "@/components/ui/spinner";
import { sortCompaniesByDistance, type SortedCompany } from "@/lib/companyDistance";
import type { BaseLocation } from "@/types";

const NEAREST_SHOWN = 3;

interface CompanySelectorProps {
  selected: string[];
  onChange: (ids: string[]) => void;
  /** Lowercase fylke name detected from the pickup point, if any. */
  region?: string | null;
  /** Pickup coordinates, if set — enables real distance sorting for companies with a known base. */
  pickup?: { lat: number; lng: number } | null;
}

export function CompanySelector({ selected, onChange, region, pickup = null }: CompanySelectorProps) {
  const [companies, setCompanies] = useState<SortedCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllNearest, setShowAllNearest] = useState(false);
  const hasAutoSelected = useRef(false);

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(collection(db, "companies"));
        const list: { id: string; name: string; region: string[]; baseLocations: BaseLocation[] }[] = [];
        snap.forEach((doc) => {
          const data = doc.data();
          // Companies default to enabled unless explicitly disabled by admin.
          if (data.disabled !== true) {
            list.push({
              id: doc.id,
              name: data.name ?? doc.id,
              region: Array.isArray(data.region) ? data.region : [],
              baseLocations: Array.isArray(data.baseLocations) ? data.baseLocations : [],
            });
          }
        });
        setCompanies(sortCompaniesByDistance(list, pickup));
      } catch {
        // Silently fail — companies can be empty in dev
        setCompanies([]);
      } finally {
        setLoading(false);
      }
    }
    load();
    // Only re-fetch when pickup changes (re-sorts against the already-loaded
    // list would be nicer, but a full reload is simple and this list rarely
    // changes mid-session).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup?.lat, pickup?.lng]);

  const withDistance = companies.filter((c) => c.distanceKm !== null);
  const withoutDistance = companies.filter((c) => c.distanceKm === null);

  // Suggest the nearest few as a starting point, once — never fight the
  // customer's own choices after that, even if they clear the selection.
  useEffect(() => {
    if (hasAutoSelected.current) return;
    if (selected.length > 0) return;
    if (withDistance.length === 0) return;
    hasAutoSelected.current = true;
    onChange(withDistance.slice(0, NEAREST_SHOWN).map((c) => c.id));
  }, [withDistance, selected.length, onChange]);

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const toggleAll = () => {
    if (selected.length === companies.length) {
      onChange([]);
    } else {
      onChange(companies.map((c) => c.id));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-gray-600">
        <Spinner className="h-4 w-4" /> Laster selskaper…
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <p className="text-sm text-gray-600">
        Ingen selskaper tilgjengelig ennå.
      </p>
    );
  }

  const matching = region
    ? withoutDistance.filter((c) => c.region.some((r) => r.toLowerCase() === region))
    : [];
  const matchingIds = new Set(matching.map((c) => c.id));
  const otherFallback =
    matching.length > 0 ? withoutDistance.filter((c) => !matchingIds.has(c.id)) : withoutDistance;

  const nearestVisible = showAllNearest ? withDistance : withDistance.slice(0, NEAREST_SHOWN);
  const nearestHidden = withDistance.length - nearestVisible.length;

  const renderCompany = (c: SortedCompany) => (
    <label
      key={c.id}
      className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors ${
        selected.includes(c.id)
          ? "border-blue-500 bg-blue-50"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <input
        type="checkbox"
        checked={selected.includes(c.id)}
        onChange={() => toggle(c.id)}
        className="h-4 w-4 rounded border-gray-300 text-blue-600"
      />
      <span className="flex-1">
        <span className="block font-medium">{c.name}</span>
        {c.distanceKm !== null && (
          <span className="text-xs text-gray-500">
            {Math.round(c.distanceKm)} km fra hentested
            {c.nearestBase?.label ? ` (${c.nearestBase.label})` : ""}
          </span>
        )}
      </span>
    </label>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Velg selskaper å sende forespørsel til
        </h3>
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          {selected.length === companies.length
            ? "Fjern alle"
            : "Velg alle"}
        </button>
      </div>

      {withDistance.length > 0 && (
        <>
          <p className="flex items-center gap-1 text-xs font-medium text-green-700">
            <MapPin className="h-3.5 w-3.5" /> Nærmest hentestedet
          </p>
          <div className="grid gap-2 sm:grid-cols-2">{nearestVisible.map(renderCompany)}</div>
          {nearestHidden > 0 && (
            <button
              type="button"
              onClick={() => setShowAllNearest(true)}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              + {nearestHidden} flere
            </button>
          )}
        </>
      )}

      {matching.length > 0 && (
        <>
          <p className="flex items-center gap-1 pt-2 text-xs font-medium text-green-700">
            <MapPin className="h-3.5 w-3.5" /> Dekker sannsynligvis ditt område
          </p>
          <div className="grid gap-2 sm:grid-cols-2">{matching.map(renderCompany)}</div>
        </>
      )}

      {otherFallback.length > 0 && (
        <>
          <p className="pt-2 text-xs font-medium text-gray-500">
            {withDistance.length > 0 || matching.length > 0 ? "Andre selskaper" : "Alle selskaper"}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">{otherFallback.map(renderCompany)}</div>
        </>
      )}
    </div>
  );
}

