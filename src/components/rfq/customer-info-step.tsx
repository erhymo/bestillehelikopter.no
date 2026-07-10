"use client";

import { Input } from "@/components/ui/input";

interface CustomerInfo {
  name: string;
  company: string;
  email: string;
  phone: string;
  invoiceAddress: string;
  orgnr: string;
}

interface CustomerInfoStepProps {
  data: CustomerInfo;
  onChange: (data: CustomerInfo) => void;
  nettbruk: boolean;
  onNettbrukChange: (v: boolean) => void;
  over15m: boolean;
  onOver15mChange: (v: boolean) => void;
  desiredDate: string;
  onDesiredDateChange: (v: string) => void;
  flexibleDate: boolean;
  onFlexibleDateChange: (v: boolean) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  emailError?: string | null;
  onEmailBlur?: () => void;
}

export function CustomerInfoStep({
  data,
  onChange,
  nettbruk,
  onNettbrukChange,
  over15m,
  onOver15mChange,
  desiredDate,
  onDesiredDateChange,
  flexibleDate,
  onFlexibleDateChange,
  notes,
  onNotesChange,
  emailError,
  onEmailBlur,
}: CustomerInfoStepProps) {
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

      {/* Date */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Ønsket dato"
          type="date"
          value={desiredDate}
          onChange={(e) => onDesiredDateChange(e.target.value)}
        />
        <label className="flex items-center gap-2 self-end py-2">
          <input
            type="checkbox"
            checked={flexibleDate}
            onChange={(e) => onFlexibleDateChange(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          <span className="text-sm text-gray-700">Fleksibel på dato</span>
        </label>
      </div>

      {/* Checkboxes */}
      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={nettbruk}
            onChange={(e) => onNettbrukChange(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          <span className="text-sm text-gray-700">
            Nettbruk (last henges under helikopteret)
          </span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={over15m}
            onChange={(e) => onOver15mChange(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          <span className="text-sm text-gray-700">
            Last over 15 meter lengde
          </span>
        </label>
      </div>

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
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Spesielle behov, tidspunkt, tilgjengelighet på stedet…"
        />
      </div>
    </div>
  );
}

