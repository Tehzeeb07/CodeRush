"use client";

/**
 * Structured error explanation card (requirements §17–§24, §39).
 *
 * Renders the normalized ParsedError as:
 *   Type → Where → What happened → Possible causes → How to fix → Example
 * plus deterministic quick fixes, "View Raw Error", and clearly-labelled
 * AI-generated explanations (never mixed with compiler facts).
 */

import { useState } from "react";
import type { ParsedError } from "@/lib/error-parsing/types";

const TYPE_META: Record<
    ParsedError["type"],
    { icon: string; label: string; accent: string }
> = {
    compilation_error: { icon: "❌", label: "Compilation Error", accent: "text-red-400" },
    runtime_error: { icon: "❌", label: "Runtime Error", accent: "text-red-400" },
    wrong_answer: { icon: "❌", label: "Wrong Answer", accent: "text-red-400" },
    time_limit: { icon: "⏱", label: "Time Limit Exceeded", accent: "text-amber-300" },
    memory_limit: { icon: "⚠️", label: "Memory Limit Exceeded", accent: "text-amber-300" },
    input_error: { icon: "⚠️", label: "Input Error", accent: "text-amber-300" },
    internal_error: { icon: "🛠", label: "Infrastructure Issue", accent: "text-neutral-300" },
};

const CONFIDENCE_LABELS: Record<ParsedError["confidence"], string> = {
    certain: "✓ Confirmed by the compiler/runtime",
    probable: "≈ Likely cause — verify against your code",
    speculative: "? Speculative hint — not a confirmed diagnosis",
};

export interface ErrorDetailsCardProps {
    error: ParsedError;
    problemTitle?: string;
    /** Apply a staged quick fix through the editor. */
    onApplyQuickFix?: () => void;
    /** Navigate editor to error.line. */
    onGoToError?: () => void;
}

export default function ErrorDetailsCard({
    error,
    problemTitle,
    onApplyQuickFix,
    onGoToError,
}: ErrorDetailsCardProps) {
    const [showRaw, setShowRaw] = useState(false);
    const meta = TYPE_META[error.type] ?? TYPE_META.runtime_error;

    return (
        <article
            role="status"
            aria-label={`${meta.label} details`}
            className="overflow-hidden rounded-xl border border-neutral-800 bg-[var(--bg-card,#14171d)]"
        >
            {/* Header */}
            <header className="flex flex-wrap items-center gap-2 border-b border-neutral-800 px-4 py-3">
                <span className={`text-base ${meta.accent}`}>{meta.icon}</span>
                <h3 className={`font-semibold ${meta.accent}`}>{meta.label}</h3>
                <span className="rounded-full border border-neutral-700 px-2 py-0.5 text-[11px] text-neutral-400">
                    {error.source}
                </span>
            </header>

            <div className="space-y-4 px-4 py-4 text-sm leading-relaxed text-neutral-300">
                {/* Location */}
                {(error.line !== null || error.column !== null) && (
                    <p className="font-mono text-xs text-neutral-400">
                        Line {error.line ?? "?"}
                        {error.column !== null ? `, Column ${error.column}` : ""}
                    </p>
                )}

                {/* Headline */}
                <p className="font-medium text-white">{error.title}</p>

                {/* Confidence */}
                <p className="text-xs italic text-neutral-500">
                    {CONFIDENCE_LABELS[error.confidence]}
                </p>

                {/* What happened */}
                <Section title="What happened?">{error.explanation}</Section>

                {/* Possible causes */}
                {error.possibleCauses.length > 0 && (
                    <Section title="Possible causes">
                        <ul className="list-disc space-y-1 pl-5">
                            {error.possibleCauses.map((c) => (
                                <li key={c}>{c}</li>
                            ))}
                        </ul>
                    </Section>
                )}

                {/* How to fix */}
                {error.suggestedFix.length > 0 && (
                    <Section title="How to fix">
                        <ul className="list-disc space-y-1 pl-5">
                            {error.suggestedFix.map((f) => (
                                <li key={f}>{f}</li>
                            ))}
                        </ul>
                    </Section>
                )}

                {/* Example */}
                {error.fixExample && (
                    <Section title="Example">
                        <pre className="mt-1 overflow-x-auto rounded-md bg-black/40 p-2.5 font-mono text-xs text-emerald-200">
                            {error.fixExample}
                        </pre>
                    </Section>
                )}


                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-1">
                    {error.line !== null && onGoToError && (
                        <button
                            type="button"
                            onClick={onGoToError}
                            className="rounded-md border border-indigo-500/50 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-300 transition-colors hover:bg-indigo-500/20"
                        >
                            ⤓ Go to Error
                        </button>
                    )}
                    {error.quickFix && onApplyQuickFix && (
                        <button
                            type="button"
                            onClick={onApplyQuickFix}
                            title="Apply this mechanical fix (you will see the change in the editor)"
                            className="rounded-md border border-emerald-500/50 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20"
                        >
                            {error.quickFix.label}
                        </button>
                    )}
                    <ExplainWithAI
                        error={error}
                        problemTitle={problemTitle}
                    />
                    <button
                        type="button"
                        onClick={() => setShowRaw((v) => !v)}
                        aria-expanded={showRaw}
                        className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-400 transition-colors hover:text-neutral-200"
                    >
                        {showRaw ? "Hide Raw Error" : "View Raw Error"}
                    </button>
                </div>

                {/* Raw toolchain output — expert mode */}
                {showRaw && (
                    <pre
                        aria-label="Raw compiler output"
                        className="max-h-56 overflow-auto rounded-md bg-black/40 p-2.5 font-mono text-[11px] leading-relaxed text-neutral-400"
                    >
                        {error.rawMessage || "(no raw output recorded)"}
                    </pre>
                )}
            </div>
        </article>
    );
}

