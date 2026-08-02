"use client";

import { Users, Weight } from "lucide-react";
import type { TransportType } from "@/types";

interface TransportTypeToggleProps {
  value: TransportType;
  onChange: (value: TransportType) => void;
}

const OPTIONS: { id: TransportType; label: string; icon: typeof Users }[] = [
  { id: "passenger", label: "Persontransport", icon: Users },
  { id: "sling", label: "Underhengende last", icon: Weight },
];

export function TransportTypeToggle({ value, onChange }: TransportTypeToggleProps) {
  return (
    <div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900">Type transport</h3>
      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={value === id}
            className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
              value === id
                ? "border-brand-700 bg-brand-700 text-white"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
