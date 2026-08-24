"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Lock } from "lucide-react";
import { useAnalytics } from "@/hooks/use-analytics";
import { OfferMapView } from "@/components/map/offer-map-view";
import { OfferPreview } from "@/components/offer/offer-preview";
import { calculateFlightCost } from "@/lib/offerAddons";
import { TILFLYGNING_ADDON_KEY, TILFLYGNING_ADDON_LABEL } from "@/lib/offerAddons";

interface WizardDrop {
  lat: number;
  lng: number;
  address?: string;
  hpieces: number;
  passengers: number;
}

interface WizardJob {
  customerName: string;
  pickup: { lat: number; lng: number; address?: string };
  drops: WizardDrop[];
  transportType: "sling" | "passenger";
  desiredDate: string;
  flexibleDate: boolean;
  notes: string;
  totalFlightTimeMin: number;
  totalHiveCount: number;
}

interface OfferWizardProps {
  token: string;
  companyName: string;
  job: WizardJob;
}

interface Draft {
  step: 1 | 2;
  hourlyRate: string;
  tilflygningPrice: string;
  totalPriceOverride: string | null;
}

function draftKey(token: string) {
  return `offer-draft-${token}`;
}

function loadDraft(token: string): Draft | null {
  try {
    const raw = window.localStorage.getItem(draftKey(token));
    if (!raw) return null;
    return JSON.parse(raw) as Draft;
  } catch {
    return null;
  }
}

function saveDraft(token: string, draft: Draft) {
  try {
    window.localStorage.setItem(draftKey(token), JSON.stringify(draft));
  } catch {
    // localStorage unavailable — ignore, autosave is a convenience only
  }
}

function clearDraft(token: string) {
  try {
    window.localStorage.removeItem(draftKey(token));
  } catch {
    // ignore
  }
}

