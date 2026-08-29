"use client";

/**
 * Recent submissions for this problem (requirement §31). Clicking a row
 * loads the submitted source into a dialog (handled by parent).
 */

import type { SubmissionSummary } from "@/lib/judge/types";

const OUTCOME_META: Record<
    string,
    { icon: string; label: string; className: string }
> = {
    accepted: { icon: "✓", label: "Accepted", className: "text-emerald-400" },
    queued: { icon: "⟳", label: "Judging…", className: "text-amber-300" },
    wrong_answer: { icon: "✕", label: "Wrong Answer", className: "text-red-400" },
    compilation_error: { icon: "✕", label: "Compilation Error", className: "text-red-400" },
    runtime_error: { icon: "✕", label: "Runtime Error", className: "text-red-400" },
    time_limit_exceeded: { icon: "⏱", label: "TLE", className: "text-amber-300" },
    memory_limit_exceeded: { icon: "⚠️", label: "MLE", className: "text-amber-300" },
    internal_error: { icon: "🛠", label: "Infrastructure Issue", className: "text-neutral-400" },
};

export default function SubmissionHistory({
    submissions,
    loading,
    signedIn,
    onSelect,
}: {
    submissions: SubmissionSummary[] | null;
    loading: boolean;
    signedIn: boolean;
    onSelect: (id: string) => void;
}) {
    if (!signedIn) {
        return (
            <p className="px-4 py-6 text-sm text-neutral-500">
                Sign in to record submissions and review your history.
            </p>
        );
    }

    if (loading && !submissions) {
        return (
            <div className="space-y-2 px-4 py-4">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="skeleton h-9 w-full rounded-lg" />
                ))}
            </div>
        );
    }

    if (!submissions || submissions.length === 0) {
        return (
            <p className="px-4 py-6 text-sm text-neutral-500">
                No submissions yet — press{" "}
                <strong className="text-neutral-300">Submit</strong> to be
                judged against all tests.
            </p>
        );
    }

    return (
        <ul
            aria-label="Recent submissions"
            className="divide-y divide-neutral-800/70"
        >
            {submissions.map((s) => {
                const meta = OUTCOME_META[s.outcome] ?? OUTCOME_META.internal_error;
                return (
                    <li key={s._id}>
                        <button
                            type="button"
                            onClick={() => onSelect(s._id)}
                            title="View submitted code"
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
                        >
                            <span className={`w-40 shrink-0 font-medium ${meta.className}`}>
                                {meta.icon} {meta.label}
                            </span>
                            <span className="w-20 shrink-0 text-xs uppercase tracking-wide text-neutral-500">
                                {s.language}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-xs text-neutral-600">
                                {s.totalCount > 0
                                    ? `${s.passedCount}/${s.totalCount} tests`
                                    : ""}
                            </span>
                            <span className="shrink-0 text-xs tabular-nums text-neutral-500">
                                {s.runtimeMs > 0 ? `${s.runtimeMs} ms` : ""}
                            </span>
                            <span className="hidden shrink-0 text-xs text-neutral-600 sm:inline">
                                {new Date(s.createdAt).toLocaleTimeString()}
                            </span>
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}
