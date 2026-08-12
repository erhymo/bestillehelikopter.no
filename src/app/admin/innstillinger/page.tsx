"use client";

import { useEffect, useState, useCallback } from "react";
import { useAdminAuth } from "@/hooks/use-admin-auth";

export default function AdminInnstillingerPage() {
  const { idToken } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!idToken) return;
    setLoading(true);
    const res = await fetch("/api/admin/settings", {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    const data = await res.json();
    if (data.ok && data.company) setEmail(data.company.email ?? "");
    setLoading(false);
  }, [idToken]);

  useEffect(() => {
    // Intentional fetch-on-mount; no data-fetching library in use.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    if (!idToken) return;
    setSaving(true);
    setSaved(false);
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setSaving(false);
    setSaved(true);
  };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-brand-700">Innstillinger</h1>
      <div className="max-w-md rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Mottaker-e-post</h2>
        <p className="mb-3 text-xs text-gray-600">
          Alle forespørsler sendes til denne adressen.
        </p>
        {loading ? (
          <p className="text-sm text-gray-600">Laster...</p>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setSaved(false); }}
              placeholder="f.eks. post@airlift.no"
              className="flex-1 rounded-lg border px-3 py-2 text-sm"
            />
            <button
              onClick={handleSave}
              disabled={saving || !email.trim()}
              className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {saving ? "Lagrer..." : "Lagre"}
            </button>
          </div>
        )}
        {saved && <p className="mt-2 text-xs text-green-700">Lagret.</p>}
      </div>
    </div>
  );
}
