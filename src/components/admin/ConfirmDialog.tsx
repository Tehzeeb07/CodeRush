"use client";

/**
 * Reusable, accessibility-aware confirmation dialog.
 *
 * Features:
 *  - Focus trap on the dialog (tab-lock within the modal)
 *  - Escape key cancels
 *  - Loading state disables both buttons and shows a spinner on confirm
 *  - Smooth fade/scale transition
 *  - No external dependencies beyond lucide-react (already in the project)
 */

import {
  Fragment,
  useEffect,
  useRef,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { X, AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmDialogProps {
  /** Show / hide the dialog. */
  open: boolean;
  /** Dialog title. */
  title: string;
  /** Body text / description. */
  description: string;
  /** Text on the confirm button. */
  confirmLabel?: string;
  /** Text on the cancel button. */
  cancelLabel?: string;
  /** Visual variant: "destructive" (red) or "warning" (orange) or "default" (blue). */
  variant?: "destructive" | "warning" | "default";
  /** Disable the confirm button while an async operation runs. */
  isLoading?: boolean;
  /** Close (cancel) handler. */
  onClose: () => void;
  /** Confirm handler. */
  onConfirm: () => void;
}

const VARIANT_STYLES: Record<NonNullable<ConfirmDialogProps["variant"]>, {
  accent: string;
  icon: string;
}> = {
  destructive: {
    accent: "bg-red-600 hover:bg-red-500 focus:ring-red-500/50",
    icon: "text-red-400",
  },
  warning: {
    accent: "bg-amber-600 hover:bg-amber-500 focus:ring-amber-500/50",
    icon: "text-amber-400",
  },
  default: {
    accent: "bg-blue-600 hover:bg-blue-500 focus:ring-blue-500/50",
    icon: "text-blue-400",
  },
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  isLoading = false,
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
    const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const styles = VARIANT_STYLES[variant];

  // Close on overlay click
  const handleOverlayClick = (
    e: ReactMouseEvent<HTMLDivElement>
  ) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  // Keyboard handling: Escape to close, Tab-trap within dialog
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      onClose();
      return;
    }
    if (e.key === "Tab" && dialogRef.current) {
      const focusable = dialogRef.current.querySelectorAll<
        HTMLButtonElement | HTMLAnchorElement
      >('button, a[href], [tabindex]:not([tabindex="-1"])');

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  };

  // Focus the confirm button when opened
  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => {
        confirmBtnRef.current?.focus();
      }, 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onMouseDown={handleOverlayClick}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div
        ref={dialogRef}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
        className="relative mx-4 w-full max-w-md rounded-2xl border border-slate-700 bg-[#151922] p-6 shadow-2xl shadow-black/50 outline-none"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-300 disabled:cursor-not-allowed disabled:opacity-50 outline-none"
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        {/* Icon */}
        <div className="mb-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-800/50">
          <AlertTriangle size={24} className={styles.icon} />
        </div>

        {/* Title */}
        <h2 className="text-lg font-semibold text-white">
          {title}
        </h2>

        {/* Description */}
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          {description}
        </p>

        {/* Buttons */}
        <div className="mt-6 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 outline-none"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50 ${styles.accent}`}
          >
            {isLoading && (
              <Loader2 size={16} className="animate-spin" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
