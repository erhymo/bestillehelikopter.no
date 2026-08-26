"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { TimeSelect } from "@/components/ui/time-select";

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
    // Date stays uncontrolled (native <input type="date"> has proven
    // reliable throughout this flow) and is read straight from the DOM at
    // submit time. Time uses two plain <select> dropdowns instead of a
    // native <input type="time"> — see time-select.tsx for why.
    const dateRef = useRef<HTMLInputElement>(null);
    const [hour, setHour] = useState("");
    const [minute, setMinute] = useState("");

    useImperativeHandle(ref, () => ({
      getDesiredDateTime: () => ({
        desiredDate: dateRef.current?.value ?? "",
        desiredTime: hour && minute ? `${hour}:${minute}` : "",
      }),
      resetDesiredDateTime: () => {
        if (dateRef.current) dateRef.current.value = "";
        setHour("");
        setMinute("");
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
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Ønsket tidspunkt
            </label>
            <TimeSelect hour={hour} minute={minute} onHourChange={setHour} onMinuteChange={setMinute} />
          </div>
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
