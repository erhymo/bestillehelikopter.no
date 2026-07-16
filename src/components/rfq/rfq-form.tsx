"use client";

import { useState, useCallback, useEffect } from "react";
import { MapPicker, type MapMode } from "@/components/map/map-picker";
import { PickupStep } from "@/components/rfq/pickup-step";
import { DropsStep } from "@/components/rfq/drops-step";
import { CustomerInfoStep } from "@/components/rfq/customer-info-step";
import { FlightSummary } from "@/components/rfq/flight-summary";
import { ImageUpload } from "@/components/rfq/image-upload";
import { CompanySelector } from "@/components/rfq/company-selector";
import { OtpModal } from "@/components/phone/otp-modal";
import { Button } from "@/components/ui/button";
import { usePhoneAuth } from "@/hooks/use-phone-auth";
import { useImageUpload } from "@/hooks/use-image-upload";
import { useFlightEstimate } from "@/hooks/use-flight-estimate";
import type { GeoPoint, Drop, LoadItem } from "@/types";
import { formatCoordinate, parseCoordinateInput } from "@/lib/coordinates";
import { validateEmail } from "@/lib/disposableEmail";
import { reverseGeocodeRegion } from "@/lib/geocodeRegion";
import { useAnalytics } from "@/hooks/use-analytics";

interface CustomerData {
  name: string;
  company: string;
  email: string;
  phone: string;
  invoiceAddress: string;
  orgnr: string;
}

interface DropData {
  lat: number;
  lng: number;
  hpieces: number;
  loadItems: LoadItem[];
}

const emptyCustomer: CustomerData = {
  name: "",
  company: "",
  email: "",
  phone: "",
  invoiceAddress: "",
  orgnr: "",
};

