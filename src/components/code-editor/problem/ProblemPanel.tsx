"use client";

/**
 * Left problem pane: description, examples, constraints, limits
 * (requirement §1/§11). Content is plain text/markdown-lite rendered
 * with basic formatting; sample cases are copy-friendly blocks.
 */

import type { SanitizedProblem } from "@/lib/judge/types";

const DIFFICULTY_STYLES: Record<SanitizedProblem["difficulty"], string> = {
    easy: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    medium: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    hard: "bg-red-500/15 text-red-300 border-red-500/30",
};

/** Backend-verified progress for the signed-in user (may be null). */
export interface ProgressBadgeData {
    status: "attempted" | "solved";
    bestPassedCount: number;
    totalTestCount: number;
}

export default function ProblemPanel({
    problem,
    progress,
}: {
    problem: SanitizedProblem;
    progress?: ProgressBadgeData | null;
}) {
    return (
        <div className="flex h-full flex-col">
            <header className="space-y-3 border-b border-neutral-800 px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-lg font-semibold text-white">
                        {problem.title}
                    </h1>
                    {progress?.status === "solved" && (
                        <span
                            className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300"
                            title="All required test cases passed — verified by the judge"
                        >
                            ✓ Solved
                        </span>
                    )}
                    {progress?.status === "attempted" && (
                        <span
                            className="rounded-full border border-neutral-700 px-2.5 py-0.5 text-xs text-neutral-400"
                            title={`Best so far: ${progress.bestPassedCount}/${progress.totalTestCount} test cases`}
                        >
                            Attempted ({progress.bestPassedCount}/
                            {progress.totalTestCount} tests)
                        </span>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                        className={`rounded-full border px-2.5 py-0.5 font-semibold capitalize ${DIFFICULTY_STYLES[problem.difficulty]}`}
                    >
                        {problem.difficulty}
                    </span>
                    {problem.tags.map((tag) => (
                        <span
                            key={tag}
                            className="rounded-full border border-neutral-700 px-2.5 py-0.5 text-neutral-400"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
                <p className="text-xs text-neutral-500">
                    Time limit {problem.timeLimitMs / 1000}s · Memory limit{" "}
                    {problem.memoryLimitMb} MB ·{" "}
                    {problem.counts.sample} public / {problem.counts.hidden}{" "}
                    hidden tests
                </p>
            </header>

            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-4">
                {/* Description */}
                <section aria-label="Problem description">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-300">
                        {problem.description}
                    </div>
                </section>

                {/* Examples */}
                {problem.examples.length > 0 && (
                    <section aria-label="Examples">
                        <h2 className="mb-2 text-sm font-semibold text-white">
                            Examples
                        </h2>
                        <div className="space-y-3">
                            {problem.examples.map((ex, i) => (
                                <div
                                    key={ex.id}
                                    className="rounded-lg border border-neutral-800 bg-[var(--bg-card,#14171d)] p-3"
                                >
                                    <p className="mb-1 text-xs font-medium text-neutral-200">
                                        Example {i + 1}
                                    </p>
                                    <SampleBlock
                                        label="Input"
                                        content={ex.input}
                                    />
                                    <SampleBlock
                                        label="Output"
                                        content={ex.output}
                                    />
                                    {ex.explanation && (
                                        <SampleBlock
                                            label="Explanation"
                                            content={ex.explanation}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Constraints */}
                {problem.constraints.length > 0 && (
                    <section aria-label="Constraints">
                        <h2 className="mb-2 text-sm font-semibold text-white">
                            Constraints
                        </h2>
                        <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-400">
                            {problem.constraints.map((c) => (
                                <li key={c}>{c}</li>
                            ))}
                        </ul>
                    </section>
                )}
            </div>
        </div>
    );
}

function SampleBlock({
    label,
    content,
}: {
    label: string;
    content: string;
}) {
    return (
        <div className="mt-2">
            <p className="text-xs uppercase tracking-wide text-neutral-500">
                {label}
            </p>
            <pre
                aria-label={`${label} example`}
                className="mt-1 overflow-x-auto rounded-md bg-black/40 p-2.5 font-mono text-xs leading-relaxed text-neutral-200"
            >
                {content}
            </pre>
        </div>
    );
}
