"use client";

import { useState, useCallback } from "react";
import imageCompression from "browser-image-compression";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase/client";

const MAX_IMAGES = 5;
const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: "image/webp" as const,
};

interface ImageEntry {
  file: File;
  preview: string;
}

export function useImageUpload() {
  const [entries, setEntries] = useState<ImageEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addImage = useCallback(async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      setEntries((prev) => {
        if (prev.length >= MAX_IMAGES) {
          setError(`Maks ${MAX_IMAGES} bilder tillatt`);
          return prev;
        }
        return prev; // will be updated after compression
      });

      const compressed = await imageCompression(file, COMPRESSION_OPTIONS);
      const preview = URL.createObjectURL(compressed);

      setEntries((prev) => {
        if (prev.length >= MAX_IMAGES) {
          URL.revokeObjectURL(preview);
          setError(`Maks ${MAX_IMAGES} bilder tillatt`);
          return prev;
        }
        return [...prev, { file: compressed, preview }];
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Kunne ikke komprimere bildet",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const removeImage = useCallback((index: number) => {
    setEntries((prev) => {
      const copy = [...prev];
      const removed = copy.splice(index, 1);
      removed.forEach((e) => URL.revokeObjectURL(e.preview));
      return copy;
    });
  }, []);

  const uploadAll = useCallback(
    async (jobId: string): Promise<string[]> => {
      setError(null);
      setLoading(true);
      try {
        const paths: string[] = [];
        for (let i = 0; i < entries.length; i++) {
          const storagePath = `images/${jobId}/${i}.webp`;
          const storageRef = ref(storage, storagePath);
          await uploadBytes(storageRef, entries[i].file, {
            contentType: "image/webp",
          });
          const url = await getDownloadURL(storageRef);
          paths.push(url);
        }
        return paths;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Feil ved opplasting av bilder";
        setError(msg);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [entries],
  );

  return {
    images: entries.map((e) => e.file),
    previews: entries.map((e) => e.preview),
    addImage,
    removeImage,
    uploadAll,
    loading,
    error,
    count: entries.length,
    maxImages: MAX_IMAGES,
  };
}

