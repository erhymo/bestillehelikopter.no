"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface ImageUploadProps {
  previews: string[];
  onAdd: (file: File) => Promise<void>;
  onRemove: (index: number) => void;
  loading: boolean;
  error: string | null;
  count: number;
  maxImages: number;
}

export function ImageUpload({
  previews,
  onAdd,
  onRemove,
  loading,
  error,
  count,
  maxImages,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      await onAdd(file);
    }
    // Reset input so same file can be selected again
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Bilder ({count}/{maxImages})
        </h3>
        {count < maxImages && (
          <Button
            variant="secondary"
            className="text-xs"
            onClick={() => inputRef.current?.click()}
            disabled={loading}
          >
            {loading ? <Spinner className="mr-1 h-4 w-4" /> : null}
            + Legg til bilde
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleChange}
        className="hidden"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      {previews.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {previews.map((src, i) => (
            <div key={i} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Bilde ${i + 1}`}
                className="h-24 w-full rounded-lg border border-gray-200 object-cover"
              />
              <button
                onClick={() => onRemove(i)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                title="Fjern"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {previews.length === 0 && (
        <div
          className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-6 text-center text-sm text-gray-600 transition-colors hover:border-blue-400 hover:text-blue-500"
          onClick={() => inputRef.current?.click()}
        >
          Klikk for å legge til bilder (maks {maxImages})
        </div>
      )}
    </div>
  );
}