export function OfferWizard({ token, companyName, job }: OfferWizardProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [hourlyRate, setHourlyRate] = useState("");
  const [tilflygningPrice, setTilflygningPrice] = useState("");
  const [totalPriceOverride, setTotalPriceOverride] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { trackFunnel } = useAnalytics("company_offer");

  // Restore autosaved draft on mount
  useEffect(() => {
    const draft = loadDraft(token);
    if (draft) {
      setStep(draft.step);
      setHourlyRate(draft.hourlyRate);
      setTilflygningPrice(draft.tilflygningPrice);
      setTotalPriceOverride(draft.totalPriceOverride);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run once, on mount
  }, []);

  // Autosave draft on every relevant change
  useEffect(() => {
    if (submitted) return;
    saveDraft(token, { step, hourlyRate, tilflygningPrice, totalPriceOverride });
  }, [token, step, hourlyRate, tilflygningPrice, totalPriceOverride, submitted]);

  const hourlyRateNum = Number(hourlyRate) || 0;
  const tilflygningNum = Number(tilflygningPrice) || 0;
  const flightCost = calculateFlightCost(hourlyRateNum, job.totalFlightTimeMin);
  const computedTotal = flightCost + tilflygningNum;
  const totalPrice = totalPriceOverride !== null && totalPriceOverride !== ""
    ? Number(totalPriceOverride) || 0
    : computedTotal;

  function goToStep2() {
    setError(null);
    if (!hourlyRateNum || hourlyRateNum <= 0) {
      setError("Timepris er påkrevd og må være positiv");
      return;
    }
    // Reset any stale override so step 2 starts from the freshly computed total
    setTotalPriceOverride(null);
    setStep(2);
  }

  async function handleSend() {
    setError(null);
    if (!totalPrice || totalPrice <= 0) {
      setError("Totalpris må være positiv");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          hourlyRate: hourlyRateNum,
          tilflygningPrice: tilflygningNum,
          totalPrice,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Noe gikk galt");
        return;
      }
      trackFunnel("offer_replied");
      clearDraft(token);
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
        <h2 className="mb-2 text-xl font-bold text-green-800">Tilbudet er sendt!</h2>
        <p className="text-green-700">
          Kunden vil motta tilbudet og kan akseptere det direkte.
        </p>
      </div>
    );
  }

  const dropLabels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className={step === 1 ? "text-brand-700" : "text-gray-400"}>1. Oppdragsinfo og kalkulator</span>
        <span className="text-gray-300">→</span>
        <span className={step === 2 ? "text-brand-700" : "text-gray-400"}>2. Gjennomgå tilbud</span>
      </div>

      {step === 1 && (
        <div className="space-y-6">
          {/* Job summary */}
          <div className="grid gap-3 rounded-lg bg-gray-50 p-4 text-sm sm:grid-cols-2">
            <div className="flex justify-between sm:block">
              <span className="text-gray-600">Ønsket dato</span>
              <span className="ml-2 font-medium sm:ml-0 sm:block">
                {job.desiredDate || "Ikke spesifisert"}
                {job.flexibleDate ? " (fleksibel)" : ""}
              </span>
            </div>
            <div className="flex justify-between sm:block">
              <span className="text-gray-600">Est. flytid</span>
              <span className="ml-2 font-medium sm:ml-0 sm:block">
                {Math.ceil(job.totalFlightTimeMin)} min
              </span>
            </div>
            <div className="flex justify-between sm:block">
              <span className="text-gray-600">
                {job.transportType === "sling" ? "Antall hiv" : "Antall passasjerer"}
              </span>
              <span className="ml-2 font-medium sm:ml-0 sm:block">{job.totalHiveCount}</span>
            </div>
            {job.drops.length > 1 && (
              <div className="flex justify-between sm:block">
                <span className="text-gray-600">Merk</span>
                <span className="ml-2 font-medium sm:ml-0 sm:block">Flere dropp-punkter</span>
              </div>
            )}
            {job.notes && (
              <div className="sm:col-span-2">
                <span className="text-gray-600">Kommentar fra kunden</span>
                <p className="mt-1 whitespace-pre-wrap text-gray-800">{job.notes}</p>
              </div>
            )}
          </div>

          {/* Map */}
          <OfferMapView pickup={job.pickup} drops={job.drops} className="h-72 sm:h-96" />

          {/* Drop list */}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span className="font-semibold text-gray-900">H</span>
              <span>{job.pickup.address ?? `${job.pickup.lat.toFixed(4)}, ${job.pickup.lng.toFixed(4)}`}</span>
            </div>
            {job.drops.map((d, i) => (
              <div key={i} className="flex justify-between text-gray-600">
                <span className="font-semibold text-gray-900">{dropLabels[i] ?? i + 1}</span>
                <span>
                  {d.address ?? `${d.lat.toFixed(4)}, ${d.lng.toFixed(4)}`}
                  {job.transportType === "sling"
                    ? ` — ${d.hpieces} hiv`
                    : ` — ${d.passengers} passasjer${d.passengers === 1 ? "" : "er"}`}
                </span>
              </div>
            ))}
          </div>

          {/* Calculator */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Timepris (NOK/t) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                className="w-full rounded-lg border px-4 py-2.5 focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700"
                placeholder="f.eks. 25000"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Tilflygning/oppmøte (NOK)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={tilflygningPrice}
                onChange={(e) => setTilflygningPrice(e.target.value)}
                className="w-full rounded-lg border px-4 py-2.5 focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700"
                placeholder="f.eks. 5000"
              />
            </div>
          </div>

          <div className="flex justify-between rounded-lg bg-brand-50 px-4 py-3 text-sm">
            <span className="font-medium text-brand-900">
              Flytidskostnad ({Math.ceil(job.totalFlightTimeMin)} min × {hourlyRateNum.toLocaleString("nb-NO")} NOK/t) + tilflygning/oppmøte
            </span>
            <span className="font-bold text-brand-700">{computedTotal.toLocaleString("nb-NO")} NOK</span>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={goToStep2}
            className="w-full rounded-lg bg-brand-700 px-6 py-3 font-semibold text-white transition-colors hover:bg-brand-600"
          >
            Neste
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Slik vil kunden se tilbudet. Du kan kun endre totalprisen her — resten er
            akkurat det kunden mottar.
          </p>

          <OfferPreview
            variant="embedded"
            customerName={job.customerName}
            companyName={companyName}
            flightCost={totalPrice - tilflygningNum}
            addons={
              tilflygningNum > 0
                ? [{ key: TILFLYGNING_ADDON_KEY, label: TILFLYGNING_ADDON_LABEL, price: tilflygningNum }]
                : []
            }
            totalPrice={totalPrice}
            editableTotalPrice={{
              value: totalPriceOverride ?? String(computedTotal),
              onChange: setTotalPriceOverride,
            }}
            actionSlot={
              <div>
                <button
                  type="button"
                  disabled
                  className="w-full cursor-not-allowed rounded-lg bg-green-600/50 px-6 py-3 font-semibold text-white"
                >
                  Aksepter tilbud
                </button>
                <p className="mt-2 flex items-center justify-center gap-1 text-center text-xs text-gray-500">
                  <Lock className="h-3 w-3" />
                  Forhåndsvisning — dette er kundens knapp, ikke aktiv her
                </p>
              </div>
            }
          />

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 rounded-lg border border-brand-700 px-6 py-3 font-semibold text-brand-700 transition-colors hover:bg-brand-50"
            >
              Tilbake
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={submitting}
              className="flex-1 rounded-lg bg-brand-700 px-6 py-3 font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Sender…" : "Send tilbud til kunde"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