function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section aria-label={title}>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                {title}
            </h4>
            <div>{children}</div>
        </section>
    );
}

// ---------------------------------------------------------------------------
// AI-assisted explanation (requirement §22) — clearly separated from
// deterministic diagnostics. Anything rendered here is AI output.
// ---------------------------------------------------------------------------

function ExplainWithAI({
    error,
    problemTitle,
}: {
    error: ParsedError;
    problemTitle?: string;
}) {
    const [activeMode, setActiveMode] = useState<"explain" | "hint" | "fix" | null>(null);
    const [state, setState] = useState<
        "idle" | "loading" | "ready" | "unavailable" | "error"
    >("idle");
    const [text, setText] = useState("");

    async function request(mode: "explain" | "hint" | "fix") {
        setActiveMode(mode);
        setState("loading");
        try {
            const res = await fetch("/api/ai/explain-error", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mode,
                    language: error.source.split("/")[0],
                    errorTitle: error.title,
                    rawMessage: error.rawMessage.slice(0, 2500),
                    line: error.line,
                    problemContext: problemTitle,
                }),
            });
            if (!res.ok) throw new Error(String(res.status));
            const data = (await res.json()) as {
                available?: boolean;
                explanation?: string;
                error?: string;
            };
            if (data.available === false) {
                setState("unavailable");
                return;
            }
            if (data.error) {
                setText(data.error);
                setState("error");
                return;
            }
            setText(data.explanation ?? "");
            setState("ready");
        } catch {
            setText("Could not reach the AI service.");
            setState("error");
        }
    }

    return (
        <div className="w-full space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
                <button
                    type="button"
                    onClick={() => void request("explain")}
                    disabled={state === "loading"}
                    title="Explain what this error means and concepts behind it"
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                        activeMode === "explain" && state === "ready"
                            ? "border-violet-400 bg-violet-500/30 text-white"
                            : "border-violet-500/40 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20"
                    } disabled:opacity-50`}
                >
                    ✨ Explain Error
                </button>
                <button
                    type="button"
                    onClick={() => void request("hint")}
                    disabled={state === "loading"}
                    title="Get a pedagogical hint without spoiling the complete solution"
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                        activeMode === "hint" && state === "ready"
                            ? "border-amber-400 bg-amber-500/30 text-white"
                            : "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                    } disabled:opacity-50`}
                >
                    💡 Give Hint
                </button>
                <button
                    type="button"
                    onClick={() => void request("fix")}
                    disabled={state === "loading"}
                    title="Suggest safe ways to fix this specific syntax or runtime issue"
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                        activeMode === "fix" && state === "ready"
                            ? "border-emerald-400 bg-emerald-500/30 text-white"
                            : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                    } disabled:opacity-50`}
                >
                    🔧 Show Possible Fix
                </button>

                {state === "loading" && (
                    <span className="flex items-center gap-1.5 text-xs text-neutral-400" role="status">
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
                        Analyzing with AI…
                    </span>
                )}
            </div>

            {state === "unavailable" && (
                <p className="text-xs text-neutral-500">
                    AI assistance is available when OPENAI_API_KEY is configured.
                </p>
            )}

            {(state === "ready" || state === "error") && (
                <div
                    className="w-full rounded-lg border border-violet-500/30 bg-violet-500/5 p-3.5"
                    role="status"
                >
                    <div className="mb-1.5 flex items-center justify-between">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-300">
                            {activeMode === "hint" ? "💡 AI Hint" : activeMode === "fix" ? "🔧 AI Fix Suggestion" : "✨ AI Explanation"} · Possible cause (not compiler diagnosis)
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                setState("idle");
                                setActiveMode(null);
                                setText("");
                            }}
                            className="text-[10px] text-neutral-500 hover:text-neutral-300"
                        >
                            Dismiss
                        </button>
                    </div>
                    <div className="whitespace-pre-wrap text-xs leading-relaxed text-neutral-200">
                        {text}
                    </div>
                </div>
            )}
        </div>
    );
}

