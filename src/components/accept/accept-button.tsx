"use client";

import { useState } from "react";
import { useAnalytics } from "@/hooks/use-analytics";

interface AcceptButtonProps {
  token: string;
}

export function AcceptButton({ token }: AcceptButtonProps) {
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const { trackFunnel } = useAnalytics("customer_accept");

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
      setShowConfirm(false);
    }
  }

  if (accepted) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
        <div className="mb-3 text-4xl">✅</div>
        <h2 className="mb-2 text-lg font-bold text-green-800">
          Tilbudet er akseptert!
        </h2>
        <p className="text-sm text-green-700">
          Selskapet har fått beskjed og vil kontakte deg for å avtale videre
          detaljer. Du vil også motta en bekreftelse på e-post.
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

      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="w-full rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-green-700"
        >
          Aksepter tilbud
        </button>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <strong>Er du sikker?</strong> Når du aksepterer kan det ikke angres.
            Andre tilbud vil bli lukket.
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirm(false)}
              disabled={submitting}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Avbryt
            </button>
            <button
              onClick={handleAccept}
              disabled={submitting}
              className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Aksepterer…" : "Ja, aksepter"}
            </button>
          </div>
        </div>
      )}

      <p className="mt-4 text-center text-xs text-gray-600">
        Ved å akseptere gir du selskapet tilgang til din kontaktinformasjon.
      </p>
    </div>
  );
}

