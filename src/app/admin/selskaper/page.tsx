"use client";

import { CompanyTable } from "@/components/admin/company-table";

export default function AdminSelskaperPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-[#1e3a5f]">Selskaper</h1>
      <CompanyTable />
    </div>
  );
}

