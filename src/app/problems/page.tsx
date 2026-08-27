"use client";

/**
 * /problems — index of judged coding problems with difficulty badges
 * and test-case counts. Links into the editor workspace.
 */

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";

const DIFFICULTY_STYLES: Record<string, string> = {
    easy: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
    medium: "border-amber-500/30 bg-amber-500/15 text-amber-300",
    hard: "border-red-500/30 bg-red-500/15 text-red-300",
};

export default function ProblemsPage() {
    const problems = useQuery(api.problems.listProblems, {}) ?? null;

    return (
        <div className="cr-shell mx-auto w-full max-w-5xl px-4 py-10">
            <header className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-white">
                    Coding Problems
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-400">
                    Solve problems in C++, Python 3, Java or JavaScript inside
                    a full IDE experience — run sample tests, submit against
                    hidden cases, and get structured explanations when
                    something goes wrong.
                </p>
            </header>

            {!problems ? (
                <div className="space-y-3" aria-busy="true">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="skeleton h-20 rounded-xl" />
                    ))}
                </div>
            ) : problems.length === 0 ? (
                <p className="rounded-xl border border-neutral-800 p-6 text-sm text-neutral-400">
                    No problems are published yet. Run{" "}
                    <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-xs">
                        node scripts/seed-problems.mjs
                    </code>{" "}
                    to seed starter content.
                </p>
            ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                    {problems.map((p) => (
                        <li key={p.slug}>
                            <Link
                                href={`/problems/${p.slug}`}
                                className="card-link group flex h-full flex-col gap-2 rounded-xl border border-neutral-800 bg-[var(--bg-card)] p-4 transition-all hover:border-neutral-600 hover:bg-[var(--bg-card-hover)] hover:shadow-[var(--shadow-card)]"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <span className="font-semibold text-white group-hover:text-indigo-300">
                                        {p.title}
                                    </span>
                                    <span
                                        className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${
                                            DIFFICULTY_STYLES[p.difficulty]
                                        }`}
                                    >
                                        {p.difficulty}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {p.tags.slice(0, 4).map((t) => (
                                        <span
                                            key={t}
                                            className="rounded-full border border-neutral-700 px-2 py-0.5 text-[10px] text-neutral-500"
                                        >
                                            {t}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-xs text-neutral-500">
                                    {p.counts.sample} public ·{" "}
                                    {p.counts.hidden} hidden tests ·{" "}
                                    {p.timeLimitMs / 1000}s limit
                                </p>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
