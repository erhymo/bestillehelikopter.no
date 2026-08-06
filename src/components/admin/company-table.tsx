"use client";

import { useEffect, useState, useCallback } from "react";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { parseCoordinateInput, formatCoordinate } from "@/lib/coordinates";

interface CompanyRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  region: string[];
  baseLocation: { lat: number; lng: number } | null;
  disabled: boolean;
  avgRating: number;
  ratingCount: number;
  createdAt: string;
}

interface CompanyFormData {
  name: string;
  email: string;
  phone: string;
  region: string;
  base: string;
}

const EMPTY_FORM: CompanyFormData = { name: "", email: "", phone: "", region: "", base: "" };

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

  const handleSave = async () => {
    if (!idToken) return;
    setBaseError(null);

    let baseLocation: { lat: number; lng: number } | null = null;
    if (form.base.trim()) {
      const parsed = parseCoordinateInput(form.base);
      if (!parsed) {
        setBaseError("Skriv inn f.eks. 60.472024, 5.322054 eller lim inn en Google Maps-lenke.");
        return;
      }
      baseLocation = parsed;
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
          baseLocation,
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
          baseLocation,
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
      base: c.baseLocation ? formatCoordinate(c.baseLocation) : "",
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
            <div>
              <input placeholder="Base (koordinat, f.eks. 60.47, 5.32)" value={form.base}
                onChange={(e) => { setForm({ ...form, base: e.target.value }); setBaseError(null); }}
                className="w-full rounded-lg border px-3 py-2 text-sm" />
              {baseError && <p className="mt-1 text-xs text-red-600">{baseError}</p>}
            </div>
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
                <th className="px-3 py-2 text-left font-medium text-gray-600">Base</th>
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
                    {c.baseLocation ? formatCoordinate(c.baseLocation) : "—"}
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

