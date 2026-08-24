"use client";

/**
 * Output / console panel.
 *
 * Renders execution status, program stdout, compiler/runtime errors,
 * execution time and memory usage. Handles every outcome: success,
 * compilation error, runtime error, timeout, network/server failure.
 */

import type { ExecutionResult } from "@/lib/code-execution/types";

export interface OutputPanelProps {
    result: ExecutionResult | null;
    /** Client-side failure (network down, server 5xx, invalid response). */
    requestError: string | null;
    running: boolean;
    onClear: () => void;
}

const STATUS_META: Record<
    string,
    { label: string; className: string }
> = {
    success: {
        label: "Accepted",
        className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    },
    runtime_error: {
        label: "Runtime Error",
        className: "bg-red-500/10 text-red-400 border-red-500/30",
    },
    compilation_error: {
        label: "Compilation Error",
        className: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    },
    timeout: {
        label: "Time Limit Exceeded",
        className: "bg-orange-500/10 text-orange-400 border-orange-500/30",
    },
    internal_error: {
        label: "Execution Failed",
        className: "bg-red-500/10 text-red-400 border-red-500/30",
    },
};

function StatusBadge({ status }: { status: string }) {
    const meta =
        STATUS_META[status] ??
        STATUS_META.internal_error;
    return (
        <span
            className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.className}`}
        >
            {meta.label}
        </span>
    );
}

export default function OutputPanel({
    result,
    requestError,
    running,
    onClear,
}: OutputPanelProps) {
    const hasContent = running || result !== null || requestError !== null;

    return (
        <div className="flex min-h-[180px] flex-col rounded-lg border border-neutral-800 bg-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    Output
                </h2>
                {hasContent && !running && (
                    <button
                        type="button"
                        onClick={onClear}
                        className="text-xs text-neutral-500 transition-colors hover:text-neutral-300"
                    >
                        Clear Output
                    </button>
                )}
            </div>

            <div className="flex-1 space-y-3 overflow-auto px-4 py-3 font-mono text-sm">
                {running && (
                    <p className="flex items-center gap-2 text-neutral-400">
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-neutral-500 border-t-transparent" />
                        Executing…
                    </p>
                )}

                {!running && requestError && (
                    <p className="whitespace-pre-wrap text-red-400">
                        {requestError}
                    </p>
                )}

                {!running && result && (
                    <>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-sans text-xs text-neutral-500">
                            <StatusBadge status={result.status} />
                            <span>Time: {result.executionTime} ms</span>
                            <span>
                                Memory:{" "}
                                {result.memoryUsageKb !== null
                                    ? `${result.memoryUsageKb} KB`
                                    : "N/A"}
                            </span>
                        </div>

                        {result.output.length > 0 && (
                            <div>
                                <p className="mb-1 font-sans text-xs uppercase tracking-wider text-neutral-500">
                                    stdout
                                </p>
                                <pre className="whitespace-pre-wrap text-neutral-100">
                                    {result.output}
                                </pre>
                            </div>
                        )}

                        {result.error && (
                            <div>
                                <p className="mb-1 font-sans text-xs uppercase tracking-wider text-neutral-500">
                                    stderr
                                </p>
                                <pre className="whitespace-pre-wrap text-red-400">
                                    {result.error}
                                </pre>
                            </div>
                        )}

                        {!result.output && !result.error && (
                            <p className="text-neutral-500">
                                Program finished with no output.
                            </p>
                        )}
                    </>
                )}

                {!hasContent && (
                    <p className="text-neutral-600">
                        Run your code to see the output here.
                    </p>
                )}
            </div>
        </div>
    );
}