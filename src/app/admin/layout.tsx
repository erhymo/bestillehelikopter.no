"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { HelicopterIcon } from "@/components/ui/logo";
import {
  LayoutDashboard,
  ClipboardList,
  Building2,
  Star,
  TrendingUp,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "Oversikt", icon: LayoutDashboard },
  { href: "/admin/jobber", label: "Jobber", icon: ClipboardList },
  { href: "/admin/selskaper", label: "Selskaper", icon: Building2 },
  { href: "/admin/vurderinger", label: "Vurderinger", icon: Star },
  { href: "/admin/statistikk", label: "Statistikk", icon: TrendingUp },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isAdmin, signIn, signOut } = useAdminAuth();
  const pathname = usePathname();

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-600">Laster...</p>
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="w-full max-w-sm rounded-lg bg-white p-8 text-center shadow-lg">
          <h1 className="mb-2 text-xl font-bold text-brand-700">Admin</h1>
          <p className="mb-6 text-sm text-gray-600">Logg inn for å fortsette</p>
          <button
            onClick={signIn}
            className="w-full rounded-lg bg-brand-700 px-4 py-3 font-semibold text-white transition-colors hover:bg-brand-600"
          >
            Logg inn med Google
          </button>
        </div>
      </div>
    );
  }

  // Signed in but not admin
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="w-full max-w-sm rounded-lg bg-white p-8 text-center shadow-lg">
          <h1 className="mb-2 text-xl font-bold text-red-600">Ingen tilgang</h1>
          <p className="mb-4 text-sm text-gray-600">
            {user.email} har ikke admin-rettigheter.
          </p>
          <button
            onClick={signOut}
            className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
          >
            Logg ut
          </button>
        </div>
      </div>
    );
  }

  // Admin UI
  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-4">
          <h1 className="flex items-center gap-2 text-lg font-bold text-brand-700">
            <HelicopterIcon className="h-5 w-5" /> Admin
          </h1>
        </div>
        <nav className="flex flex-col gap-1 p-2">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand-700 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-gray-200 p-3">
          <p className="mb-1 truncate text-xs text-gray-600">{user.email}</p>
          <button
            onClick={signOut}
            className="w-full rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
          >
            Logg ut
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}

