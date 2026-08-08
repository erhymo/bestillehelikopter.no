"use client";

import { useState, useRef } from "react";
import { CheckCircle2, X } from "lucide-react";
import { useAnalytics } from "@/hooks/use-analytics";
import { Modal } from "@/components/ui/modal";
import { OFFER_ADDON_DEFINITIONS, OFFER_PRICE_DISCLAIMER, calculateOfferTotal } from "@/lib/offerAddons";

interface OfferFormProps {
  token: string;
  companyName: string;
  totalFlightTimeMin: number;
  dropCount: number;
}

interface AddonRow {
  key: string;
  label: string;
  price: string;
  enabled: boolean;
  custom: boolean;
}

function makeDefaultAddonRows(): AddonRow[] {
  return OFFER_ADDON_DEFINITIONS.map((d) => ({
    key: d.key,
    label: d.label,
    price: "",
    enabled: false,
    custom: false,
  }));
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
  const [addonRows, setAddonRows] = useState<AddonRow[]>(makeDefaultAddonRows);
  const [comment, setComment] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { trackFunnel } = useAnalytics("company_offer");

  const toggleAddon = (i: number) =>
    setAddonRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, enabled: !r.enabled } : r)));
  const updateAddonPrice = (i: number, value: string) =>
    setAddonRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, price: value } : r)));
  const updateAddonLabel = (i: number, value: string) =>
    setAddonRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, label: value } : r)));
  const addCustomAddon = () =>
    setAddonRows((rows) => [
      ...rows,
      { key: `custom-${crypto.randomUUID()}`, label: "", price: "", enabled: true, custom: true },
    ]);
  const removeAddon = (i: number) => setAddonRows((rows) => rows.filter((_, idx) => idx !== i));

  const activeAddons = addonRows
    .filter((r) => r.enabled && r.label.trim() && Number(r.price) > 0)
    .map((r) => ({ key: r.key, label: r.label.trim(), price: Number(r.price) }));

  const priceNum = Number(price) || 0;
  const grandTotal = calculateOfferTotal(priceNum, activeAddons);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

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
      const jsonPayload: Record<string, unknown> = { token, price: priceNum, addons: activeAddons };
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
        <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-green-600" />
        <h2 className="mb-2 text-xl font-bold text-green-800">
          Tilbudet er sendt!
        </h2>
        <p className="text-green-700">
          Kunden vil motta tilbudet ditt og kan akseptere det direkte.
        </p>
      </div>
    );
  }

  const previewContent = (
    <div className="space-y-3 text-sm">
      <div className="flex justify-between">
        <span className="text-gray-600">Selskap</span>
        <span className="font-semibold">{companyName}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">Grunnpris</span>
        <span className="font-medium">{priceNum.toLocaleString("nb-NO")} NOK</span>
      </div>
      {activeAddons.map((a) => (
        <div key={a.key} className="flex justify-between text-gray-600">
          <span>{a.label}</span>
          <span>{a.price.toLocaleString("nb-NO")} NOK</span>
        </div>
      ))}
      <div className="flex justify-between border-t pt-2">
        <span className="font-semibold text-gray-900">Totalt tilbud</span>
        <span className="text-lg font-bold text-brand-700">
          {grandTotal.toLocaleString("nb-NO")} NOK
        </span>
      </div>
      {comment.trim() && (
        <div className="border-t pt-3">
          <span className="text-gray-600">Kommentar</span>
          <p className="mt-1 whitespace-pre-wrap text-gray-800">{comment.trim()}</p>
        </div>
      )}
      <p className="border-t pt-3 text-xs text-gray-500">{OFFER_PRICE_DISCLAIMER}</p>
    </div>
  );

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
          <span className="font-medium">{Math.ceil(totalFlightTimeMin)} min</span>
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
          className="w-full rounded-lg border px-4 py-2.5 focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700"
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
            className="w-full rounded-lg border px-4 py-2.5 focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700"
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
            className="w-full rounded-lg border px-4 py-2.5 focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700"
            placeholder="f.eks. 35000"
          />
        </div>
      </div>

      {/* Add-ons */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-700">
          Tilleggskostnader
        </label>
        <div className="space-y-2">
          {addonRows.map((row, i) => (
            <div key={row.key} className="flex items-center gap-2">
              {row.custom ? (
                <input
                  type="text"
                  value={row.label}
                  onChange={(e) => updateAddonLabel(i, e.target.value)}
                  placeholder="Navn på tillegg"
                  className="w-40 rounded-lg border px-2.5 py-1.5 text-sm"
                />
              ) : (
                <label className="flex w-40 shrink-0 items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={row.enabled}
                    onChange={() => toggleAddon(i)}
                    className="h-4 w-4 rounded border-gray-300 text-brand-700"
                  />
                  {row.label}
                </label>
              )}
              {(row.enabled || row.custom) && (
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={row.price}
                  onChange={(e) => updateAddonPrice(i, e.target.value)}
                  placeholder="Pris (NOK)"
                  className="w-32 rounded-lg border px-2.5 py-1.5 text-sm"
                />
              )}
              {row.custom && (
                <button
                  type="button"
                  onClick={() => removeAddon(i)}
                  className="text-red-500 hover:text-red-700"
                  title="Fjern"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addCustomAddon}
          className="mt-2 text-xs text-blue-600 hover:text-blue-800"
        >
          + Legg til eget tillegg
        </button>
      </div>

      {activeAddons.length > 0 && (
        <div className="flex justify-between rounded-lg bg-brand-50 px-4 py-3 text-sm">
          <span className="font-medium text-brand-900">Totalt tilbud (inkl. tillegg)</span>
          <span className="font-bold text-brand-700">{grandTotal.toLocaleString("nb-NO")} NOK</span>
        </div>
      )}

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
          className="w-full rounded-lg border px-4 py-2.5 focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700"
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
          className="w-full rounded-lg border px-4 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-700 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
        />
        {attachment && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-600">
            {attachment.name} ({(attachment.size / 1024).toFixed(0)} KB)
            <button
              type="button"
              onClick={() => {
                setAttachment(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="text-red-500 hover:text-red-700"
              title="Fjern vedlegg"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </p>
        )}
      </div>

      <p className="text-xs text-gray-500">
        {OFFER_PRICE_DISCLAIMER} Dette gjøres tydelig for kunden i tilbudet.
      </p>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setShowPreview(true)}
          className="flex-1 rounded-lg border border-brand-700 px-6 py-3 font-semibold text-brand-700 transition-colors hover:bg-brand-50"
        >
          Forhåndsvisning
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 rounded-lg bg-brand-700 px-6 py-3 font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Sender…" : "Send tilbud"}
        </button>
      </div>

      <p className="text-center text-xs text-gray-600">
        Tilbudet kan ikke endres etter innsending.
      </p>

      <Modal open={showPreview} onClose={() => setShowPreview(false)} title="Tilbud til kunden">
        {previewContent}
      </Modal>
    </form>
  );
}
