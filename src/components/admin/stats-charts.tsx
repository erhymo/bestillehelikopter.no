"use client";

import { useEffect, useState, useCallback } from "react";
import { useAdminAuth } from "@/hooks/use-admin-auth";

interface MonthRow {
  month: string;
  rfq: number;
  offersSent: number;
  offersReceived: number;
  accepted: number;
  completed: number;
}

interface CompanyStatRow {
  companyId: string;
  avgResponseTimeH: number;
  offerCount: number;
}

interface Totals {
  rfq: number;
  offersSent: number;
  offersReceived: number;
  accepted: number;
  completed: number;
}

interface AnalyticsMonthRow {
  month: string;
  pageViews: Record<string, number>;
  funnelSteps: Record<string, number>;
  uniqueSessions: number;
}

interface TodayAnalytics {
  date: string;
  pageViews: Record<string, number>;
  funnelSteps: Record<string, number>;
}

export function StatsCharts() {
  const { idToken } = useAdminAuth();
  const [totals, setTotals] = useState<Totals | null>(null);
  const [monthly, setMonthly] = useState<MonthRow[]>([]);
  const [companyStats, setCompanyStats] = useState<CompanyStatRow[]>([]);
  const [analyticsMonthly, setAnalyticsMonthly] = useState<AnalyticsMonthRow[]>([]);
  const [todayAnalytics, setTodayAnalytics] = useState<TodayAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!idToken) return;
    setLoading(true);
    const res = await fetch("/api/admin/stats", {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    const data = await res.json();
    if (data.ok) {
      setTotals(data.totals);
      setMonthly(data.monthly);
      setCompanyStats(data.companyStats);
      setAnalyticsMonthly(data.analyticsMonthly ?? []);
      setTodayAnalytics(data.todayAnalytics ?? null);
    }
    setLoading(false);
  }, [idToken]);

  useEffect(() => {
    // Intentional fetch-on-mount; no data-fetching library in use.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStats();
  }, [fetchStats]);

  if (loading) return <p className="text-sm text-gray-600">Laster statistikk...</p>;

  return (
    <div className="space-y-6">
      {/* Totals */}
      {totals && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: "Forespørsler", value: totals.rfq },
            { label: "Tilbud sendt", value: totals.offersSent },
            { label: "Tilbud mottatt", value: totals.offersReceived },
            { label: "Akseptert", value: totals.accepted },
            { label: "Fullført", value: totals.completed },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-gray-200 bg-white p-4 text-center">
              <p className="text-2xl font-bold text-[#1e3a5f]">{s.value}</p>
              <p className="text-xs text-gray-600">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Monthly table */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">Per måned (siste 12 mnd)</h3>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Måned</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">RFQ</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">Sendt</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">Mottatt</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">Akseptert</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">Fullført</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {monthly.map((m) => (
                <tr key={m.month}>
                  <td className="px-3 py-2">{m.month}</td>
                  <td className="px-3 py-2 text-right">{m.rfq}</td>
                  <td className="px-3 py-2 text-right">{m.offersSent}</td>
                  <td className="px-3 py-2 text-right">{m.offersReceived}</td>
                  <td className="px-3 py-2 text-right">{m.accepted}</td>
                  <td className="px-3 py-2 text-right">{m.completed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Company response times */}
      {companyStats.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-700">Responstid per selskap</h3>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Selskap</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">Snitt responstid</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">Antall tilbud</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {companyStats.map((c) => (
                  <tr key={c.companyId}>
                    <td className="px-3 py-2">{c.companyId.slice(0, 12)}…</td>
                    <td className="px-3 py-2 text-right">{c.avgResponseTimeH} t</td>
                    <td className="px-3 py-2 text-right">{c.offerCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Today's analytics */}
      {todayAnalytics && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-700">📊 I dag ({todayAnalytics.date})</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(todayAnalytics.pageViews).map(([page, count]) => (
              <div key={page} className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-center">
                <p className="text-lg font-bold text-blue-800">{count}</p>
                <p className="text-xs text-blue-600">{page.replace(/_/g, " ")}</p>
              </div>
            ))}
          </div>
          {Object.keys(todayAnalytics.funnelSteps).length > 0 && (
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(todayAnalytics.funnelSteps).map(([step, count]) => (
                <div key={step} className="rounded-lg border border-green-100 bg-green-50 p-3 text-center">
                  <p className="text-lg font-bold text-green-800">{count}</p>
                  <p className="text-xs text-green-600">{step.replace(/_/g, " ")}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Monthly analytics */}
      {analyticsMonthly.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-700">📈 Sidevisninger per måned</h3>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Måned</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">Sesjoner</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">Kundeside</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">Kart</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">Tilbud</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">Aksept</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">Vurdering</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {analyticsMonthly.map((m) => (
                  <tr key={m.month}>
                    <td className="px-3 py-2">{m.month}</td>
                    <td className="px-3 py-2 text-right">{m.uniqueSessions}</td>
                    <td className="px-3 py-2 text-right">{m.pageViews.customer_form ?? 0}</td>
                    <td className="px-3 py-2 text-right">{m.pageViews.company_map ?? 0}</td>
                    <td className="px-3 py-2 text-right">{m.pageViews.company_offer ?? 0}</td>
                    <td className="px-3 py-2 text-right">{m.pageViews.customer_accept ?? 0}</td>
                    <td className="px-3 py-2 text-right">{m.pageViews.customer_rating ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

