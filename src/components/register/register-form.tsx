"use client";

import { useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";

interface RegisterFormProps {
  token: string;
  initialDate: string | null;
  initialTime: string | null;
  /** Kundens opprinnelig ønskede dato/tidspunkt fra forespørselen — brukes
   * som forhåndsutfylt forslag når Airlift ikke har registrert noe ennå. */
  suggestedDate: string | null;
  suggestedTime: string | null;
  flexibleDate: boolean;
}

function formatDateNorwegian(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" });
}

export function RegisterForm({
  token,
  initialDate,
  initialTime,
  suggestedDate,
  suggestedTime,
  flexibleDate,
}: RegisterFormProps) {
  // Uncontrolled on purpose: native date/time inputs are known to drift out
  // of sync with a React-controlled `value` (the widget shows a complete
  // value while onChange never delivered it to state), which silently
  // blocked submission. Reading straight from the DOM at submit time
  // sidesteps that entirely.
  const dateRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alreadyRegistered = !!initialDate;
  const defaultDate = initialDate ?? suggestedDate ?? "";
  const defaultTime = initialTime ?? suggestedTime ?? "";

  // Browsers — Safari in particular — can render an *empty* date/time
  // input as if it already shows today's date / the current time, even
  // though the real underlying value is still "". That reliably fools
  // people into thinking the field is filled in when it isn't. This
  // preview mirrors the actual DOM value (not what the widget merely
  // displays) so what gets submitted is never ambiguous.
  const [previewDate, setPreviewDate] = useState(defaultDate);
  const [previewTime, setPreviewTime] = useState(defaultTime);

  function syncPreview() {
    setPreviewDate(dateRef.current?.value ?? "");
    setPreviewTime(timeRef.current?.value ?? "");
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const date = dateRef.current?.value ?? "";
    const time = timeRef.current?.value ?? "";

    if (!date || !time) {
      setError("Fyll ut både dato og klokkeslett — feltene under er fortsatt tomme.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, date, time }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Noe gikk galt");
        return;
      }
      setSaved(true);
    } catch {
      setError("Kunne ikke registrere. Prøv igjen.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {saved && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Registrert! Kunden har fått beskjed om dato og tidspunkt på e-post.
        </div>
      )}

      {!saved && alreadyRegistered && (
        <p className="text-sm text-gray-600">
          Sist registrert: {initialDate} kl. {initialTime}. Du kan oppdatere under om noe endrer
          seg — kunden får da en ny e-post.
        </p>
      )}

      {!saved && !alreadyRegistered && (suggestedDate || suggestedTime) && (
        <p className="text-sm text-gray-600">
          {suggestedDate && suggestedTime
            ? "Dato og klokkeslett er forhåndsutfylt med det kunden ønsket"
            : suggestedDate
              ? "Datoen er forhåndsutfylt med kundens ønskede dato"
              : "Klokkeslettet er forhåndsutfylt med kundens ønskede tidspunkt"}
          {flexibleDate ? " (kunden er fleksibel på dato)" : ""}. Endre til det dere faktisk ble
          enige om.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">
            Dato <span className="text-red-500">*</span>
          </label>
          <input
            ref={dateRef}
            type="date"
            defaultValue={defaultDate}
            onChange={syncPreview}
            className="w-full rounded-lg border px-4 py-2.5 focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">
            Klokkeslett <span className="text-red-500">*</span>
          </label>
          <input
            ref={timeRef}
            type="time"
            defaultValue={defaultTime}
            onChange={syncPreview}
            className="w-full rounded-lg border px-4 py-2.5 focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700"
          />
        </div>
      </div>

      {/* Always-accurate summary of what will actually be submitted —
          independent of whatever the native widgets happen to display. */}
      {!saved && previewDate && previewTime && (
        <p className="text-sm text-gray-600">
          <strong className="text-gray-900">Registrerer:</strong>{" "}
          {formatDateNorwegian(previewDate)} kl. {previewTime}
        </p>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-brand-700 px-6 py-3 font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Registrerer…" : "Registrer"}
      </button>
    </form>
  );
}
