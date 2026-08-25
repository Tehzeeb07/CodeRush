"use client";

/**
 * Minimal dependency-free toast notifications, styled to match the
 * CodeRush dark theme. Pages own their toast state via `useToasts`
 * and render the stack with <ToastStack />.
 */

import { useCallback, useRef, useState } from "react";

export interface ToastItem {
    id: number;
    message: string;
    kind: "success" | "error" | "info";
}

export function useToasts() {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const nextId = useRef(0);

    const dismiss = useCallback((id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const push = useCallback(
        (message: string, kind: ToastItem["kind"] = "info") => {
            const id = ++nextId.current;
            setToasts((prev) => [...prev, { id, message, kind }]);
            window.setTimeout(() => dismiss(id), 3000);
        },
        [dismiss],
    );

    return { toasts, push };
}

const KIND_STYLES: Record<ToastItem["kind"], string> = {
    success: "border-emerald-700 bg-emerald-950 text-emerald-100",
    error: "border-red-800 bg-red-950 text-red-100",
    info: "border-neutral-700 bg-neutral-900 text-neutral-100",
};

export function ToastStack({ toasts }: { toasts: ToastItem[] }) {
    if (toasts.length === 0) return null;

    return (
        <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    role="status"
                    className={`pointer-events-auto rounded-md border px-4 py-2 text-sm shadow-lg ${KIND_STYLES[toast.kind]}`}
                >
                    {toast.message}
                </div>
            ))}
        </div>
    );
}
