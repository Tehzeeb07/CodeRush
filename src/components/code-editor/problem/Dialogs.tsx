"use client";

/**
 * Confirmation / information dialogs (requirements §28, §27, §30).
 * Small dependency-free modals styled after the CodeRush design system.
 */

import { useEffect } from "react";

function ModalShell({
    title,
    children,
    onClose,
    labelledBy,
}: {
    title: string;
    children: React.ReactNode;
    onClose: () => void;
    labelledBy?: string;
}) {
    // Escape closes; lock page scroll while open.
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }
        document.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            role="presentation"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={labelledBy ?? "dialog-title"}
                className="animate-[crScaleIn_160ms_ease] w-full max-w-md rounded-2xl border border-neutral-800 bg-[var(--bg-card,#14171d)] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
            >
                <h2
                    id="dialog-title"
                    className="mb-3 text-base font-semibold text-white"
                >
                    {title}
                </h2>
                {children}
            </div>
        </div>
    );
}

export interface ConfirmDialogProps {
    open: boolean;
    title: string;
    body: string;
    confirmLabel: string;
    cancelLabel?: string;
    destructive?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({
    open,
    title,
    body,
    confirmLabel,
    cancelLabel = "Cancel",
    destructive = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    if (!open) return null;
    return (
        <ModalShell title={title} onClose={onCancel}>
            <p className="text-sm leading-relaxed text-neutral-300">{body}</p>
            <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-200 transition-colors hover:border-neutral-500">
                    {cancelLabel}
                </button>
                <button
                    type="button"
                    onClick={onConfirm}
                    autoFocus
                    className={
                        destructive
                            ? "rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500"
                            : "primary-button !py-2 !text-sm"
                    }
                >
                    {confirmLabel}
                </button>
            </div>
        </ModalShell>
    );
}


/** Restore-unsaved-draft prompt (requirement §27). */
export function RestoreDraftDialog({
    open,
    savedAtLabel,
    onRestore,
    onDiscard,
}: {
    open: boolean;
    savedAtLabel: string;
    onRestore: () => void;
    onDiscard: () => void;
}) {
    if (!open) return null;
    return (
        <ModalShell title="We found an unsaved draft" onClose={onDiscard}>
            <p className="text-sm leading-relaxed text-neutral-300">
                Restore your previous code? It was last saved {savedAtLabel}.
                Discarding keeps the current editor content.
            </p>
            <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={onDiscard} className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-200 transition-colors hover:border-neutral-500">
                    Discard
                </button>
                <button type="button" onClick={onRestore} autoFocus className="primary-button !py-2 !text-sm">
                    Restore
                </button>
            </div>
        </ModalShell>
    );
}

/** Viewer dialog for a stored submission's source code (§31). */
export function ViewCodeDialog({
    open,
    title,
    onClose,
    children,
}: {
    open: boolean;
    title: string;
    onClose: () => void;
    children: React.ReactNode;
}) {
    if (!open) return null;
    return (
        <ModalShell title={title} onClose={onClose}>
            {children}
            <div className="mt-4 flex justify-end">
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-200 transition-colors hover:border-neutral-500"
                >
                    Close
                </button>
            </div>
        </ModalShell>
    );
}

/** Live-updating pre block that loads via useQuery in the parent tree. */
export function LoadingHint() {
    return <p className="p-4 text-sm text-neutral-500">Loading…</p>;
}


/** Submit confirmation (requirement §30). */
export function SubmitConfirmDialog({
    open,
    language,
    problemTitle,
    hiddenCount,
    submitting,
    onSubmit,
    onCancel,
}: {
    open: boolean;
    language: string;
    problemTitle: string;
    hiddenCount: number;
    submitting: boolean;
    onSubmit: () => void;
    onCancel: () => void;
}) {
    if (!open) return null;
    return (
        <ModalShell title="Submit Solution?" onClose={onCancel}>
            <dl className="space-y-1.5 text-sm text-neutral-300">
                <div className="flex justify-between gap-6">
                    <dt className="text-neutral-500">Language</dt>
                    <dd>{language}</dd>
                </div>
                <div className="flex justify-between gap-6">
                    <dt className="text-neutral-500">Problem</dt>
                    <dd>{problemTitle}</dd>
                </div>
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-neutral-500">
                Your code will be evaluated against public and{" "}
                {hiddenCount > 0 ? `${hiddenCount} hidden` : "all"} test cases.
                Hidden inputs stay confidential — only the verdict is shown.
            </p>
            <div className="mt-5 flex justify-end gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={submitting}
                    className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-200 transition-colors hover:border-neutral-500 disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={onSubmit}
                    disabled={submitting}
                    autoFocus
                    className="primary-button !py-2 !text-sm disabled:opacity-60"
                >
                    {submitting ? "⟳ Submitting…" : "Submit"}
                </button>
            </div>
        </ModalShell>
    );
}
