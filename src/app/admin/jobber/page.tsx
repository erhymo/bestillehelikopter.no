"use client";

import { JobTable } from "@/components/admin/job-table";

export default function AdminJobberPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-[#1e3a5f]">Jobber</h1>
      <JobTable />
    </div>
  );
}

