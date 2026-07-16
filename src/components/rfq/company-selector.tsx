"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Spinner } from "@/components/ui/spinner";

interface CompanyOption {
  id: string;
  name: string;
  region: string[];
}

interface CompanySelectorProps {
  selected: string[];
  onChange: (ids: string[]) => void;
  /** Lowercase fylke name detected from the pickup point, if any. */
  region?: string | null;
}

export function CompanySelector({ selected, onChange, region }: CompanySelectorProps) {
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(collection(db, "companies"));
        const list: CompanyOption[] = [];
        snap.forEach((doc) => {
          const data = doc.data();
          if (data.active !== false) {
            list.push({
              id: doc.id,
              name: data.name ?? doc.id,
              region: Array.isArray(data.region) ? data.region : [],
            });
          }
        });
        list.sort((a, b) => a.name.localeCompare(b.name, "no"));
        setCompanies(list);
      } catch {
        // Silently fail — companies can be empty in dev
        setCompanies([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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
    ? companies.filter((c) => c.region.some((r) => r.toLowerCase() === region))
    : [];
  const matchingIds = new Set(matching.map((c) => c.id));
  const others = matching.length > 0 ? companies.filter((c) => !matchingIds.has(c.id)) : companies;

  const renderCompany = (c: CompanyOption) => (
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
      <span className="font-medium">{c.name}</span>
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

      {matching.length > 0 ? (
        <>
          <p className="text-xs font-medium text-green-700">
            📍 Dekker sannsynligvis ditt område
          </p>
          <div className="grid gap-2 sm:grid-cols-2">{matching.map(renderCompany)}</div>
          <p className="pt-2 text-xs font-medium text-gray-500">Andre selskaper</p>
          <div className="grid gap-2 sm:grid-cols-2">{others.map(renderCompany)}</div>
        </>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">{others.map(renderCompany)}</div>
      )}
    </div>
  );
}

