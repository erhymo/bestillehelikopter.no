"use client";

interface PickupStepProps {
  pickup: { lat: number; lng: number } | null;
  isActive: boolean;
  onActivate: () => void;
}

export function PickupStep({ pickup, isActive, onActivate }: PickupStepProps) {
  // Nothing to show until a pickup point exists — the "1 Hentepunkt"
  // toolbar button above the map is the entry point, not this panel.
  if (!pickup) return null;

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border p-2.5 text-sm ${
        isActive ? "border-green-300 bg-green-50" : "border-gray-200 bg-white"
      }`}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">
        H
      </span>
      <span className="flex-1 text-gray-600">
        Hentepunkt · {pickup.lat.toFixed(5)}, {pickup.lng.toFixed(5)}
      </span>
      <button
        type="button"
        onClick={onActivate}
        className="shrink-0 text-xs text-blue-600 hover:text-blue-800"
      >
        {isActive ? "Klikk i kartet" : "Endre"}
      </button>
    </div>
  );
}
