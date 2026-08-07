"use client";

import { useEffect, useState, useCallback } from "react";
import { X } from "lucide-react";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { parseCoordinateInput, formatCoordinate } from "@/lib/coordinates";
import type { BaseLocation } from "@/types";

interface CompanyRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  region: string[];
  baseLocations: BaseLocation[];
  disabled: boolean;
  avgRating: number;
  ratingCount: number;
  createdAt: string;
}

interface BaseDraft {
  label: string;
  coord: string;
}

interface CompanyFormData {
  name: string;
  email: string;
  phone: string;
  region: string;
  bases: BaseDraft[];
}

const EMPTY_BASE: BaseDraft = { label: "", coord: "" };
const EMPTY_FORM: CompanyFormData = { name: "", email: "", phone: "", region: "", bases: [] };

export function CompanyTable() {
  const { idToken } = useAdminAuth();
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CompanyFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [baseError, setBaseError] = useState<string | null>(null);

  const fetchCompanies = useCallback(async () => {
    if (!idToken) return;
    setLoading(true);
    const res = await fetch("/api/admin/companies", {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    const data = await res.json();
    if (data.ok) setCompanies(data.companies);
    setLoading(false);
  }, [idToken]);

  useEffect(() => {
    // Intentional fetch-on-mount; no data-fetching library in use.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCompanies();
  }, [fetchCompanies]);

  const addBaseRow = () => setForm((f) => ({ ...f, bases: [...f.bases, { ...EMPTY_BASE }] }));
  const removeBaseRow = (i: number) =>
    setForm((f) => ({ ...f, bases: f.bases.filter((_, idx) => idx !== i) }));
  const updateBaseRow = (i: number, field: keyof BaseDraft, value: string) =>
    setForm((f) => ({
      ...f,
      bases: f.bases.map((b, idx) => (idx === i ? { ...b, [field]: value } : b)),
    }));

  const handleSave = async () => {
    if (!idToken) return;
    setBaseError(null);

    const baseLocations: BaseLocation[] = [];
    for (const b of form.bases) {
      if (!b.coord.trim()) continue;
      const parsed = parseCoordinateInput(b.coord);
      if (!parsed) {
        setBaseError(`Ugyldig koordinat for "${b.label || "base"}": skriv f.eks. 60.472024, 5.322054.`);
        return;
      }
      baseLocations.push({ ...parsed, ...(b.label.trim() ? { label: b.label.trim() } : {}) });
    }

    setSaving(true);
    const regionArr = form.region
      .split(",")
      .map((r) => r.trim().toLowerCase())
      .filter(Boolean);

    if (editId) {
      await fetch("/api/admin/companies", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editId,
          name: form.name,
          email: form.email,
          phone: form.phone,
          region: regionArr,
          baseLocations,
        }),
      });
    } else {
      await fetch("/api/admin/companies", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          region: regionArr,
          baseLocations,
        }),
      });
    }
    setShowForm(false);
    setEditId(null);
    setForm(EMPTY_FORM);
    setSaving(false);
    fetchCompanies();
  };

  const handleToggle = async (id: string, disabled: boolean) => {
    if (!idToken) return;
    setTogglingId(id);
    await fetch("/api/admin/companies", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ id, disabled }),
    });
    await fetchCompanies();
    setTogglingId(null);
  };

  const startEdit = (c: CompanyRow) => {
    setEditId(c.id);
    setForm({
      name: c.name,
      email: c.email,
      phone: c.phone,
      region: c.region.join(", "),
      bases: c.baseLocations.map((b) => ({ label: b.label ?? "", coord: formatCoordinate(b) })),
    });
    setBaseError(null);
    setShowForm(true);
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => { setEditId(null); setForm(EMPTY_FORM); setBaseError(null); setShowForm(true); }}
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          + Legg til selskap
        </button>
        <button onClick={fetchCompanies} className="rounded-lg bg-gray-200 px-3 py-2 text-sm hover:bg-gray-300">
          Oppdater
        </button>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold">{editId ? "Rediger selskap" : "Nytt selskap"}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <input placeholder="Navn" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-lg border px-3 py-2 text-sm" />
            <input placeholder="E-post" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="rounded-lg border px-3 py-2 text-sm" />
            <input placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="rounded-lg border px-3 py-2 text-sm" />
            <input placeholder="Regioner (komma-separert)" value={form.region}
              onChange={(e) => setForm({ ...form, region: e.target.value })}
              className="rounded-lg border px-3 py-2 text-sm" />
          </div>

          <div className="mt-3">
            <p className="mb-1.5 text-xs font-medium text-gray-700">
              Baser (avstand til hentested regnes fra nærmeste)
            </p>
            <div className="space-y-2">
              {form.bases.map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    placeholder="Stedsnavn (valgfritt), f.eks. Bergen"
                    value={b.label}
                    onChange={(e) => updateBaseRow(i, "label", e.target.value)}
                    className="w-48 rounded-lg border px-3 py-2 text-sm"
                  />
                  <input
                    placeholder="Koordinat, f.eks. 60.47, 5.32"
                    value={b.coord}
                    onChange={(e) => { updateBaseRow(i, "coord", e.target.value); setBaseError(null); }}
                    className="flex-1 rounded-lg border px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeBaseRow(i)}
                    className="text-red-500 hover:text-red-700"
                    title="Fjern base"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            {baseError && <p className="mt-1 text-xs text-red-600">{baseError}</p>}
            <button
              type="button"
              onClick={addBaseRow}
              className="mt-2 text-xs text-blue-600 hover:text-blue-800"
            >
              + Legg til base
            </button>
          </div>

          <div className="mt-3 flex gap-2">
            <button onClick={handleSave} disabled={saving || !form.name || !form.email}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
              {saving ? "Lagrer..." : "Lagre"}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); setBaseError(null); }}
              className="rounded-lg bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300">Avbryt</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-600">Laster selskaper...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Navn</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">E-post</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Telefon</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Regioner</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Baser</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">Rating</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">Status</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">Handlinger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {companies.map((c) => (
                <tr key={c.id} className={c.disabled ? "bg-red-50" : ""}>
                  <td className="px-3 py-2 font-medium">{c.name}</td>
                  <td className="px-3 py-2">{c.email}</td>
                  <td className="px-3 py-2">{c.phone}</td>
                  <td className="px-3 py-2">{c.region.join(", ")}</td>
                  <td className="px-3 py-2 text-gray-600">
                    {c.baseLocations.length === 0
                      ? "—"
                      : c.baseLocations.length === 1
                        ? (c.baseLocations[0]!.label ?? formatCoordinate(c.baseLocations[0]!))
                        : `${c.baseLocations.length} baser`}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {c.avgRating > 0 ? `${c.avgRating} (${c.ratingCount})` : "—"}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.disabled ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                    }`}>
                      {c.disabled ? "Deaktivert" : "Aktiv"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => startEdit(c)}
                      className="mr-2 text-xs text-blue-600 hover:underline">Rediger</button>
                    <button onClick={() => handleToggle(c.id, !c.disabled)}
                      disabled={togglingId === c.id}
                      className={`text-xs ${c.disabled ? "text-green-600" : "text-red-600"} hover:underline disabled:opacity-50 disabled:no-underline`}>
                      {togglingId === c.id ? "…" : c.disabled ? "Aktiver" : "Deaktiver"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
