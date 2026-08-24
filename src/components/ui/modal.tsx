"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /**
   * "dialog" (default) uses the native <dialog> top layer, which always
   * paints above every other element regardless of z-index — fine for
   * ordinary content, but it also paints over third-party overlays like
   * Google's reCAPTCHA challenge, which can never out-rank the top layer.
   * Use "overlay" for modals that may need to yield to such overlays.
   */
  variant?: "dialog" | "overlay";
}

export function Modal({ open, onClose, title, children, variant = "dialog" }: ModalProps) {
  if (variant === "overlay") {
    return (
      <OverlayModal open={open} onClose={onClose} title={title}>
        {children}
      </OverlayModal>
    );
  }

  return (
    <DialogModal open={open} onClose={onClose} title={title}>
      {children}
    </DialogModal>
  );
}

function ModalChrome({
  onClose,
  title,
  children,
}: {
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  return (
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
  );
}

function DialogModal({ open, onClose, title, children }: Omit<ModalProps, "variant">) {
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
      <ModalChrome onClose={onClose} title={title}>
        {children}
      </ModalChrome>
    </dialog>
  );
}

/**
 * Same look as DialogModal, but a plain fixed-position overlay instead of
 * the native <dialog> top layer, so third-party overlays (reCAPTCHA's
 * challenge) can still render above it.
 */
function OverlayModal({ open, onClose, title, children }: Omit<ModalProps, "variant">) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-xl bg-white p-0 shadow-xl">
        <ModalChrome onClose={onClose} title={title}>
          {children}
        </ModalChrome>
      </div>
    </div>
  );
}
