"use client";

import { useEffect, useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";
import { useAdminAuth } from "@/hooks/use-admin-auth";

export default function AdminInnstillingerPage() {
  const { idToken } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [dashboardKey, setDashboardKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!idToken) return;
    setLoading(true);
    const res = await fetch("/api/admin/settings", {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    const data = await res.json();
    if (data.ok && data.company) {
      setEmail(data.company.email ?? "");
      setDashboardKey(data.company.dashboardKey ?? null);
    }
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

  const handleRegenerateKey = async () => {
    if (!idToken) return;
    if (
      dashboardKey &&
      !window.confirm(
        "Den gamle oversiktslenken slutter å virke med en gang. Fortsette?",
      )
    ) {
      return;
    }
    setRegenerating(true);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ regenerateDashboardKey: true }),
    });
    const data = await res.json();
    if (data.ok) setDashboardKey(data.dashboardKey);
    setRegenerating(false);
  };

  const dashboardUrl =
    dashboardKey && typeof window !== "undefined"
      ? `${window.location.origin}/oversikt/${dashboardKey}`
      : null;

  const handleCopy = async () => {
    if (!dashboardUrl) return;
    await navigator.clipboard.writeText(dashboardUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-700">Innstillinger</h1>

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

      <div className="max-w-md rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Oversiktslenke</h2>
        <p className="mb-3 text-xs text-gray-600">
          Send denne lenken til Airlift én gang — alle hos dem kan bokmerke den
          for å se alle åpne forespørsler på ett sted. Ingen innlogging kreves.
        </p>
        {loading ? (
          <p className="text-sm text-gray-600">Laster...</p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={dashboardUrl ?? ""}
                onClick={(e) => e.currentTarget.select()}
                className="flex-1 rounded-lg border bg-gray-50 px-3 py-2 text-sm text-gray-700"
              />
              <button
                onClick={handleCopy}
                disabled={!dashboardUrl}
                title="Kopier lenke"
                className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <button
              onClick={handleRegenerateKey}
              disabled={regenerating}
              className="mt-3 text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
            >
              {regenerating ? "Genererer..." : "Generer ny lenke (den gamle slutter å virke)"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
