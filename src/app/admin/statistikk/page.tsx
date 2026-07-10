"use client";

import { StatsCharts } from "@/components/admin/stats-charts";

export default function AdminStatistikkPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-[#1e3a5f]">Statistikk</h1>
      <StatsCharts />
    </div>
  );
}

