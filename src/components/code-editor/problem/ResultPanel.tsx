"use client";

/**
 * Bottom result panel (requirements §14–§16, §18).
 * Tabs: Test Results | Output | Errors | Submission.
 */

import { useState } from "react";
import type { JudgeResponse, SubmissionSummary } from "@/lib/judge/types";

import ErrorDetailsCard from "./ErrorDetailsCard";
import SubmissionHistory from "./SubmissionHistory";

export type ResultTab = "tests" | "output" | "errors" | "submission";

const STATUS_ICON: Record<string, string> = {
    accepted: "✓",
    wrong_answer: "✕",
    compilation_error: "❌",
    runtime_error: "✕",
    timeout: "⏱",
    memory_limit: "⚠️",
};

const STATUS_COLOR: Record<string, string> = {
    accepted: "text-emerald-400",
    wrong_answer: "text-red-400",
    compilation_error: "text-red-400",
    runtime_error: "text-red-400",
    timeout: "text-amber-300",
    memory_limit: "text-amber-300",
};

const OUTCOME_BANNER: Record<string, { icon: string; label: string; sub: string; className: string }> = {
    accepted: {
        icon: "✓",
        label: "Accepted",
        sub: "All test cases passed.",
        className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    },
    wrong_answer: {
        icon: "✕",
        label: "Wrong Answer",
        sub: "One or more test cases did not match.",
        className: "border-red-500/40 bg-red-500/10 text-red-300",
    },
    compilation_error: {
        icon: "❌",
        label: "Compilation Error",
        sub: "Your code could not be compiled.",
        className: "border-red-500/40 bg-red-500/10 text-red-300",
    },
    runtime_error: {
        icon: "❌",
        label: "Runtime Error",
        sub: "Your program crashed during execution.",
        className: "border-red-500/40 bg-red-500/10 text-red-300",
    },
    time_limit_exceeded: {
        icon: "⏱",
        label: "Time Limit Exceeded",
        sub: "Your program was too slow.",
        className: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    },
    memory_limit_exceeded: {
        icon: "⚠️",
        label: "Memory Limit Exceeded",
        sub: "Your program used too much memory.",
        className: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    },
    internal_error: {
        icon: "🛠",
        label: "Infrastructure Issue",
        sub: "Please retry — this is not your code.",
        className: "border-neutral-600/50 bg-neutral-700/20 text-neutral-200",
    },
};

export interface ResultPanelProps {
    result: JudgeResponse | null;
    running: boolean;
    tab: ResultTab;
    onTabChange: (t: ResultTab) => void;
    problemTitle?: string;

    submissions: SubmissionSummary[] | null;
    submissionsLoading: boolean;
    signedIn: boolean;
    onSelectSubmission: (id: string) => void;

    onGoToError: (line: number) => void;
    onApplyQuickFix: () => void;
}

export default function ResultPanel({
    result,
    running,
    tab,
    onTabChange,
    problemTitle,
    submissions,
    submissionsLoading,
    signedIn,
    onSelectSubmission,
    onGoToError,
    onApplyQuickFix,
}: ResultPanelProps) {
    const [openCase, setOpenCase] = useState<string | null>(null);

    const tabs: Array<{ id: ResultTab; label: string }> = [
        { id: "tests", label: "Test Results" },
        { id: "output", label: "Output" },
        { id: "errors", label: `Errors${result?.error ? " ●" : ""}` },
        { id: "submission", label: "Submission" },
    ];

    return (
        <section
            aria-label="Execution results"
            className="border-t border-neutral-800 bg-[var(--bg-secondary,#0d0f12)]"
        >
            {/* Tab bar */}
            <div
                role="tablist"
                aria-label="Result sections"
                className="flex border-b border-neutral-800 px-2"
            >
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        role="tab"
                        aria-selected={tab === t.id}
                        onClick={() => onTabChange(t.id)}
                        className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                            tab === t.id
                                ? "border-b-2 border-indigo-500 text-white"
                                : "border-b-2 border-transparent text-neutral-400 hover:text-neutral-200"
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
                {running && (
                    <span
                        role="status"
                        className="ml-auto flex items-center gap-2 py-2 text-xs text-indigo-300"
                    >
                        <span
                            aria-hidden="true"
                            className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-300 border-t-transparent"
                        />
                        Running your code…
                    </span>
                )}
            </div>

            <div className="max-h-[42vh] min-h-[120px] overflow-y-auto">
                {tab === "tests" && (
                    <TestResultsTab
                        result={result}
                        running={running}
                        openCase={openCase}
                        setOpenCase={setOpenCase}
                    />
                )}
                {tab === "output" && <OutputTab result={result} />}
                {tab === "errors" && (
                    <ErrorsTab
                        result={result}
                        problemTitle={problemTitle}
                        onGoToError={onGoToError}
                        onApplyQuickFix={onApplyQuickFix}
                    />
                )}
                {tab === "submission" && (
                    <SubmissionHistory
                        submissions={submissions}
                        loading={submissionsLoading}
                        signedIn={signedIn}
                        onSelect={onSelectSubmission}
                    />
                )}
            </div>
        </section>
    );
}

