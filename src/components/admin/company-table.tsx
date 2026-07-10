"use client";

import { useEffect, useState, useCallback } from "react";
import { useAdminAuth } from "@/hooks/use-admin-auth";

interface CompanyRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  region: string[];
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
}

const EMPTY_FORM: CompanyFormData = { name: "", email: "", phone: "", region: "" };

export function CompanyTable() {
  const { idToken } = useAdminAuth();
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CompanyFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

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
    setSaving(true);
    const regionArr = form.region
      .split(",")
      .map((r) => r.trim().toLowerCase())
      .filter(Boolean);

    if (editId) {
      await fetch("/api/admin/companies", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: editId, name: form.name, email: form.email, phone: form.phone, region: regionArr }),
      });
    } else {
      await fetch("/api/admin/companies", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, phone: form.phone, region: regionArr }),
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
    await fetch("/api/admin/companies", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ id, disabled }),
    });
    fetchCompanies();
  };

  const startEdit = (c: CompanyRow) => {
    setEditId(c.id);
    setForm({ name: c.name, email: c.email, phone: c.phone, region: c.region.join(", ") });
    setShowForm(true);
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => { setEditId(null); setForm(EMPTY_FORM); setShowForm(true); }}
          className="rounded-md bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#2a4f7f]"
        >
          + Legg til selskap
        </button>
        <button onClick={fetchCompanies} className="rounded-md bg-gray-200 px-3 py-2 text-sm hover:bg-gray-300">
          Oppdater
        </button>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold">{editId ? "Rediger selskap" : "Nytt selskap"}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <input placeholder="Navn" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-md border px-3 py-2 text-sm" />
            <input placeholder="E-post" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="rounded-md border px-3 py-2 text-sm" />
            <input placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="rounded-md border px-3 py-2 text-sm" />
            <input placeholder="Regioner (komma-separert)" value={form.region}
              onChange={(e) => setForm({ ...form, region: e.target.value })}
              className="rounded-md border px-3 py-2 text-sm" />
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={handleSave} disabled={saving || !form.name || !form.email}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
              {saving ? "Lagrer..." : "Lagre"}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); }}
              className="rounded-md bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300">Avbryt</button>
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
                      className={`text-xs ${c.disabled ? "text-green-600" : "text-red-600"} hover:underline`}>
                      {c.disabled ? "Aktiver" : "Deaktiver"}
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

