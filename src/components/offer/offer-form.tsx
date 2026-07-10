"use client";

import { useState, useRef } from "react";
import { useAnalytics } from "@/hooks/use-analytics";

interface OfferFormProps {
  token: string;
  companyName: string;
  totalFlightTimeMin: number;
  dropCount: number;
}

export function OfferForm({
  token,
  companyName,
  totalFlightTimeMin,
  dropCount,
}: OfferFormProps) {
  const [price, setPrice] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [hivRate, setHivRate] = useState("");
  const [comment, setComment] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { trackFunnel } = useAnalytics("company_offer");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const priceNum = Number(price);
    if (!priceNum || priceNum <= 0) {
      setError("Totalpris er påkrevd og må være positiv");
      return;
    }

    if (attachment && attachment.type !== "application/pdf") {
      setError("Kun PDF-filer er tillatt som vedlegg");
      return;
    }
    if (attachment && attachment.size > 5 * 1024 * 1024) {
      setError("Vedlegg kan ikke være større enn 5 MB");
      return;
    }

    setSubmitting(true);

    try {
      const jsonPayload: Record<string, unknown> = { token, price: priceNum };
      if (hourlyRate) jsonPayload.hourlyRate = Number(hourlyRate);
      if (hivRate) jsonPayload.hivRate = Number(hivRate);
      if (comment.trim()) jsonPayload.comment = comment.trim();

      const formData = new FormData();
      formData.append("json", JSON.stringify(jsonPayload));
      if (attachment) formData.append("attachment", attachment);

      const res = await fetch("/api/offer", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Noe gikk galt");
        return;
      }

      trackFunnel("offer_replied");
      setSubmitted(true);
    } catch {
      setError("Kunne ikke sende tilbudet. Prøv igjen.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-8 text-center">
        <div className="mb-3 text-4xl">✅</div>
        <h2 className="mb-2 text-xl font-bold text-green-800">
          Tilbudet er sendt!
        </h2>
        <p className="text-green-700">
          Kunden vil motta tilbudet ditt og kan akseptere det direkte.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Job summary */}
      <div className="rounded-lg bg-gray-50 p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Selskap</span>
          <span className="font-medium">{companyName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Antall dropp</span>
          <span className="font-medium">{dropCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Est. flytid</span>
          <span className="font-medium">{totalFlightTimeMin.toFixed(1)} min</span>
        </div>
      </div>

      {/* Price fields */}
      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">
          Totalpris (NOK) <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          min="1"
          step="1"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-full rounded-lg border px-4 py-2.5 focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
          placeholder="f.eks. 45000"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">
            Timepris overflygning (NOK/t)
          </label>
          <input
            type="number"
            min="0"
            step="1"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            className="w-full rounded-lg border px-4 py-2.5 focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
            placeholder="f.eks. 25000"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">
            Timepris m/hiv (NOK/t)
          </label>
          <input
            type="number"
            min="0"
            step="1"
            value={hivRate}
            onChange={(e) => setHivRate(e.target.value)}
            className="w-full rounded-lg border px-4 py-2.5 focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
            placeholder="f.eks. 35000"
          />
        </div>
      </div>

      {/* Comment */}
      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">
          Kommentar / fritekst
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          maxLength={2000}
          className="w-full rounded-lg border px-4 py-2.5 focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
          placeholder="Beskriv tilbudet nærmere, inkluder helikoptertype, tilgjengelighet, betingelser etc."
        />
      </div>

      {/* PDF attachment */}
      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">
          Vedlegg (valgfritt, kun PDF, maks 5 MB)
        </label>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
          className="w-full rounded-lg border px-4 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#1e3a5f] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
        />
        {attachment && (
          <p className="mt-1 text-xs text-gray-600">
            {attachment.name} ({(attachment.size / 1024).toFixed(0)} KB)
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-[#1e3a5f] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#15304f] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Sender…" : "Send tilbud"}
      </button>

      <p className="text-center text-xs text-gray-600">
        Tilbudet kan ikke endres etter innsending.
      </p>
    </form>
  );
}

