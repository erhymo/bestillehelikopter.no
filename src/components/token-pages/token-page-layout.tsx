import type { ReactNode } from "react";
import { Logo } from "@/components/ui/logo";

/**
 * Shared page shell for the token-gated pages (company offer, customer
 * accept, customer rating) — top-aligned with the same header treatment as
 * the main RFQ page, instead of each page centering a narrow card in an
 * otherwise empty viewport (reads as a mobile modal even on a wide desktop
 * screen).
 */
export function TokenPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Logo className="mb-8" iconClassName="h-6 w-6" />
        {children}
      </main>
    </div>
  );
}
