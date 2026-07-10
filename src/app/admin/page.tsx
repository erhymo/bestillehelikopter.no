"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAdminAuth } from "@/hooks/use-admin-auth";

interface QuickStats {
  jobCount: number;
  openJobs: number;
  pendingRatings: number;
  companyCount: number;
}

export default function AdminPage() {
  const { idToken } = useAdminAuth();
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailForm, setEmailForm] = useState({ to: "", subject: "", text: "" });
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

  const fetchQuickStats = useCallback(async () => {
    if (!idToken) return;
    setLoading(true);

    const [jobsRes, ratingsRes, companiesRes] = await Promise.all([
      fetch("/api/admin/jobs?limit=200", { headers: { Authorization: `Bearer ${idToken}` } }),
      fetch("/api/admin/ratings?pending=true", { headers: { Authorization: `Bearer ${idToken}` } }),
      fetch("/api/admin/companies", { headers: { Authorization: `Bearer ${idToken}` } }),
    ]);

    const [jobsData, ratingsData, companiesData] = await Promise.all([
      jobsRes.json(),
      ratingsRes.json(),
      companiesRes.json(),
    ]);

    setStats({
      jobCount: jobsData.jobs?.length ?? 0,
      openJobs: jobsData.jobs?.filter((j: { status: string }) => j.status === "open").length ?? 0,
      pendingRatings: ratingsData.ratings?.length ?? 0,
      companyCount: companiesData.companies?.length ?? 0,
    });
    setLoading(false);
  }, [idToken]);

  useEffect(() => {
    // Intentional fetch-on-mount; no data-fetching library in use.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchQuickStats();
  }, [fetchQuickStats]);

  const handleSendEmail = async () => {
    if (!idToken) return;
    setEmailSending(true);
    setEmailStatus(null);
    const res = await fetch("/api/admin/email", {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(emailForm),
    });
    if (res.ok) {
      setEmailStatus("✅ E-post sendt!");
      setEmailForm({ to: "", subject: "", text: "" });
    } else {
      setEmailStatus("❌ Feil ved sending");
    }
    setEmailSending(false);
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[#1e3a5f]">Oversikt</h1>

      {loading ? (
        <p className="text-sm text-gray-600">Laster...</p>
      ) : stats ? (
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Link href="/admin/jobber" className="rounded-lg border bg-white p-4 text-center hover:shadow-md transition-shadow">
            <p className="text-3xl font-bold text-[#1e3a5f]">{stats.jobCount}</p>
            <p className="text-xs text-gray-600">Totalt jobber</p>
          </Link>
          <Link href="/admin/jobber?status=open" className="rounded-lg border bg-white p-4 text-center hover:shadow-md transition-shadow">
            <p className="text-3xl font-bold text-blue-600">{stats.openJobs}</p>
            <p className="text-xs text-gray-600">Åpne jobber</p>
          </Link>
          <Link href="/admin/vurderinger" className="rounded-lg border bg-white p-4 text-center hover:shadow-md transition-shadow">
            <p className="text-3xl font-bold text-yellow-600">{stats.pendingRatings}</p>
            <p className="text-xs text-gray-600">Ventende vurderinger</p>
          </Link>
          <Link href="/admin/selskaper" className="rounded-lg border bg-white p-4 text-center hover:shadow-md transition-shadow">
            <p className="text-3xl font-bold text-green-600">{stats.companyCount}</p>
            <p className="text-xs text-gray-600">Selskaper</p>
          </Link>
        </div>
      ) : null}

      {/* Send email to customer */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">📧 Send e-post til kunde</h2>
        <div className="grid gap-3">
          <input
            placeholder="Til (e-postadresse)"
            value={emailForm.to}
            onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })}
            className="rounded-md border px-3 py-2 text-sm"
          />
          <input
            placeholder="Emne"
            value={emailForm.subject}
            onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
            className="rounded-md border px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Melding"
            rows={4}
            value={emailForm.text}
            onChange={(e) => setEmailForm({ ...emailForm, text: e.target.value })}
            className="rounded-md border px-3 py-2 text-sm"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleSendEmail}
              disabled={emailSending || !emailForm.to || !emailForm.subject || !emailForm.text}
              className="rounded-md bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#2a4f7f] disabled:opacity-50"
            >
              {emailSending ? "Sender..." : "Send e-post"}
            </button>
            {emailStatus && <span className="text-sm">{emailStatus}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

