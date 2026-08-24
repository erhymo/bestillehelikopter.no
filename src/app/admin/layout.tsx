"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { HelicopterIcon } from "@/components/ui/logo";
import {
  LayoutDashboard,
  ClipboardList,
  Settings,
  TrendingUp,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "Oversikt", icon: LayoutDashboard },
  { href: "/admin/jobber", label: "Jobber", icon: ClipboardList },
  { href: "/admin/innstillinger", label: "Innstillinger", icon: Settings },
  { href: "/admin/statistikk", label: "Statistikk", icon: TrendingUp },
];

function LoginForm() {
  const { signInError, signIn } = useAdminAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await signIn(username, password);
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg bg-white p-8 shadow-lg"
      >
        <h1 className="mb-2 text-center text-xl font-bold text-brand-700">Admin</h1>
        <p className="mb-6 text-center text-sm text-gray-600">Logg inn for å fortsette</p>

        <div className="space-y-3">
          <input
            type="text"
            autoFocus
            placeholder="Brukernavn"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700"
          />
          <input
            type="password"
            placeholder="Passord"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700"
          />
        </div>

        {signInError && (
          <p className="mt-3 text-sm text-red-600">{signInError}</p>
        )}

        <button
          type="submit"
          disabled={submitting || !username || !password}
          className="mt-4 w-full rounded-lg bg-brand-700 px-4 py-3 font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Logger inn..." : "Logg inn"}
        </button>
      </form>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, isAdmin, signOut } = useAdminAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-600">Laster...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return <LoginForm />;
  }

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
