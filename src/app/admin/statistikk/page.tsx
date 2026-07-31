"use client";

import { StatsCharts } from "@/components/admin/stats-charts";

export default function AdminStatistikkPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-brand-700">Statistikk</h1>
      <StatsCharts />
    </div>
  );
}

