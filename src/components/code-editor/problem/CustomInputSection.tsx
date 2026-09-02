"use client";

/**
 * Custom stdin panel — displayed in the Test Result area.
 * The "Run Code" button on the problem page opens this section.
 * When the user enters input and clicks "Run Code", the code is
 * executed using EXACTLY that input as stdin.
 */

import { useRef, useEffect } from "react";

export default function CustomInputSection({
    value,
    onChange,
    onRun,
    running,
    maxBytes,
    open,
    onOpenChange,
}: {
    value: string;
    onChange: (v: string) => void;
    onRun: () => void;
    running: boolean;
    maxBytes: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const bytes = new TextEncoder().encode(value).length;

    // Auto-focus the textarea when the panel opens
    useEffect(() => {
        if (open && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [open]);

    return (
        <section
            aria-label="Custom input"
            className="border-t border-neutral-800 bg-[var(--bg-card,#14171d)] transition-colors"
        >
            <div className="flex items-center justify-between px-4 py-2">
                <button
                    type="button"
                    onClick={() => onOpenChange(!open)}
                    className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400 transition-colors hover:text-neutral-200"
                    aria-expanded={open}
                >
                    <span
                        className="text-[10px] text-neutral-500 transition-transform duration-200"
                        style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
                    >
                        ▶
                    </span>
                    <span>Input</span>
                    {value.trim().length > 0 && !open && (
                        <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] text-indigo-300 font-normal lowercase">
                            configured
                        </span>
                    )}
                </button>
                <div className="flex items-center gap-3">
                    <span
                        className={`text-[11px] ${
                            bytes > maxBytes ? "text-red-400" : "text-neutral-600"
                        }`}
                    >
                        {bytes} / {maxBytes} bytes
                    </span>
                    <button
                        type="button"
                        onClick={() => onOpenChange(!open)}
                        className="text-xs text-indigo-400 hover:text-indigo-300"
                    >
                        {open ? "Hide" : "Open"}
                    </button>
                </div>
            </div>
            {open && (
                <div className="border-t border-neutral-800/60 px-4 py-3">
                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={
                            "Enter your program input here.\nExample:\n5 6\n\nThis input is passed directly to your program as stdin."
                        }
                        aria-label="Custom stdin passed to your program"
                        spellCheck={false}
                        className="min-h-[88px] w-full resize-y rounded-lg border border-neutral-800 bg-black/40 p-3 font-mono text-sm text-neutral-200 outline-none transition-colors focus:border-indigo-500/60"
                    />
                    <div className="mt-2 flex items-center justify-between">
                        <button
                            type="button"
                            onClick={onRun}
                            disabled={running || bytes > maxBytes || value.trim().length === 0}
                            title="Run code using exactly this input"
                            className="inline-flex items-center gap-2 rounded-md border border-indigo-500/50 bg-indigo-500/10 px-3.5 py-1.5 text-sm font-medium text-indigo-300 transition-colors hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {running ? (
                                <span
                                    aria-hidden="true"
                                    className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-300 border-t-transparent"
                                />
                            ) : null}
                            {running ? "Running…" : "Run Code"}
                        </button>
                        {value.length > 0 && (
                            <button
                                type="button"
                                onClick={() => onChange("")}
                                className="text-xs text-neutral-500 hover:text-neutral-300"
                            >
                                Clear Input
                            </button>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}
