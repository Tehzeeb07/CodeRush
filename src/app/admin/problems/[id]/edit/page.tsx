"use client";

/**
 * Admin Problem Edit page (/admin/problems/[id]/edit).
 *
 * Fully functional editor wired to the existing Convex backend:
 *  - Loads the real problem from the database by slug via the
 *    admin-gated getProblemFull query (no mock data).
 *  - Pre-fills every editable field with current DB values.
 *  - Validates fields client-side with clear field-level errors.
 *  - Persists changes through the admin-gated updateProblem mutation,
 *    which preserves the problem _id, bumps updatedAt, and enforces
 *    slug uniqueness server-side.
 *  - Shows a success message and returns to the problem list, where
 *    the reactive Convex query refreshes the card immediately.
 */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import {
    ArrowLeft,
    Save,
    Loader2,
    Plus,
    Trash2,
    CheckCircle2,
    XCircle,
} from "lucide-react";

type Example = {
    id: string;
    input: string;
    output: string;
    explanation?: string;
};

type TestCase = {
    id: string;
    input: string;
    expectedOutput: string;
    isSample: boolean;
};

type Status = "draft" | "published" | "archived";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const inputClass =
    "w-full rounded-xl border border-slate-700 bg-[#0F1117] px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40";
const labelClass = "mb-2 block text-sm text-slate-300";
const errorTextClass = "mt-1.5 text-xs text-red-400";

