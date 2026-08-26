"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { Input } from "@/components/ui/input";

interface CustomerInfo {
  name: string;
  company: string;
  email: string;
  phone: string;
  invoiceAddress: string;
  orgnr: string;
}

export interface CustomerInfoStepHandle {
  /** Reads straight from the DOM — see the note on the inputs below for why. */
  getDesiredDateTime: () => { desiredDate: string; desiredTime: string };
  resetDesiredDateTime: () => void;
}

interface CustomerInfoStepProps {
  data: CustomerInfo;
  onChange: (data: CustomerInfo) => void;
  flexibleDate: boolean;
  onFlexibleDateChange: (v: boolean) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  emailError?: string | null;
  onEmailBlur?: () => void;
}

export const CustomerInfoStep = forwardRef<CustomerInfoStepHandle, CustomerInfoStepProps>(
  function CustomerInfoStep(
    {
      data,
      onChange,
      flexibleDate,
      onFlexibleDateChange,
      notes,
      onNotesChange,
      emailError,
      onEmailBlur,
    },
    ref,
  ) {
    // Uncontrolled on purpose: native date/time inputs are known to drift out
    // of sync with a React-controlled value while typing (the widget shows a
    // complete value while onChange never delivered it to state). Reading
    // straight from the DOM at submit time — same fix already proven on the
    // company register page — sidesteps that entirely.
    const dateRef = useRef<HTMLInputElement>(null);
    const timeRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      getDesiredDateTime: () => ({
        desiredDate: dateRef.current?.value ?? "",
        desiredTime: timeRef.current?.value ?? "",
      }),
      resetDesiredDateTime: () => {
        if (dateRef.current) dateRef.current.value = "";
        if (timeRef.current) timeRef.current.value = "";
      },
    }));

    const update = (field: keyof CustomerInfo, value: string) =>
      onChange({ ...data, [field]: value });

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Kundeinformasjon</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Navn *"
            value={data.name}
            onChange={(e) => update("name", e.target.value)}
            required
          />
          <Input
            label="Firma"
            value={data.company}
            onChange={(e) => update("company", e.target.value)}
            placeholder="Valgfritt"
          />
          <Input
            label="E-post *"
            type="email"
            value={data.email}
            onChange={(e) => update("email", e.target.value)}
            onBlur={onEmailBlur}
            error={emailError ?? undefined}
            required
          />
          <Input
            label="Telefon (+47) *"
            type="tel"
            value={data.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="12345678"
            required
          />
          <Input
            label="Fakturaadresse *"
            value={data.invoiceAddress}
            onChange={(e) => update("invoiceAddress", e.target.value)}
            required
          />
          <Input
            label="Org.nr."
            value={data.orgnr}
            onChange={(e) => update("orgnr", e.target.value)}
            placeholder="Valgfritt"
          />
        </div>

        {/* Date & time */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input ref={dateRef} label="Ønsket dato" type="date" defaultValue="" />
          <Input
            ref={timeRef}
            label="Ønsket tidspunkt"
            type="time"
            defaultValue=""
            placeholder="Valgfritt"
          />
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={flexibleDate}
            onChange={(e) => onFlexibleDateChange(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          <span className="text-sm text-gray-700">Fleksibel på dato</span>
        </label>

        {/* Notes */}
        <div className="space-y-1">
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-gray-700"
          >
            Kommentarer / tilleggsinformasjon
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            rows={3}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="Spesielle behov, tilgjengelighet på stedet…"
          />
        </div>
      </div>
    );
  },
);
