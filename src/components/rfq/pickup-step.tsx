"use client";

interface PickupStepProps {
  pickup: { lat: number; lng: number } | null;
  isActive: boolean;
  onActivate: () => void;
}

export function PickupStep({ pickup, isActive, onActivate }: PickupStepProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold text-gray-900">Hentepunkt</h3>

      {pickup ? (
        <div
          className={`flex items-center gap-3 rounded-lg border p-3 ${
            isActive ? "border-green-300 bg-green-50" : "border-gray-200 bg-white"
          }`}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-600 text-sm font-bold text-white">
            H
          </span>
          <span className="text-sm text-gray-600">
            {pickup.lat.toFixed(5)}, {pickup.lng.toFixed(5)}
          </span>
          <button
            type="button"
            onClick={onActivate}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            {isActive ? "Klikk i kartet" : "Endre"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onActivate}
          className={`w-full rounded-lg border-2 border-dashed px-4 py-3 text-sm transition-colors ${
            isActive
              ? "border-green-500 bg-green-50 text-green-700"
              : "border-gray-300 text-gray-600 hover:border-green-400"
          }`}
        >
          {isActive
            ? "🟢 Klikk på kartet for å sette hentepunkt"
            : "Klikk her for å velge hentepunkt på kartet"}
        </button>
      )}
    </div>
  );
}