export default function AdminEditProblemPage() {
    const params = useParams();
    const router = useRouter();

    // The route is /admin/problems/[id]/edit; the list navigates here
    // with the problem's slug as the [id] segment.
    const slugParam = decodeURIComponent(
        String(params.id ?? params.slug)
    );

    const problem = useQuery(api.problems.getProblemFull, {
        slug: slugParam,
    });

    const updateProblem = useMutation(
        api.problems.updateProblem
    );

    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [difficulty, setDifficulty] = useState<
        "easy" | "medium" | "hard"
    >("easy");
    const [category, setCategory] = useState("");
    const [tags, setTags] = useState("");
    const [description, setDescription] = useState("");
    const [constraints, setConstraints] = useState("");
    const [timeLimitMs, setTimeLimitMs] = useState(1000);
    const [memoryLimitMb, setMemoryLimitMb] = useState(256);
    const [inputFormat, setInputFormat] = useState("");
    const [outputFormat, setOutputFormat] = useState("");
    const [hints, setHints] = useState("");
    const [editorial, setEditorial] = useState("");
    const [supportedLanguages, setSupportedLanguages] =
        useState("");
    const [status, setStatus] = useState<Status>("draft");

    const [examples, setExamples] = useState<Example[]>([]);
    const [testCases, setTestCases] = useState<TestCase[]>([]);

    const [fieldErrors, setFieldErrors] = useState<
        Record<string, string>
    >({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    /* ---------------- PREFILL FROM DATABASE ---------------- */

    useEffect(() => {
        if (!problem) return;

        setTitle(problem.title);
        setSlug(problem.slug);
        setDifficulty(problem.difficulty);
        setCategory(problem.category ?? "");
        setTags(problem.tags.join(", "));
        setDescription(problem.description);
        setConstraints(problem.constraints.join("\n"));
        setTimeLimitMs(problem.timeLimitMs);
        setMemoryLimitMb(problem.memoryLimitMb);
        setInputFormat(problem.inputFormat ?? "");
        setOutputFormat(problem.outputFormat ?? "");
        setHints((problem.hints ?? []).join("\n"));
        setEditorial(problem.editorial ?? "");
        setSupportedLanguages(
            (problem.supportedLanguages ?? []).join(", ")
        );
        setExamples(problem.examples);
        setTestCases(problem.testCases);

        if (problem.archived) {
            setStatus("archived");
        } else if (problem.published) {
            setStatus("published");
        } else {
            setStatus("draft");
        }
    }, [problem]);

    /* ---------------- EDITOR HELPERS ---------------- */

    const addExample = () => {
        setExamples((current) => [
            ...current,
            {
                id: crypto.randomUUID(),
                input: "",
                output: "",
                explanation: "",
            },
        ]);
    };

    const removeExample = (id: string) => {
        setExamples((current) =>
            current.filter((item) => item.id !== id)
        );
    };

    const updateExample = (
        id: string,
        patch: Partial<Example>
    ) => {
        setExamples((current) =>
            current.map((item) =>
                item.id === id
                    ? { ...item, ...patch }
                    : item
            )
        );
    };

    const addTestCase = () => {
        setTestCases((current) => [
            ...current,
            {
                id: crypto.randomUUID(),
                input: "",
                expectedOutput: "",
                isSample: false,
            },
        ]);
    };

    const removeTestCase = (id: string) => {
        setTestCases((current) =>
            current.filter((item) => item.id !== id)
        );
    };

    const updateTestCase = (
        id: string,
        patch: Partial<TestCase>
    ) => {
        setTestCases((current) =>
            current.map((item) =>
                item.id === id
                    ? { ...item, ...patch }
                    : item
            )
        );
    };

    /* ---------------- VALIDATION ---------------- */

    const validate = () => {
        const errs: Record<string, string> = {};

        if (!title.trim()) {
            errs.title = "Title is required.";
        }

        if (!slug.trim()) {
            errs.slug = "Slug is required.";
        } else if (!SLUG_PATTERN.test(slug.trim())) {
            errs.slug =
                "Slug may only contain lowercase letters, numbers and single hyphens (e.g. sum-two-numbers).";
        }

        if (!description.trim()) {
            errs.description =
                "Description is required.";
        }

        if (
            !Number.isFinite(timeLimitMs) ||
            timeLimitMs <= 0
        ) {
            errs.timeLimitMs =
                "Time limit must be a positive number of milliseconds.";
        }

        if (
            !Number.isFinite(memoryLimitMb) ||
            memoryLimitMb <= 0
        ) {
            errs.memoryLimitMb =
                "Memory limit must be a positive number of megabytes.";
        }

        if (testCases.length === 0) {
            errs.testCases =
                "At least one test case is required.";
        } else {
            for (const tc of testCases) {
                if (!tc.input.trim()) {
                    errs[`tc-${tc.id}`] =
                        "Every test case needs an input.";
                    break;
                }
                if (!tc.expectedOutput.trim()) {
                    errs[`tc-${tc.id}`] =
                        "Every test case needs an expected output.";
                    break;
                }
            }
        }

        for (const ex of examples) {
            if (
                !ex.input.trim() ||
                !ex.output.trim()
            ) {
                errs.examples =
                    "Every example needs both an input and an output.";
                break;
            }
        }

        return errs;
    };

    /* ---------------- SAVE ---------------- */

    const handleSave = async (
        event: React.FormEvent
    ) => {
        event.preventDefault();

        if (!problem) return;

        const errs = validate();

        if (Object.keys(errs).length > 0) {
            setFieldErrors(errs);
            setError(
                "Please fix the highlighted fields before saving."
            );
            return;
        }

        setFieldErrors({});
        setError("");
        setSuccess("");
        setSaving(true);

        try {
            await updateProblem({
                id: problem._id,
                slug: slug.trim(),
                title: title.trim(),
                difficulty,
                tags: tags
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                description,
                examples,
                constraints: constraints
                    .split("\n")
                    .map((item) => item.trim())
                    .filter(Boolean),
                timeLimitMs,
                memoryLimitMb,
                testCases,
                published: status === "published",
                archived: status === "archived",
                category: category.trim() || undefined,
                inputFormat:
                    inputFormat.trim() || undefined,
                outputFormat:
                    outputFormat.trim() || undefined,
                hints: hints
                    .split("\n")
                    .map((item) => item.trim())
                    .filter(Boolean),
                editorial:
                    editorial.trim() || undefined,
                supportedLanguages:
                    supportedLanguages
                        .split(",")
                        .map((item) => item.trim())
                        .filter(Boolean),
            });

            setSuccess(
                "Changes saved successfully. Updating the problem list..."
            );

            // Give the admin a moment to see the success
            // message, then return to the list where the
            // reactive Convex query shows the updated card.
            setTimeout(() => {
                router.push("/admin/problems");
            }, 900);
        } catch (err) {
            console.error(err);

            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to update problem."
            );
        } finally {
            setSaving(false);
        }
    };

    /* ---------------- STATE HELPERS FOR JSX ---------------- */

    const FieldError = ({ name }: { name: string }) =>
        fieldErrors[name] ? (
            <p className={errorTextClass}>
                {fieldErrors[name]}
            </p>
        ) : null;

    if (problem === undefined) {
        return (
            <div className="min-h-screen bg-[#0F1117] text-white">
                <div className="flex min-h-[500px] items-center justify-center">
                    <div className="flex items-center gap-3 text-slate-400">
                        <Loader2
                            size={22}
                            className="animate-spin"
                        />
                        Loading problem...
                    </div>
                </div>
            </div>
        );
    }

    if (problem === null) {
        return (
            <div className="min-h-screen bg-[#0F1117] p-8 text-white">
                <div className="mx-auto max-w-6xl">
                    <button
                        type="button"
                        onClick={() =>
                            router.push("/admin/problems")
                        }
                        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
                    >
                        <ArrowLeft size={17} />
                        Back to Problems
                    </button>

                    <h1 className="text-2xl font-bold">
                        Problem not found
                    </h1>

                    <p className="mt-2 text-sm text-slate-400">
                        The problem you are trying to edit
                        does not exist or may have been
                        deleted.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0F1117] p-6 text-white md:p-8">
            <div className="mx-auto max-w-6xl">
                {/* HEADER */}
                <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={() =>
                                router.push(
                                    `/admin/problems/${encodeURIComponent(slugParam)}`
                                )
                            }
                            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
                        >
                            <ArrowLeft size={17} />
                            Back
                        </button>

                        <div>
                            <h1 className="text-2xl font-bold">
                                Edit Problem
                            </h1>

                            <p className="mt-1 text-xs text-slate-500">
                                Problem ID: {problem._id}
                            </p>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition-all duration-200 hover:from-blue-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {saving ? (
                            <Loader2
                                size={17}
                                className="animate-spin"
                            />
                        ) : (
                            <Save size={17} />
                        )}
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>

                {/* ERROR BANNER */}
                {error && (
                    <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                        <XCircle
                            size={18}
                            className="shrink-0"
                        />
                        {error}
                    </div>
                )}

                {/* SUCCESS BANNER */}
                {success && (
                    <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">
                        <CheckCircle2
                            size={18}
                            className="shrink-0"
                        />
                        {success}
                    </div>
                )}

                <form
                    onSubmit={handleSave}
                    className="space-y-6"
                >
                    {/* BASIC INFORMATION */}
                    <section className="rounded-2xl border border-slate-800 bg-[#151922] p-6">
                        <h2 className="mb-6 text-lg font-semibold">
                            Basic Information
                        </h2>
                        <div className="space-y-5">
                            <div>
                                <label htmlFor="problem-title" className={labelClass}>
                                    Title
                                </label>
                                <input
                                    id="problem-title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className={`${inputClass} ${fieldErrors.title ? "border-red-500/60" : ""}`}
                                    placeholder="Sum Any Two Numbers"
                                />
                                <FieldError name="title" />
                            </div>
                            <div>
                                <label htmlFor="problem-slug" className={labelClass}>
                                    Slug
                                </label>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-500">/problems/</span>
                                    <input
                                        id="problem-slug"
                                        value={slug}
                                        onChange={(e) => setSlug(e.target.value)}
                                        className={`${inputClass} ${fieldErrors.slug ? "border-red-500/60" : ""}`}
                                        placeholder="sum-any-two-numbers"
                                    />
                                </div>
                                <FieldError name="slug" />
                            </div>
                            <div className="grid gap-5 md:grid-cols-3">
                                <div>
                                    <label htmlFor="problem-difficulty" className={labelClass}>
                                        Difficulty
                                    </label>
                                    <select
                                        id="problem-difficulty"
                                        value={difficulty}
                                        onChange={(e) =>
                                            setDifficulty(e.target.value as "easy" | "medium" | "hard")
                                        }
                                        className={inputClass}
                                    >
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="problem-category" className={labelClass}>
                                        Category (optional)
                                    </label>
                                    <input
                                        id="problem-category"
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className={inputClass}
                                        placeholder="e.g. Math"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="problem-tags" className={labelClass}>
                                        Tags (comma separated)
                                    </label>
                                    <input
                                        id="problem-tags"
                                        value={tags}
                                        onChange={(e) => setTags(e.target.value)}
                                        className={inputClass}
                                        placeholder="math, basics"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* LIMITS */}
                    <section className="rounded-2xl border border-slate-800 bg-[#151922] p-6">
                        <h2 className="mb-6 text-lg font-semibold">
                            Limits
                        </h2>
                        <div className="grid gap-5 md:grid-cols-2">
                            <div>
                                <label htmlFor="problem-time" className={labelClass}>
                                    Time Limit (ms)
                                </label>
                                <input
                                    id="problem-time"
                                    type="number"
                                    min={1}
                                    value={timeLimitMs}
                                    onChange={(e) => setTimeLimitMs(Number(e.target.value))}
                                    className={`${inputClass} ${fieldErrors.timeLimitMs ? "border-red-500/60" : ""}`}
                                />
                                <FieldError name="timeLimitMs" />
                            </div>
                            <div>
                                <label htmlFor="problem-memory" className={labelClass}>
                                    Memory Limit (MB)
                                </label>
                                <input
                                    id="problem-memory"
                                    type="number"
                                    min={1}
                                    value={memoryLimitMb}
                                    onChange={(e) => setMemoryLimitMb(Number(e.target.value))}
                                    className={`${inputClass} ${fieldErrors.memoryLimitMb ? "border-red-500/60" : ""}`}
                                />
                                <FieldError name="memoryLimitMb" />
                            </div>
                        </div>
                    </section>

                    {/* DESCRIPTION & FORMATS */}
                    <section className="rounded-2xl border border-slate-800 bg-[#151922] p-6">
                        <h2 className="mb-6 text-lg font-semibold">
                            Description &amp; Formats
                        </h2>
                        <div className="space-y-5">
                            <div>
                                <label htmlFor="problem-description" className={labelClass}>
                                    Description
                                </label>
                                <textarea
                                    id="problem-description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={8}
                                    className={`${inputClass} font-mono ${fieldErrors.description ? "border-red-500/60" : ""}`}
                                    placeholder="Describe the problem..."
                                />
                                <FieldError name="description" />
                            </div>
                            <div className="grid gap-5 md:grid-cols-2">
                                <div>
                                    <label htmlFor="problem-input-format" className={labelClass}>
                                        Input Format
                                    </label>
                                    <textarea
                                        id="problem-input-format"
                                        value={inputFormat}
                                        onChange={(e) => setInputFormat(e.target.value)}
                                        rows={4}
                                        className={`${inputClass} font-mono`}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="problem-output-format" className={labelClass}>
                                        Output Format
                                    </label>
                                    <textarea
                                        id="problem-output-format"
                                        value={outputFormat}
                                        onChange={(e) => setOutputFormat(e.target.value)}
                                        rows={4}
                                        className={`${inputClass} font-mono`}
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="problem-constraints" className={labelClass}>
                                    Constraints (one per line)
                                </label>
                                <textarea
                                    id="problem-constraints"
                                    value={constraints}
                                    onChange={(e) => setConstraints(e.target.value)}
                                    rows={4}
                                    className={`${inputClass} font-mono`}
                                    placeholder={"1 <= n <= 10^6"}
                                />
                            </div>
                        </div>
                    </section>

                    {/* EXAMPLES */}
                    <section className="rounded-2xl border border-slate-800 bg-[#151922] p-6">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-lg font-semibold">
                                Examples
                            </h2>
                            <button
                                type="button"
                                onClick={addExample}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-blue-500/50 hover:text-blue-400"
                            >
                                <Plus size={16} />
                                Add Example
                            </button>
                        </div>
                        <FieldError name="examples" />
                        {examples.length === 0 && (
                            <p className="text-sm text-slate-500">
                                No examples yet. Add one to show
                                users how the input/output works.
                            </p>
                        )}
                        <div className="space-y-4">
                            {examples.map((example, index) => (
                                <div
                                    key={example.id}
                                    className="rounded-xl border border-slate-800 bg-[#0F1117] p-4"
                                >
                                    <div className="mb-3 flex items-center justify-between">
                                        <p className="text-sm font-medium text-slate-300">
                                            Example {index + 1}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => removeExample(example.id)}
                                            aria-label={`Remove example ${index + 1}`}
                                            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-red-500/10 hover:text-red-400"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <label htmlFor={`ex-in-${example.id}`} className={labelClass}>
                                                Input
                                            </label>
                                            <textarea
                                                id={`ex-in-${example.id}`}
                                                value={example.input}
                                                onChange={(e) =>
                                                    updateExample(example.id, { input: e.target.value })
                                                }
                                                rows={3}
                                                className={`${inputClass} font-mono`}
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor={`ex-out-${example.id}`} className={labelClass}>
                                                Output
                                            </label>
                                            <textarea
                                                id={`ex-out-${example.id}`}
                                                value={example.output}
                                                onChange={(e) =>
                                                    updateExample(example.id, { output: e.target.value })
                                                }
                                                rows={3}
                                                className={`${inputClass} font-mono`}
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <label htmlFor={`ex-exp-${example.id}`} className={labelClass}>
                                            Explanation (optional)
                                        </label>
                                        <input
                                            id={`ex-exp-${example.id}`}
                                            value={example.explanation ?? ""}
                                            onChange={(e) =>
                                                updateExample(example.id, { explanation: e.target.value })
                                            }
                                            className={inputClass}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* TEST CASES */}
                    <section className="rounded-2xl border border-slate-800 bg-[#151922] p-6">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold">Test Cases</h2>
                                <p className="mt-1 text-xs text-slate-500">
                                    {testCases.filter((tc) => tc.isSample).length} sample · {testCases.length} total
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={addTestCase}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-blue-500/50 hover:text-blue-400"
                            >
                                <Plus size={16} />
                                Add Test Case
                            </button>
                        </div>
                        <FieldError name="testCases" />
                        <div className="space-y-4">
                            {testCases.map((testCase, index) => (
                                <div
                                    key={testCase.id}
                                    className="rounded-xl border border-slate-800 bg-[#0F1117] p-4"
                                >
                                    <div className="mb-3 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <p className="text-sm font-medium text-slate-300">
                                                Test Case {index + 1}
                                            </p>
                                            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400">
                                                <input
                                                    type="checkbox"
                                                    checked={testCase.isSample}
                                                    onChange={(e) =>
                                                        updateTestCase(testCase.id, { isSample: e.target.checked })
                                                    }
                                                    className="h-4 w-4 rounded border-slate-600 bg-[#0F1117] accent-blue-600"
                                                />
                                                Sample
                                            </label>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeTestCase(testCase.id)}
                                            aria-label={`Remove test case ${index + 1}`}
                                            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-red-500/10 hover:text-red-400"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <label htmlFor={`tc-in-${testCase.id}`} className={labelClass}>
                                                Input
                                            </label>
                                            <textarea
                                                id={`tc-in-${testCase.id}`}
                                                value={testCase.input}
                                                onChange={(e) =>
                                                    updateTestCase(testCase.id, { input: e.target.value })
                                                }
                                                rows={3}
                                                className={`${inputClass} font-mono ${fieldErrors[`tc-${testCase.id}`] ? "border-red-500/60" : ""}`}
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor={`tc-out-${testCase.id}`} className={labelClass}>
                                                Expected Output
                                            </label>
                                            <textarea
                                                id={`tc-out-${testCase.id}`}
                                                value={testCase.expectedOutput}
                                                onChange={(e) =>
                                                    updateTestCase(testCase.id, { expectedOutput: e.target.value })
                                                }
                                                rows={3}
                                                className={`${inputClass} font-mono ${fieldErrors[`tc-${testCase.id}`] ? "border-red-500/60" : ""}`}
                                            />
                                        </div>
                                    </div>
                                    {fieldErrors[`tc-${testCase.id}`] && (
                                        <p className={errorTextClass}>{fieldErrors[`tc-${testCase.id}`]}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* LANGUAGES, HINTS & EDITORIAL */}
                    <section className="rounded-2xl border border-slate-800 bg-[#151922] p-6">
                        <h2 className="mb-6 text-lg font-semibold">Languages, Hints &amp; Editorial</h2>
                        <div className="space-y-5">
                            <div>
                                <label htmlFor="problem-langs" className={labelClass}>
                                    Supported Languages (comma separated)
                                </label>
                                <input
                                    id="problem-langs"
                                    value={supportedLanguages}
                                    onChange={(e) => setSupportedLanguages(e.target.value)}
                                    className={inputClass}
                                    placeholder="javascript, python, cpp, java"
                                />
                            </div>
                            <div>
                                <label htmlFor="problem-hints" className={labelClass}>
                                    Hints (one per line)
                                </label>
                                <textarea
                                    id="problem-hints"
                                    value={hints}
                                    onChange={(e) => setHints(e.target.value)}
                                    rows={3}
                                    className={`${inputClass} font-mono`}
                                />
                            </div>
                            <div>
                                <label htmlFor="problem-editorial" className={labelClass}>
                                    Editorial / Explanation (optional)
                                </label>
                                <textarea
                                    id="problem-editorial"
                                    value={editorial}
                                    onChange={(e) => setEditorial(e.target.value)}
                                    rows={5}
                                    className={`${inputClass} font-mono`}
                                />
                            </div>
                        </div>
                    </section>

                    {/* STATUS */}
                    <section className="rounded-2xl border border-slate-800 bg-[#151922] p-6">
                        <h2 className="mb-6 text-lg font-semibold">Status</h2>
                        <div className="grid gap-4 md:grid-cols-3">
                            {(
                                [
                                    { value: "draft", label: "Draft", desc: "Only visible to admins" },
                                    { value: "published", label: "Published", desc: "Visible to all users" },
                                    { value: "archived", label: "Archived", desc: "Hidden from users, kept for admins" },
                                ] as const
                            ).map((option) => (
                                <label
                                    key={option.value}
                                    className={`cursor-pointer rounded-xl border p-4 transition ${
                                        status === option.value
                                            ? "border-blue-500 bg-blue-500/10"
                                            : "border-slate-800 hover:border-slate-600"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="radio"
                                            name="problem-status"
                                            value={option.value}
                                            checked={status === option.value}
                                            onChange={() => setStatus(option.value)}
                                            className="h-4 w-4 accent-blue-600"
                                        />
                                        <span className="text-sm font-medium">{option.label}</span>
                                    </div>
                                    <p className="mt-2 text-xs text-slate-500">{option.desc}</p>
                                </label>
                            ))}
                        </div>
                    </section>

                    {/* SUBMIT BAR */}
                    <div className="flex items-center justify-end gap-3 pb-4">
                        <button
                            type="button"
                            onClick={() => router.push("/admin/problems")}
                            disabled={saving}
                            className="rounded-xl border border-slate-700 px-5 py-3 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition-all duration-200 hover:from-blue-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {saving ? (
                                <Loader2 size={17} className="animate-spin" />
                            ) : (
                                <Save size={17} />
                            )}
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

