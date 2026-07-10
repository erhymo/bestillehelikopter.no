"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LoadItem } from "@/types";

interface DropData {
  lat: number;
  lng: number;
  hpieces: number;
  loadItems: LoadItem[];
}

interface DropsStepProps {
  drops: DropData[];
  activeDropIndex?: number | null;
  onActivateDrop: (index: number) => void;
  onAddDrop: () => void;
  onUpdateDrop: (index: number, drop: DropData) => void;
  onDeleteDrop: (index: number) => void;
}

const LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function DropsStep({
  drops,
  activeDropIndex = null,
  onActivateDrop,
  onAddDrop,
  onUpdateDrop,
  onDeleteDrop,
}: DropsStepProps) {
  const addLoadItem = (dropIndex: number) => {
    const drop = drops[dropIndex];
    onUpdateDrop(dropIndex, {
      ...drop,
      loadItems: [...drop.loadItems, { count: 1, weightKg: 0, type: "" }],
    });
  };

  const updateLoadItem = (
    dropIndex: number,
    itemIndex: number,
    field: keyof LoadItem,
    value: string | number,
  ) => {
    const drop = drops[dropIndex];
    const items = [...drop.loadItems];
    items[itemIndex] = { ...items[itemIndex], [field]: value };
    onUpdateDrop(dropIndex, { ...drop, loadItems: items });
  };

  const removeLoadItem = (dropIndex: number, itemIndex: number) => {
    const drop = drops[dropIndex];
    const items = drop.loadItems.filter((_, i) => i !== itemIndex);
    onUpdateDrop(dropIndex, { ...drop, loadItems: items });
  };

  if (drops.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-600">
        <p>Klikk på kartet for å legge til første leveringspunkt.</p>
        <Button variant="secondary" className="mt-3 text-xs" onClick={onAddDrop}>
          🔴 Legg til leveringspunkt
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Leveringspunkter</h3>
          <p className="text-xs text-gray-500">
            Velg et punkt for å flytte det i kartet, eller legg til et nytt.
          </p>
        </div>
        <Button variant="secondary" className="shrink-0 text-xs" onClick={onAddDrop}>
          + Nytt punkt
        </Button>
      </div>

      {drops.map((drop, di) => (
        <div
          key={di}
          className={`rounded-lg border bg-white p-4 shadow-sm ${
            activeDropIndex === di ? "border-red-300 ring-2 ring-red-100" : "border-gray-200"
          }`}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white">
                {LABELS[di] ?? di + 1}
              </span>
              <span className="text-sm text-gray-600">
                {drop.lat.toFixed(5)}, {drop.lng.toFixed(5)}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant={activeDropIndex === di ? "primary" : "secondary"}
                className="px-2 py-1 text-xs"
                onClick={() => onActivateDrop(di)}
              >
                {activeDropIndex === di ? "Aktivt" : "Flytt"}
              </Button>
              <Button
                variant="danger"
                className="px-2 py-1 text-xs"
                onClick={() => onDeleteDrop(di)}
              >
                Slett
              </Button>
            </div>
          </div>

          <Input
            label="Antall hiv"
            type="number"
            min={1}
            value={String(drop.hpieces)}
            onChange={(e) =>
              onUpdateDrop(di, {
                ...drop,
                hpieces: parseInt(e.target.value) || 1,
              })
            }
            className="mb-3 max-w-[120px]"
          />

          {/* Load items */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Last</p>
            {drop.loadItems.map((item, li) => (
              <div key={li} className="flex items-end gap-2">
                <Input
                  label="Antall"
                  type="number"
                  min={1}
                  value={String(item.count)}
                  onChange={(e) => updateLoadItem(di, li, "count", parseInt(e.target.value) || 1)}
                  className="w-20"
                />
                <Input
                  label="Vekt (kg)"
                  type="number"
                  min={0}
                  value={String(item.weightKg)}
                  onChange={(e) =>
                    updateLoadItem(di, li, "weightKg", parseFloat(e.target.value) || 0)
                  }
                  className="w-24"
                />
                <Input
                  label="Type"
                  value={item.type}
                  onChange={(e) => updateLoadItem(di, li, "type", e.target.value)}
                  placeholder="f.eks. betong"
                  className="flex-1"
                />
                <button
                  onClick={() => removeLoadItem(di, li)}
                  className="mb-1 text-red-500 hover:text-red-700"
                  title="Fjern"
                >
                  ✕
                </button>
              </div>
            ))}
            <Button variant="secondary" className="text-xs" onClick={() => addLoadItem(di)}>
              + Legg til last
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
