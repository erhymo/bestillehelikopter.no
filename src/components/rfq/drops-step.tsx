"use client";

import { useState } from "react";
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
  onUpdateDrop: (index: number, drop: DropData) => void;
  onDeleteDrop: (index: number) => void;
}

const LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function DropsStep({
  drops,
  activeDropIndex = null,
  onActivateDrop,
  onUpdateDrop,
  onDeleteDrop,
}: DropsStepProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggleExpanded = (index: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

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

  // Nothing to show until at least one drop exists — the "2 Leveringspunkt"
  // / "+ Leveringspunkt" toolbar buttons above the map are the entry point.
  if (drops.length === 0) return null;

  return (
    <div className="space-y-2">
      {drops.map((drop, di) => (
        <div
          key={di}
          className={`rounded-lg border bg-white p-2.5 text-sm shadow-sm ${
            activeDropIndex === di ? "border-red-300 ring-2 ring-red-100" : "border-gray-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
              {LABELS[di] ?? di + 1}
            </span>
            <span className="flex-1 text-gray-600">
              Leveringspunkt · {drop.lat.toFixed(5)}, {drop.lng.toFixed(5)}
            </span>
            <button
              type="button"
              onClick={() => onActivateDrop(di)}
              className="shrink-0 text-xs text-blue-600 hover:text-blue-800"
            >
              {activeDropIndex === di ? "Klikk i kartet" : "Flytt"}
            </button>
            <button
              type="button"
              onClick={() => onDeleteDrop(di)}
              className="shrink-0 text-xs text-red-600 hover:text-red-800"
            >
              Slett
            </button>
          </div>

          <div className="mt-2 flex items-center gap-3 pl-9">
            <label className="flex items-center gap-1.5 text-xs text-gray-600">
              Antall hiv
              <input
                type="number"
                min={1}
                value={drop.hpieces}
                onChange={(e) =>
                  onUpdateDrop(di, {
                    ...drop,
                    hpieces: parseInt(e.target.value) || 1,
                  })
                }
                className="w-14 rounded border border-gray-300 px-1.5 py-0.5 text-xs"
              />
            </label>
            <button
              type="button"
              onClick={() => toggleExpanded(di)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              {expanded.has(di) ? "▾" : "▸"} Last
              {drop.loadItems.length > 0 ? ` (${drop.loadItems.length})` : ""}
            </button>
          </div>

          {expanded.has(di) && (
            <div className="mt-2 space-y-2 border-t border-gray-100 pt-2 pl-9">
              {drop.loadItems.map((item, li) => (
                <div key={li} className="flex items-end gap-2">
                  <Input
                    label="Antall"
                    type="number"
                    min={1}
                    value={String(item.count)}
                    onChange={(e) => updateLoadItem(di, li, "count", parseInt(e.target.value) || 1)}
                    className="w-16"
                  />
                  <Input
                    label="Vekt (kg)"
                    type="number"
                    min={0}
                    value={String(item.weightKg)}
                    onChange={(e) =>
                      updateLoadItem(di, li, "weightKg", parseFloat(e.target.value) || 0)
                    }
                    className="w-20"
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
          )}
        </div>
      ))}
    </div>
  );
}