// ---------------------------------------------------------------------------
// Test Results tab — per-test visualization with expandable details
// ---------------------------------------------------------------------------

function TestResultsTab({
    result,
    running,
    openCase,
    setOpenCase,
}: {
    result: JudgeResponse | null;
    running: boolean;
    openCase: string | null;
    setOpenCase: (id: string | null) => void;
}) {
    if (running) {
        return (
            <div className="space-y-2 p-4">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="skeleton h-8 w-full rounded-lg" />
                ))}
            </div>
        );
    }
    if (!result || result.testResults.length === 0) {
        return (
            <p className="p-4 text-sm text-neutral-500">
                Run your code against the sample tests, or submit to be judged
                on every test case.
            </p>
        );
    }

    const banner =
        OUTCOME_BANNER[result.outcome] ?? OUTCOME_BANNER.internal_error;

    return (
        <div>
            <div
                role="status"
                className={`mx-4 mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border px-4 py-3 ${banner.className}`}
            >
                <span className="text-lg">{banner.icon}</span>
                <div>
                    <p className="font-semibold">{banner.label}</p>
                    <p className="text-xs opacity-80">{banner.sub}</p>
                </div>
                <span className="ml-auto text-sm font-medium tabular-nums">
                    {result.passedCount} / {result.totalCount} test cases
                </span>
            </div>

            {(result.totalRuntimeMs > 0 || result.maxMemoryKb !== null) && (
                <p className="mx-6 mt-2 text-xs text-neutral-500">
                    Runtime {result.totalRuntimeMs} ms
                    {result.maxMemoryKb !== null &&
                        ` · Memory ${(result.maxMemoryKb / 1024).toFixed(1)} MB`}
                </p>
            )}

            <ul className="space-y-1 p-4">
                {result.testResults.map((tc) => {
                    const color = STATUS_COLOR[tc.status] ?? "text-neutral-400";
                    const icon = STATUS_ICON[tc.status] ?? "•";
                    const expanded = openCase === tc.id;
                    return (
                        <li key={tc.id}>
                            <button
                                type="button"
                                aria-expanded={expanded}
                                onClick={() => setOpenCase(expanded ? null : tc.id)}
                                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/[0.04]"
                            >
                                <span className={`font-semibold ${color}`}>{icon}</span>
                                <span className="flex-1 text-sm text-neutral-200">
                                    Test Case {tc.index}
                                    {tc.hidden && (
                                        <span className="ml-2 rounded border border-neutral-700 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-neutral-500">
                                            Hidden
                                        </span>
                                    )}
                                </span>
                                <span className={`text-xs font-medium capitalize ${color}`}>
                                    {tc.status.replace(/_/g, " ")}
                                </span>
                                <span className="w-16 shrink-0 text-right text-xs tabular-nums text-neutral-600">
                                    {tc.executionTimeMs} ms
                                </span>
                            </button>

                            {expanded && (
                                <div className="mb-2 space-y-2 rounded-lg border border-neutral-800 bg-black/30 p-3">
                                    {tc.hidden ? (
                                        <p className="text-xs text-neutral-400">
                                            🔒 Hidden test — input and expected
                                            output stay confidential. Only the
                                            verdict and timing are shown.
                                        </p>
                                    ) : (
                                        <>
                                            <DetailBlock label="Input" content={tc.input ?? ""} />
                                            {tc.status === "wrong_answer" && (
                                                <>
                                                    <DetailBlock label="Expected Output" content={tc.expectedOutput ?? ""} />
                                                    <DetailBlock label="Your Output" content={tc.actualOutput ?? ""} />
                                                </>
                                            )}
                                            <p className={`text-xs font-semibold ${color}`}>
                                                {icon}{" "}
                                                {tc.status === "accepted"
                                                    ? "Passed"
                                                    : tc.status === "compilation_error"
                                                      ? "Compilation error"
                                                      : tc.status === "timeout"
                                                        ? "Exceeded time limit"
                                                        : tc.status === "runtime_error"
                                                          ? "Crashed"
                                                          : tc.status === "memory_limit"
                                                            ? "Memory limit exceeded"
                                                            : "Wrong Answer"}
                                            </p>
                                        </>
                                    )}
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Output tab — stdout/stderr + custom-input run stats
// ---------------------------------------------------------------------------

function OutputTab({ result }: { result: JudgeResponse | null }) {
    if (!result) {
        return (
            <p className="p-4 text-sm text-neutral-500">
                Program output will appear here after you run it.
            </p>
        );
    }

    if (result.mode === "custom" && result.custom) {
        return (
            <div className="space-y-3 p-4">
                <div className="flex flex-wrap gap-4 text-xs text-neutral-500">
                    <span>Execution time {result.custom.executionTimeMs} ms</span>
                    {result.custom.memoryUsageKb !== null && (
                        <span>Memory {(result.custom.memoryUsageKb / 1024).toFixed(1)} MB</span>
                    )}
                    <span>Exit code {result.custom.exitCode ?? "killed"}</span>
                </div>
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Stdout</p>
                    <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-black/40 p-2.5 font-mono text-xs text-neutral-200">
                        {result.custom.stdout.length > 0 ? result.custom.stdout : "(no output)"}
                    </pre>
                </div>
                {result.custom.stderr.length > 0 && (
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-red-400/80">Stderr</p>
                        <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-black/40 p-2.5 font-mono text-xs text-red-200/90">
                            {result.custom.stderr}
                        </pre>
                    </div>
                )}
            </div>
        );
    }

    const stdout = result.testResults.find(
        (t) => !t.hidden && t.actualOutput !== null,
    );
    return (
        <div className="p-4">
            {stdout ? (
                <>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                        Your output (last visible test)
                    </p>
                    <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-black/40 p-2.5 font-mono text-xs text-neutral-200">
                        {stdout.actualOutput}
                    </pre>
                </>
            ) : (
                <p className="text-sm text-neutral-500">
                    No program output recorded. Use Custom Input to see raw
                    stdout directly.
                </p>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Errors tab — structured explanation or the all-clear
// ---------------------------------------------------------------------------

function ErrorsTab({
    result,
    problemTitle,
    onGoToError,
    onApplyQuickFix,
}: {
    result: JudgeResponse | null;
    problemTitle?: string;
    onGoToError: (line: number) => void;
    onApplyQuickFix: () => void;
}) {
    if (result?.error) {
        return (
            <div className="p-4">
                <ErrorDetailsCard
                    error={result.error}
                    problemTitle={problemTitle}
                    onApplyQuickFix={
                        result.error.quickFix ? onApplyQuickFix : undefined
                    }
                    onGoToError={
                        result.error.line !== null
                            ? () => onGoToError(result.error!.line as number)
                            : undefined
                    }
                />
            </div>
        );
    }

    // Wrong answer without a compiler/runtime error gets its own
    // checklist-style card (requirement §18) — no invented bug claims.
    if (result && result.outcome === "wrong_answer") {
        return (
            <div className="p-4">
                <ErrorDetailsCard
                    error={{
                        type: "wrong_answer",
                        source: "judge/diff",
                        title: `Wrong Answer — Test Case ${
                            result.testResults.find((t) => t.status === "wrong_answer")
                                ?.index ?? "?"
                        }`,
                        rawMessage: "",
                        line: null,
                        column: null,
                        severity: "error",
                        confidence: "certain",
                        explanation:
                            "Your program finished but produced output that differs from the expected answer.",
                        possibleCauses: [
                            "Duplicate elements in the input dataset",
                            "Boundary conditions or edge cases (e.g. empty or 1-element input)",
                            "Minimum or maximum constraint values overflow or out-of-range",
                        ],
                        suggestedFix: [
                            "Compare expected vs actual output for the failing case in Test Results.",
                            "Re-check edge cases and output formatting (trailing spaces/newlines are ignored).",
                        ],
                        fixExample: null,
                    }}
                    problemTitle={problemTitle}
                />
            </div>
        );
    }

    if (result && result.ok) {
        return (
            <p className="p-4 text-sm text-emerald-400" role="status">
                ✓ No errors — great job!
            </p>
        );
    }

    return (
        <p className="p-4 text-sm text-neutral-500">
            Structured diagnostics appear here when something fails.
        </p>
    );
}

function DetailBlock({ label, content }: { label: string; content: string }) {
    return (
        <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                {label}
            </p>
            <pre className="mt-0.5 max-h-32 overflow-auto whitespace-pre-wrap rounded bg-black/40 p-2 font-mono text-[11px] text-neutral-300">
                {content.length > 0 ? content : "(empty)"}
            </pre>
        </div>
    );
}
