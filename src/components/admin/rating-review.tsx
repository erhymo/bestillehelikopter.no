"use client";

import { useEffect, useState, useCallback } from "react";
import { useAdminAuth } from "@/hooks/use-admin-auth";

interface RatingRow {
  id: string;
  jobId: string;
  companyId: string;
  score: number;
  comment: string;
  approved: boolean;
  createdAt: string;
}

export function RatingReview() {
  const { idToken } = useAdminAuth();
  const [ratings, setRatings] = useState<RatingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyPending, setOnlyPending] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchRatings = useCallback(async () => {
    if (!idToken) return;
    setLoading(true);
    const params = onlyPending ? "?pending=true" : "";
    const res = await fetch(`/api/admin/ratings${params}`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    const data = await res.json();
    if (data.ok) setRatings(data.ratings);
    setLoading(false);
  }, [idToken, onlyPending]);

  useEffect(() => {
    // Intentional fetch-on-mount/filter-change; no data-fetching library in use.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRatings();
  }, [fetchRatings]);

  const handleModerate = async (id: string, approved: boolean) => {
    if (!idToken) return;
    setUpdating(id);
    const res = await fetch("/api/admin/ratings", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id, approved }),
    });
    if (res.ok) {
      setRatings((prev) => prev.map((r) => (r.id === id ? { ...r, approved } : r)));
    }
    setUpdating(null);
  };

  const stars = (n: number) => "⭐".repeat(n) + "☆".repeat(5 - n);

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            checked={onlyPending}
            onChange={(e) => setOnlyPending(e.target.checked)}
            className="rounded"
          />
          Kun ventende
        </label>
        <button onClick={fetchRatings} className="rounded-md bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300">
          Oppdater
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-600">Laster vurderinger...</p>
      ) : ratings.length === 0 ? (
        <p className="text-sm text-gray-600">Ingen vurderinger å vise.</p>
      ) : (
        <div className="space-y-3">
          {ratings.map((r) => (
            <div key={r.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <span className="text-sm">{stars(r.score)}</span>
                  <span className="ml-2 text-xs text-gray-600">
                    Selskap: {r.companyId.slice(0, 8)}… | Jobb: {r.jobId.slice(0, 8)}…
                  </span>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  r.approved ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                }`}>
                  {r.approved ? "Godkjent" : "Venter"}
                </span>
              </div>
              {r.comment && <p className="mb-3 text-sm text-gray-700">{r.comment}</p>}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">
                  {r.createdAt ? new Date(r.createdAt).toLocaleDateString("nb-NO") : ""}
                </span>
                <div className="flex gap-2">
                  {!r.approved && (
                    <button
                      onClick={() => handleModerate(r.id, true)}
                      disabled={updating === r.id}
                      className="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      Godkjenn
                    </button>
                  )}
                  {r.approved && (
                    <button
                      onClick={() => handleModerate(r.id, false)}
                      disabled={updating === r.id}
                      className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Avvis
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

