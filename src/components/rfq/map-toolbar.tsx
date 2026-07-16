"use client";

import { Button } from "@/components/ui/button";

interface MapToolbarProps {
  isPickupActive: boolean;
  dropsCount: number;
  isFirstDropActive: boolean;
  isAddingDrop: boolean;
  onSelectPickup: () => void;
  onSelectFirstDrop: () => void;
  onAddDrop: () => void;
  onOpenCoordinates: () => void;
  onReset: () => void;
}

function StepBadge({ n, active }: { n: number; active: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
        active ? "bg-white/25 text-white" : "bg-gray-300 text-gray-700"
      }`}
    >
      {n}
    </span>
  );
}

/**
 * Guided step toolbar above the map: numbered buttons for pickup (1) and
 * the first delivery point (2) so users see the natural order, plus a
 * generic "add another point" action for everything beyond the first.
 */
export function MapToolbar({
  isPickupActive,
  dropsCount,
  isFirstDropActive,
  isAddingDrop,
  onSelectPickup,
  onSelectFirstDrop,
  onAddDrop,
  onOpenCoordinates,
  onReset,
}: MapToolbarProps) {
  const firstDropButtonActive = isFirstDropActive || (isAddingDrop && dropsCount === 0);
  const addDropButtonActive = isAddingDrop && dropsCount > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant={isPickupActive ? "primary" : "secondary"}
        onClick={onSelectPickup}
        className="gap-1.5 text-xs"
      >
        <StepBadge n={1} active={isPickupActive} /> Hentepunkt
      </Button>

      <Button
        type="button"
        variant={firstDropButtonActive ? "primary" : "secondary"}
        onClick={onSelectFirstDrop}
        className="gap-1.5 text-xs"
      >
        <StepBadge n={2} active={firstDropButtonActive} /> Leveringspunkt
      </Button>

      <Button
        type="button"
        variant={addDropButtonActive ? "primary" : "secondary"}
        onClick={onAddDrop}
        className="text-xs"
      >
        + Leveringspunkt
      </Button>

      <Button type="button" variant="secondary" onClick={onOpenCoordinates} className="text-xs">
        Koordinat
      </Button>

      <Button
        type="button"
        variant="secondary"
        onClick={onReset}
        className="ml-auto text-xs text-gray-600"
      >
        ↺ Nullstill skjema
      </Button>
    </div>
  );
}
