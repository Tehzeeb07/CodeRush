"use client";

/**
 * Admin Problem Details / View page (/admin/problems/[id]).
 * Read-only inspection of a real problem loaded from the database via
 * the admin-gated getProblemFull query (no mock data). Shows the
 * problem exactly as users see it, plus admin metadata. The Edit
 * button navigates to the editable form at /admin/problems/[id]/edit.
 */

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import {
    ArrowLeft,
    Pencil,
    Loader2,
    Clock,
    MemoryStick,
    FlaskConical,
    FileText,
} from "lucide-react";

const statusStyles: Record<string, string> = {
    Draft: "border-slate-600 bg-slate-800/60 text-slate-300",
    Published: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
    Archived: "border-orange-500/40 bg-orange-500/10 text-orange-400",
};

const difficultyStyles: Record<string, string> = {
    easy: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
    medium: "border-amber-500/40 bg-amber-500/10 text-amber-400",
    hard: "border-red-500/40 bg-red-500/10 text-red-400",
};

export default function AdminViewProblemPage() {
    const params = useParams();
    const router = useRouter();
    const slug = decodeURIComponent(
        // The route is /admin/problems/[id]; the list navigates here
        // with the problem's slug as the [id] segment.
        String(params.id ?? params.slug)
    );

    const problem = useQuery(api.problems.getProblemFull, { slug });

    if (problem === undefined) {
        return (
            <div className="min-h-screen bg-[#0F1117] text-white">
                <div className="flex min-h-[500px] items-center justify-center">
                    <div className="flex items-center gap-3 text-slate-400">
                        <Loader2 size={22} className="animate-spin" />
                        Loading problem...
                    </div>
                </div>
            </div>
        );
    }

    if (problem === null) {
        return (
            <div className="min-h-screen bg-[#0F1117] p-8 text-white">
                <div className="mx-auto max-w-5xl">
                    <button
                        type="button"
                        onClick={() => router.push("/admin/problems")}
                        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
                    >
                        <ArrowLeft size={17} />
                        Back to Problems
                    </button>
                    <h1 className="text-2xl font-bold">Problem not found</h1>
                    <p className="mt-2 text-sm text-slate-400">
                        The problem you are looking for does not exist or may
                        have been deleted.
                    </p>
                </div>
            </div>
        );
    }

    const status = problem.archived
        ? "Archived"
        : problem.published
          ? "Published"
          : "Draft";

    const samples = problem.testCases.filter((tc) => tc.isSample);

    const formatDate = (value?: number) =>
        value ? new Date(value).toLocaleString() : "—";

    return (
        <div className="min-h-screen bg-[#0F1117] p-6 text-white md:p-8">
            <div className="mx-auto max-w-5xl">
                {/* HEADER */}
                <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <button
                            type="button"
                            onClick={() => router.push("/admin/problems")}
                            className="mb-3 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
                        >
                            <ArrowLeft size={17} />
                            Back to Problems
                        </button>

                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-bold">
                                {problem.title}
                            </h1>
                            <span
                                className={`rounded-full border px-3 py-1 text-xs font-medium ${statusStyles[status]}`}
                            >
                                {status}
                            </span>
                            <span
                                className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${difficultyStyles[problem.difficulty]}`}
                            >
                                {problem.difficulty}
                            </span>
                        </div>

                        <p className="mt-2 font-mono text-xs text-slate-500">
                            /problems/{problem.slug} · ID: {problem._id}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            router.push(
                                `/admin/problems/${encodeURIComponent(problem.slug)}/edit`
                            )
                        }
                        className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition-all duration-200 hover:from-blue-500 hover:to-indigo-500"
                    >
                        <Pencil size={16} />
                        Edit Problem
                    </button>
                </div>

                {/* QUICK STATS */}
                <div className="mb-8 grid gap-4 sm:grid-cols-4">
                    {[
                        {
                            icon: FlaskConical,
                            label: "Test Cases",
                            value: `${problem.testCases.length} total`,
                        },
                        {
                            icon: FileText,
                            label: "Samples",
                            value: `${samples.length} samples`,
                        },
                        {
                            icon: Clock,
                            label: "Time Limit",
                            value: `${problem.timeLimitMs}ms`,
                        },
                        {
                            icon: MemoryStick,
                            label: "Memory Limit",
                            value: `${problem.memoryLimitMb}MB`,
                        },
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            className="rounded-2xl border border-slate-800 bg-[#151922] p-4"
                        >
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <stat.icon size={14} />
                                {stat.label}
                            </div>
                            <p className="mt-1.5 text-sm font-semibold">
                                {stat.value}
                            </p>
                        </div>
                    ))}
                </div>

                {/* DESCRIPTION */}
                <section className="mb-6 rounded-2xl border border-slate-800 bg-[#151922] p-6">
                    <h2 className="mb-4 text-lg font-semibold">Description</h2>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                        {problem.description}
                    </p>
                </section>

                {/* FORMATS */}
                <section className="mb-6 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-800 bg-[#151922] p-6">
                        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
                            Input Format
                        </h2>
                        <p className="whitespace-pre-wrap font-mono text-sm text-slate-300">
                            {problem.inputFormat || "—"}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-[#151922] p-6">
                        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
                            Output Format
                        </h2>
                        <p className="whitespace-pre-wrap font-mono text-sm text-slate-300">
                            {problem.outputFormat || "—"}
                        </p>
                    </div>
                </section>

                {/* CONSTRAINTS */}
                {problem.constraints.length > 0 && (
                    <section className="mb-6 rounded-2xl border border-slate-800 bg-[#151922] p-6">
                        <h2 className="mb-4 text-lg font-semibold">
                            Constraints
                        </h2>
                        <ul className="space-y-2">
                            {problem.constraints.map((constraint, index) => (
                                <li
                                    key={index}
                                    className="font-mono text-sm text-slate-300"
                                >
                                    • {constraint}
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {/* EXAMPLES */}
                {problem.examples.length > 0 && (
                    <section className="mb-6 rounded-2xl border border-slate-800 bg-[#151922] p-6">
                        <h2 className="mb-4 text-lg font-semibold">Examples</h2>
                        <div className="space-y-4">
                            {problem.examples.map((example, index) => (
                                <div
                                    key={example.id}
                                    className="rounded-xl border border-slate-800 bg-[#0F1117] p-4"
                                >
                                    <p className="mb-3 text-sm font-medium text-slate-300">
                                        Example {index + 1}
                                    </p>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Input
                                            </p>
                                            <pre className="overflow-x-auto rounded-lg bg-[#0B0D13] p-3 font-mono text-sm text-slate-300">
                                                {example.input}
                                            </pre>
                                        </div>
                                        <div>
                                            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Output
                                            </p>
                                            <pre className="overflow-x-auto rounded-lg bg-[#0B0D13] p-3 font-mono text-sm text-slate-300">
                                                {example.output}
                                            </pre>
                                        </div>
                                    </div>
                                    {example.explanation && (
                                        <p className="mt-3 text-sm text-slate-400">
                                            <span className="font-semibold text-slate-500">
                                                Explanation:{" "}
                                            </span>
                                            {example.explanation}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* TEST CASES */}
                <section className="mb-6 rounded-2xl border border-slate-800 bg-[#151922] p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Test Cases</h2>
                        <span className="rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-xs text-slate-400">
                            {samples.length} samples ·{" "}
                            {problem.testCases.length} total
                        </span>
                    </div>
                    <div className="space-y-4">
                        {problem.testCases.map((testCase, index) => (
                            <div
                                key={testCase.id}
                                className="rounded-xl border border-slate-800 bg-[#0F1117] p-4"
                            >
                                <div className="mb-3 flex items-center gap-3">
                                    <p className="text-sm font-medium text-slate-300">
                                        Test Case {index + 1}
                                    </p>
                                    {testCase.isSample && (
                                        <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">
                                            Sample
                                        </span>
                                    )}
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Input
                                        </p>
                                        <pre className="overflow-x-auto rounded-lg bg-[#0B0D13] p-3 font-mono text-sm text-slate-300">
                                            {testCase.input}
                                        </pre>
                                    </div>
                                    <div>
                                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Expected Output
                                        </p>
                                        <pre className="overflow-x-auto rounded-lg bg-[#0B0D13] p-3 font-mono text-sm text-slate-300">
                                            {testCase.expectedOutput}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* LANGUAGES */}
                <section className="mb-6 rounded-2xl border border-slate-800 bg-[#151922] p-6">
                    <h2 className="mb-4 text-lg font-semibold">
                        Supported Languages
                    </h2>
                    {(problem.supportedLanguages?.length ?? 0) > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {problem.supportedLanguages!.map((lang) => (
                                <span
                                    key={lang}
                                    className="rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 font-mono text-xs text-slate-300"
                                >
                                    {lang}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500">—</p>
                    )}
                </section>

                {/* HINTS & EDITORIAL */}
                {(problem.hints?.length ?? 0) > 0 && (
                    <section className="mb-6 rounded-2xl border border-slate-800 bg-[#151922] p-6">
                        <h2 className="mb-4 text-lg font-semibold">Hints</h2>
                        <ol className="list-decimal space-y-2 pl-5">
                            {problem.hints!.map((hint, index) => (
                                <li
                                    key={index}
                                    className="text-sm text-slate-300"
                                >
                                    {hint}
                                </li>
                            ))}
                        </ol>
                    </section>
                )}

                {problem.editorial && (
                    <section className="mb-6 rounded-2xl border border-slate-800 bg-[#151922] p-6">
                        <h2 className="mb-4 text-lg font-semibold">
                            Editorial / Explanation
                        </h2>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                            {problem.editorial}
                        </p>
                    </section>
                )}

                {/* METADATA */}
                <section className="mb-10 rounded-2xl border border-slate-800 bg-[#151922] p-6">
                    <h2 className="mb-4 text-lg font-semibold">Metadata</h2>
                    <dl className="grid gap-4 text-sm sm:grid-cols-2">
                        <div>
                            <dt className="text-xs uppercase tracking-wide text-slate-500">
                                Category
                            </dt>
                            <dd className="mt-1 text-slate-300">
                                {problem.category || "—"}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs uppercase tracking-wide text-slate-500">
                                Tags
                            </dt>
                            <dd className="mt-1 flex flex-wrap gap-2">
                                {problem.tags.length > 0 ? (
                                    problem.tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="rounded-full border border-slate-700 bg-slate-800/60 px-2.5 py-0.5 text-xs text-slate-300"
                                        >
                                            {tag}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-slate-500">—</span>
                                )}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs uppercase tracking-wide text-slate-500">
                                Created
                            </dt>
                            <dd className="mt-1 text-slate-300">
                                {formatDate(problem.createdAt)}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs uppercase tracking-wide text-slate-500">
                                Last Updated
                            </dt>
                            <dd className="mt-1 text-slate-300">
                                {formatDate(problem.updatedAt)}
                            </dd>
                        </div>
                    </dl>
                </section>
            </div>
        </div>
    );
}