export function RfqForm() {
  // ── State ──
  const [mapMode, setMapMode] = useState<MapMode>("pickup");
  const [pickup, setPickup] = useState<{ lat: number; lng: number } | null>(null);
  const [drops, setDrops] = useState<DropData[]>([]);
  const [activeDropIndex, setActiveDropIndex] = useState<number | null>(null);
  const [coordinateInput, setCoordinateInput] = useState("");
  const [coordinateError, setCoordinateError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerData>(emptyCustomer);
  const [nettbruk, setNettbruk] = useState(false);
  const [over15m, setOver15m] = useState(false);
  const [desiredDate, setDesiredDate] = useState("");
  const [flexibleDate, setFlexibleDate] = useState(false);
  const [notes, setNotes] = useState("");
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [pickupRegion, setPickupRegion] = useState<string | null>(null);
  const [showOtp, setShowOtp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // ── Hooks ──
  const phoneAuth = usePhoneAuth();
  const imageUpload = useImageUpload();
  const { trackFunnel } = useAnalytics("customer_form");

  // Build GeoPoints for flight estimate (elevation = 0 client-side, server fetches real)
  const pickupGeo: GeoPoint | null = pickup
    ? { lat: pickup.lat, lng: pickup.lng, elevation: 0 }
    : null;

  const dropsGeo: Drop[] = drops.map((d) => ({
    lat: d.lat,
    lng: d.lng,
    elevation: 0,
    hpieces: d.hpieces,
    loadItems: d.loadItems,
  }));

  const { estimates, totalFlightTimeMin } = useFlightEstimate(pickupGeo, dropsGeo);

  // Suggest companies covering the pickup area (best-effort, never blocking).
  useEffect(() => {
    if (!pickup) {
      setPickupRegion(null);
      return;
    }
    let cancelled = false;
    reverseGeocodeRegion(pickup.lat, pickup.lng).then((region) => {
      if (!cancelled) setPickupRegion(region);
    });
    return () => {
      cancelled = true;
    };
  }, [pickup]);

  // ── Handlers ──
  const handlePickupSet = useCallback(
    (point: { lat: number; lng: number }) => {
      setPickup(point);
      setMapMode("drop");
      setActiveDropIndex(null);
      trackFunnel("pickup_set");
    },
    [trackFunnel],
  );

  const handleDropAdd = useCallback(
    (point: { lat: number; lng: number }) => {
      setDrops((prev) => {
        setActiveDropIndex(prev.length);
        return [...prev, { lat: point.lat, lng: point.lng, hpieces: 1, loadItems: [] }];
      });
      trackFunnel("drops_added");
    },
    [trackFunnel],
  );

  const handleDropMapUpdate = useCallback((index: number, point: { lat: number; lng: number }) => {
    setDrops((prev) =>
      prev.map((drop, i) => (i === index ? { ...drop, lat: point.lat, lng: point.lng } : drop)),
    );
  }, []);

  const handleDropUpdate = useCallback((index: number, drop: DropData) => {
    setDrops((prev) => prev.map((d, i) => (i === index ? drop : d)));
  }, []);

  const handleDropDelete = useCallback((index: number) => {
    setDrops((prev) => prev.filter((_, i) => i !== index));
    setActiveDropIndex((current) => {
      if (current === null) return null;
      if (current === index) return null;
      return current > index ? current - 1 : current;
    });
  }, []);

  const activateDrop = useCallback((index: number) => {
    setActiveDropIndex(index);
    setMapMode("drop");
  }, []);

  const startAddingDrop = useCallback(() => {
    setActiveDropIndex(null);
    setMapMode("drop");
  }, []);

  const handleReset = useCallback(() => {
    if (
      !window.confirm(
        "Er du sikker på at du vil nullstille hele skjemaet? All informasjon du har fylt ut går tapt.",
      )
    ) {
      return;
    }
    setMapMode("pickup");
    setPickup(null);
    setDrops([]);
    setActiveDropIndex(null);
    setCoordinateInput("");
    setCoordinateError(null);
    setCustomer(emptyCustomer);
    setNettbruk(false);
    setOver15m(false);
    setDesiredDate("");
    setFlexibleDate(false);
    setNotes("");
    setSelectedCompanyIds([]);
    setPickupRegion(null);
    setSubmitError(null);
    setEmailError(null);
    setAcceptedTerms(false);
    imageUpload.reset();
  }, [imageUpload]);

  const handleCoordinateSubmit = useCallback(() => {
    const point = parseCoordinateInput(coordinateInput);
    if (!point) {
      setCoordinateError(
        "Skriv inn f.eks. 60.472024, 5.322054 eller lim inn en Google Maps-lenke.",
      );
      return;
    }

    setCoordinateError(null);
    setCoordinateInput("");

    if (mapMode === "pickup" || !pickup) {
      handlePickupSet(point);
      return;
    }

    if (typeof activeDropIndex === "number" && drops[activeDropIndex]) {
      handleDropMapUpdate(activeDropIndex, point);
      return;
    }

    handleDropAdd(point);
  }, [
    activeDropIndex,
    coordinateInput,
    drops,
    handleDropAdd,
    handleDropMapUpdate,
    handlePickupSet,
    mapMode,
    pickup,
  ]);

  const canSubmit =
    pickup &&
    drops.length > 0 &&
    customer.name.trim() &&
    customer.email.trim() &&
    customer.phone.trim() &&
    customer.invoiceAddress.trim() &&
    selectedCompanyIds.length > 0 &&
    acceptedTerms;

  const coordinateTargetLabel =
    mapMode === "pickup" || !pickup
      ? "hentepunkt"
      : typeof activeDropIndex === "number" && drops[activeDropIndex]
        ? `leveringspunkt ${String.fromCharCode(65 + activeDropIndex)}`
        : "nytt leveringspunkt";
  const coordinatePreview = coordinateInput ? parseCoordinateInput(coordinateInput) : null;

  // Validate email on blur / before submit
  const checkEmail = useCallback((email: string) => {
    if (!email.trim()) {
      setEmailError(null);
      return true;
    }
    const result = validateEmail(email);
    setEmailError(result.valid ? null : (result.message ?? "Ugyldig e-post"));
    return result.valid;
  }, []);

  const handleSubmit = async () => {
    if (!canSubmit) return;

    // Check email before proceeding
    if (!checkEmail(customer.email)) return;

    // Require phone verification first
    if (!phoneAuth.verified) {
      setShowOtp(true);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      // Upload images first
      let imageRefs: string[] = [];
      if (imageUpload.images.length > 0) {
        // Use a temp ID — server will create real job ID
        const tempId = crypto.randomUUID();
        imageRefs = await imageUpload.uploadAll(tempId);
      }

      // Get Firebase auth token
      const token = await phoneAuth.user?.getIdToken();

      const body = {
        customer: {
          name: customer.name.trim(),
          company: customer.company.trim() || undefined,
          email: customer.email.trim(),
          phone: customer.phone.startsWith("+47")
            ? customer.phone.trim()
            : `+47${customer.phone.replace(/\s/g, "")}`,
          invoiceAddress: customer.invoiceAddress.trim(),
          orgnr: customer.orgnr.trim() || undefined,
        },
        pickup: { lat: pickup.lat, lng: pickup.lng },
        drops: drops.map((d) => ({
          lat: d.lat,
          lng: d.lng,
          hpieces: d.hpieces,
          loadItems: d.loadItems,
        })),
        nettbruk,
        over15m,
        desiredDate,
        flexibleDate,
        notes: notes.trim(),
        selectedCompanyIds,
        imageRefs,
      };

      const res = await fetch("/api/rfq", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Feil: ${res.status}`);
      }

      trackFunnel("rfq_submitted");
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Noe gikk galt ved innsending");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success state ──
  if (submitted) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="text-5xl">✅</div>
        <h2 className="text-2xl font-bold text-gray-900">Forespørselen din er mottatt!</h2>
        <p className="max-w-md text-gray-600">
          Du vil motta et tilbud på e-post dersom oppdraget kan gjennomføres.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Map (left / top) */}
      <div className="lg:sticky lg:top-4 lg:w-1/2">
        <MapPicker
          mode={mapMode}
          pickup={pickup}
          drops={drops}
          activeDropIndex={activeDropIndex}
          onPickupSet={handlePickupSet}
          onDropAdd={handleDropAdd}
          onDropUpdate={handleDropMapUpdate}
          onDropClick={activateDrop}
          className="h-[50vh] w-full lg:h-[65vh]"
        />

        <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
          <label className="block text-xs font-semibold text-gray-700">
            Lim inn koordinat for {coordinateTargetLabel}
          </label>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={coordinateInput}
              onChange={(e) => {
                setCoordinateInput(e.target.value);
                setCoordinateError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCoordinateSubmit();
              }}
              placeholder="60.472024, 5.322054"
              className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
            <Button
              variant="secondary"
              onClick={handleCoordinateSubmit}
              className="shrink-0 text-xs"
            >
              Bruk
            </Button>
          </div>
          {coordinateError ? (
            <p className="mt-1 text-xs text-red-600">{coordinateError}</p>
          ) : coordinatePreview ? (
            <p className="mt-1 text-xs text-green-700">
              Tolkes som {formatCoordinate(coordinatePreview)}.
            </p>
          ) : (
            <p className="mt-1 text-xs text-gray-500">
              Tips: Kopier koordinater fra Google Maps, eller klikk direkte i kartet.
            </p>
          )}
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={handleReset}
          className="mt-3 w-full text-xs text-gray-600"
        >
          ↺ Nullstill skjema
        </Button>
      </div>

      {/* Form panel (right / bottom) */}
      <div className="flex-1 space-y-8 pb-12 lg:max-w-xl">
        <PickupStep
          pickup={pickup}
          isActive={mapMode === "pickup"}
          onActivate={() => {
            setMapMode("pickup");
            setActiveDropIndex(null);
          }}
        />

        <DropsStep
          drops={drops}
          activeDropIndex={activeDropIndex}
          onActivateDrop={activateDrop}
          onAddDrop={startAddingDrop}
          onUpdateDrop={handleDropUpdate}
          onDeleteDrop={handleDropDelete}
        />

        <FlightSummary estimates={estimates} totalFlightTimeMin={totalFlightTimeMin} />

        <CustomerInfoStep
          data={customer}
          onChange={setCustomer}
          nettbruk={nettbruk}
          onNettbrukChange={setNettbruk}
          over15m={over15m}
          onOver15mChange={setOver15m}
          desiredDate={desiredDate}
          onDesiredDateChange={setDesiredDate}
          flexibleDate={flexibleDate}
          onFlexibleDateChange={setFlexibleDate}
          notes={notes}
          onNotesChange={setNotes}
          emailError={emailError}
          onEmailBlur={() => checkEmail(customer.email)}
        />

        <CompanySelector
          selected={selectedCompanyIds}
          onChange={setSelectedCompanyIds}
          region={pickupRegion}
        />

        <ImageUpload
          previews={imageUpload.previews}
          onAdd={imageUpload.addImage}
          onRemove={imageUpload.removeImage}
          loading={imageUpload.loading}
          error={imageUpload.error}
          count={imageUpload.count}
          maxImages={imageUpload.maxImages}
        />

        {/* Vilkår-checkbox */}
        <div className="space-y-2">
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300"
            />
            <span>
              Jeg har lest og aksepterer{" "}
              <a
                href="/vilkar"
                target="_blank"
                className="text-blue-600 underline hover:text-blue-800"
              >
                vilkårene for bruk
              </a>{" "}
              og{" "}
              <a
                href="/personvern"
                target="_blank"
                className="text-blue-600 underline hover:text-blue-800"
              >
                personvernerklæringen
              </a>
              .
            </span>
          </label>
          <p className="text-xs text-gray-600">
            Ved å sende inn forespørselen aksepterer du at oppdragsinformasjonen deles med et
            helikopterselskap for tilbudsgivning. Se{" "}
            <a
              href="/ansvarsfraskrivelse"
              target="_blank"
              className="underline hover:text-gray-700"
            >
              ansvarsfraskrivelse
            </a>
            .
          </p>
        </div>

        {/* Submit */}
        <div className="space-y-3">
          {submitError && <p className="text-sm text-red-600">{submitError}</p>}

          {!phoneAuth.verified && customer.phone && (
            <p className="text-xs text-amber-600">
              ⚠ Telefonnummeret må verifiseres før du kan sende forespørselen.
            </p>
          )}

          <Button
            onClick={handleSubmit}
            loading={submitting}
            disabled={!canSubmit || submitting}
            className="w-full py-3 text-base"
          >
            {phoneAuth.verified ? "Send forespørsel" : "Verifiser telefon og send"}
          </Button>
        </div>
      </div>

      {/* OTP Modal */}
      <OtpModal
        open={showOtp}
        onClose={() => {
          setShowOtp(false);
          if (phoneAuth.verified) {
            handleSubmit();
          }
        }}
        phone={
          customer.phone.startsWith("+47")
            ? customer.phone
            : `+47${customer.phone.replace(/\s/g, "")}`
        }
        onSendOtp={phoneAuth.sendOtp}
        onVerifyOtp={phoneAuth.verifyOtp}
        loading={phoneAuth.loading}
        error={phoneAuth.error}
        verified={phoneAuth.verified}
      />

      {/* Invisible reCAPTCHA container */}
      <div id="recaptcha-container" />
    </div>
  );
}
