"use client";

import { useEffect, useState, useCallback } from "react";
import { useAdminAuth } from "@/hooks/use-admin-auth";

interface OfferRow {
  id: string;
  companyId: string;
  status: string;
  price: number | null;
  emailOpens: number;
  linkClicks: number;
  sentAt: string | null;
  viewedAt: string | null;
  repliedAt: string | null;
}

interface JobRow {
  id: string;
  status: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  pickup: string;
  dropCount: number;
  totalFlightTimeMin: number;
  selectedCompanyIds: string[];
  acceptedCompanyId: string | null;
  createdAt: string;
  acceptedAt: string | null;
  offers: OfferRow[];
}

const STATUS_BADGE: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-800",
  closed: "bg-yellow-100 text-yellow-800",
  deleted: "bg-red-100 text-red-800",
};

export function JobTable() {
  const { idToken } = useAdminAuth();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    if (!idToken) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/admin/jobs?${params}`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    const data = await res.json();
    if (data.ok) setJobs(data.jobs);
    setLoading(false);
  }, [idToken, statusFilter]);

  useEffect(() => {
    // Intentional fetch-on-mount/filter-change; no data-fetching library in use.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchJobs();
  }, [fetchJobs]);

  return (
    <div>
      {/* Filter */}
      <div className="mb-4 flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">Status:</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">Alle</option>
          <option value="open">Åpen</option>
          <option value="accepted">Akseptert</option>
          <option value="completed">Fullført</option>
          <option value="closed">Lukket</option>
          <option value="deleted">Slettet</option>
        </select>
        <button onClick={fetchJobs} className="ml-2 rounded-md bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300">
          Oppdater
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-600">Laster jobber...</p>
      ) : jobs.length === 0 ? (
        <p className="text-sm text-gray-600">Ingen jobber funnet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Kunde</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Hentested</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">Stopp</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">Flymin</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">Tilbud</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Opprettet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {jobs.map((job) => (
                <>
                  <tr
                    key={job.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                  >
                    <td className="px-3 py-2">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[job.status] ?? "bg-gray-100"}`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">{job.customerName}</td>
                    <td className="max-w-[200px] truncate px-3 py-2">{job.pickup}</td>
                    <td className="px-3 py-2 text-right">{job.dropCount}</td>
                    <td className="px-3 py-2 text-right">{job.totalFlightTimeMin}</td>
                    <td className="px-3 py-2 text-right">{job.offers.length}</td>
                    <td className="px-3 py-2">{job.createdAt ? new Date(job.createdAt).toLocaleDateString("nb-NO") : ""}</td>
                  </tr>
                  {expandedJob === job.id && (
                    <tr key={`${job.id}-detail`}>
                      <td colSpan={7} className="bg-gray-50 px-4 py-3">
                        <div className="grid gap-2 text-xs">
                          <p><strong>E-post:</strong> {job.customerEmail} | <strong>Tlf:</strong> {job.customerPhone}</p>
                          {job.acceptedAt && <p><strong>Akseptert:</strong> {new Date(job.acceptedAt).toLocaleDateString("nb-NO")}</p>}
                          {job.offers.length > 0 && (
                            <div className="mt-1">
                              <p className="mb-1 font-medium">Tilbud:</p>
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b">
                                    <th className="py-1 text-left">Selskap</th>
                                    <th className="py-1 text-left">Status</th>
                                    <th className="py-1 text-right">Pris</th>
                                    <th className="py-1 text-right">📧 Åpnet</th>
                                    <th className="py-1 text-right">🔗 Klikk</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {job.offers.map((o) => (
                                    <tr key={o.id} className="border-b border-gray-100">
                                      <td className="py-1">{o.companyId.slice(0, 8)}…</td>
                                      <td className="py-1">{o.status}</td>
                                      <td className="py-1 text-right">{o.price ? `${o.price.toLocaleString("nb-NO")} kr` : "—"}</td>
                                      <td className="py-1 text-right">{o.emailOpens}</td>
                                      <td className="py-1 text-right">{o.linkClicks}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

