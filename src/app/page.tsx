import Link from "next/link";
import { RfqForm } from "@/components/rfq/rfq-form";
import { trackServerPageView } from "@/lib/analytics-server";

export default function Home() {
  trackServerPageView("customer_form");
  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          🚁 Få tilbud på helikoptertransport
        </h1>
        <p className="mt-1 text-gray-600">
          Beskriv oppdraget ditt — vi finner riktig selskap for jobben.
        </p>
      </header>

      {/* Slik fungerer det */}
      <section className="mb-10 rounded-lg border border-gray-200 bg-gray-50 p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Slik fungerer det</h2>
        <ol className="space-y-3 text-sm text-gray-700">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1e3a5f] text-xs font-bold text-white">1</span>
            <span><strong>Beskriv oppdraget</strong> — Marker hentested og leveringspunkt(er) i kartet. Legg til last og ønsket dato.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1e3a5f] text-xs font-bold text-white">2</span>
            <span><strong>Motta tilbud</strong> — Et helikopterselskap vurderer forespørselen og sender deg et uforpliktende pristilbud på e-post.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1e3a5f] text-xs font-bold text-white">3</span>
            <span><strong>Aksepter eller avslå</strong> — Gjennomgå tilbudet og aksepter direkte fra e-posten. Selskapet kontakter deg for å avtale detaljer.</span>
          </li>
        </ol>
      </section>

      <RfqForm />

      {/* Footer med juridiske lenker */}
      <footer className="mt-12 border-t border-gray-200 pt-6 pb-8 text-center text-xs text-gray-600">
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/vilkar" className="hover:text-gray-700 hover:underline">Vilkår for bruk</Link>
          <Link href="/personvern" className="hover:text-gray-700 hover:underline">Personvernerklæring</Link>
          <Link href="/ansvarsfraskrivelse" className="hover:text-gray-700 hover:underline">Ansvarsfraskrivelse</Link>
        </div>
        <p className="mt-2">© {new Date().getFullYear()} BestilleHelikopter.no</p>
      </footer>
    </main>
  );
}
