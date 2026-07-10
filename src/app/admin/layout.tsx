"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "@/hooks/use-admin-auth";

const NAV_ITEMS = [
  { href: "/admin", label: "Oversikt", icon: "📊" },
  { href: "/admin/jobber", label: "Jobber", icon: "📋" },
  { href: "/admin/selskaper", label: "Selskaper", icon: "🏢" },
  { href: "/admin/vurderinger", label: "Vurderinger", icon: "⭐" },
  { href: "/admin/statistikk", label: "Statistikk", icon: "📈" },
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
          <h1 className="mb-2 text-xl font-bold text-[#1e3a5f]">Admin</h1>
          <p className="mb-6 text-sm text-gray-600">Logg inn for å fortsette</p>
          <button
            onClick={signIn}
            className="w-full rounded-md bg-[#1e3a5f] px-4 py-3 font-semibold text-white transition-colors hover:bg-[#2a4f7f]"
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
            className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
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
          <h1 className="text-lg font-bold text-[#1e3a5f]">🚁 Admin</h1>
        </div>
        <nav className="flex flex-col gap-1 p-2">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[#1e3a5f] text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-gray-200 p-3">
          <p className="mb-1 truncate text-xs text-gray-600">{user.email}</p>
          <button
            onClick={signOut}
            className="w-full rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
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

