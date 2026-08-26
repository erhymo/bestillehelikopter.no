"use client";

import { useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { TimeSelect, splitTimeString } from "@/components/ui/time-select";
import { formatDateNorwegian } from "@/lib/formatDate";

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

export function RegisterForm({
  token,
  initialDate,
  initialTime,
  suggestedDate,
  suggestedTime,
  flexibleDate,
}: RegisterFormProps) {
  // Date stays uncontrolled (native <input type="date"> has proven reliable
  // throughout this flow) and is read straight from the DOM at submit time.
  const dateRef = useRef<HTMLInputElement>(null);
  const alreadyRegistered = !!initialDate;
  const defaultDate = initialDate ?? suggestedDate ?? "";
  const defaultTime = initialTime ?? suggestedTime ?? "";

  // Time uses two plain <select> dropdowns instead — see time-select.tsx for why.
  const initialTimeParts = splitTimeString(defaultTime);
  const [hour, setHour] = useState(initialTimeParts.hour);
  const [minute, setMinute] = useState(initialTimeParts.minute);
  const time = hour && minute ? `${hour}:${minute}` : "";

  const [previewDate, setPreviewDate] = useState(defaultDate);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function syncDatePreview() {
    setPreviewDate(dateRef.current?.value ?? "");
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const date = dateRef.current?.value ?? "";

    if (!date || !time) {
      setError("Fyll ut både dato og klokkeslett.");
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
            onChange={syncDatePreview}
            className="w-full rounded-lg border px-4 py-2.5 focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">
            Klokkeslett <span className="text-red-500">*</span>
          </label>
          <TimeSelect
            hour={hour}
            minute={minute}
            onHourChange={(v) => {
              setHour(v);
              setSaved(false);
            }}
            onMinuteChange={(v) => {
              setMinute(v);
              setSaved(false);
            }}
          />
        </div>
      </div>

      {!saved && previewDate && time && (
        <p className="text-sm text-gray-600">
          <strong className="text-gray-900">Registrerer:</strong>{" "}
          {formatDateNorwegian(previewDate)} kl. {time}
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
