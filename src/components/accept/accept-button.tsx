"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useAnalytics } from "@/hooks/use-analytics";

interface AcceptButtonProps {
  token: string;
  companyName?: string;
}

export function AcceptButton({ token, companyName }: AcceptButtonProps) {
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { trackFunnel } = useAnalytics("customer_accept");
  const company = companyName || "Selskapet";

  async function handleAccept() {
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Noe gikk galt");
        return;
      }

      trackFunnel("accept_confirmed");
      setAccepted(true);
    } catch {
      setError("Kunne ikke akseptere tilbudet. Prøv igjen.");
    } finally {
      setSubmitting(false);
    }
  }

  if (accepted) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-green-600" />
        <h2 className="mb-2 text-lg font-bold text-green-800">
          Tilbudet er akseptert!
        </h2>
        <p className="text-sm text-green-700">
          {company} har fått beskjed, og kommer tilbake til deg med forslag
          til tidspunkt for gjennomføring av oppdraget. Du vil også motta en
          bekreftelse på e-post.
        </p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        onClick={handleAccept}
        disabled={submitting}
        className="w-full rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Aksepterer…" : "Aksepter tilbud"}
      </button>

      <p className="mt-4 text-center text-xs text-gray-600">
        Ved å akseptere gir du selskapet tilgang til din kontaktinformasjon.
      </p>
    </div>
  );
}

