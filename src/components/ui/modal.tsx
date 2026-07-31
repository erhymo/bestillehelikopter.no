"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        // Click on the ::backdrop lands directly on the <dialog> element
        // itself (children never do, since they're inside nested divs) —
        // treat that as "click outside" and close, matching how most
        // modal libraries behave.
        if (e.target === dialogRef.current) onClose();
      }}
      className="fixed top-1/2 left-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-0 shadow-xl backdrop:bg-black/50"
    >
      <div className="relative p-6">
        <button
          type="button"
          onClick={onClose}
          aria-label="Lukk"
          className="absolute top-4 right-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
        {title && <h2 className="mb-4 pr-8 text-lg font-semibold">{title}</h2>}
        {children}
      </div>
    </dialog>
  );
}

