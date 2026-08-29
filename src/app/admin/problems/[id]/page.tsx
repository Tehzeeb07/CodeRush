"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import {
    ArrowLeft,
    Save,
    Loader2,
    Plus,
    Trash2,
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

export default function EditProblemPage() {
    const params = useParams();
    const router = useRouter();

    const slug = decodeURIComponent(
        String(params.slug)
    );

    const problem = useQuery(api.problems.getProblemFull, {
        slug,
    });

    const updateProblem = useMutation(
        api.problems.updateProblem
    );

    const [title, setTitle] = useState("");
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

    const [examples, setExamples] = useState<Example[]>(
        []
    );

    const [testCases, setTestCases] = useState<TestCase[]>(
        []
    );

    const [published, setPublished] = useState(false);
    const [archived, setArchived] = useState(false);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!problem) return;

        setTitle(problem.title);
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

        setPublished(problem.published ?? false);
        setArchived(problem.archived ?? false);
    }, [problem]);

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

    const handleSave = async (
        event: React.FormEvent
    ) => {
        event.preventDefault();

        if (!title.trim()) {
            setError("Title is required.");
            return;
        }

        if (!description.trim()) {
            setError("Description is required.");
            return;
        }

        if (testCases.length === 0) {
            setError(
                "At least one test case is required."
            );
            return;
        }

        setSaving(true);
        setError("");

        try {
            await updateProblem({
                id: problem!._id,
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
                published,
                archived,
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

            router.push(
                `/admin/problems/${encodeURIComponent(
                    problem!.slug
                )}`
            );
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
                <h1 className="text-2xl font-bold">
                    Problem not found
                </h1>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0F1117] p-6 text-white md:p-8">
            <div className="mx-auto max-w-6xl">
                {/* HEADER */}
                <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <button
                        type="button"
                        onClick={() =>
                            router.push(
                                `/admin/problems/${encodeURIComponent(
                                    problem.slug
                                )}`
                            )
                        }
                        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
                    >
                        <ArrowLeft size={17} />
                        Back to Problem
                    </button>

                    <h1 className="text-2xl font-bold">
                        Edit Problem
                    </h1>
                </div>

                {error && (
                    <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                        {error}
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
                                <label className="mb-2 block text-sm text-slate-300">
                                    Title
                                </label>

                                <input
                                    value={title}
                                    onChange={(e) =>
                                        setTitle(e.target.value)
                                    }
                                    className="w-full rounded-xl border border-slate-700 bg-[#0F1117] px-4 py-3 text-sm outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="grid gap-5 md:grid-cols-3">
                                <div>
                                    <label className="mb-2 block text-sm text-slate-300">
                                        Difficulty
                                    </label>

                                    <select
                                        value={difficulty}
                                        onChange={(e) =>
                                            setDifficulty(
                                                e.target.value as
                                                | "easy"
                                                | "medium"
                                                | "hard"
                                            )
                                        }
                                        className="w-full rounded-xl border border-slate-700 bg-[#0F1117] px-4 py-3 text-sm outline-none focus:border-blue-500"
                                    >
                                        <option value="easy">
                                            Easy
                                        </option>
                                        <option value="medium">
                                            Medium
                                        </option>
                                        <option value="hard">
                                            Hard
                                        </option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm text-slate-300">
                                        Category
                                    </label>

                                    <input
                                        value={category}
                                        onChange={(e) =>
                                            setCategory(e.target.value)
                                        }
                                        className="w-full rounded-xl border border-slate-700 bg-[#0F1117] px-4 py-3 text-sm outline-none focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm text-slate-300">
                                        Tags
                                    </label>

                                    <input
                                        value={tags}
                                        onChange={(e) =>
                                            setTags(e.target.value)
                                        }
                                        placeholder="array, hash-map, searching"
                                        className="w-full rounded-xl border border-slate-700 bg-[#0F1117] px-4 py-3 text-sm outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm text-slate-300">
                                    Description
                                </label>

                                <textarea
                                    value={description}
                                    onChange={(e) =>
                                        setDescription(e.target.value)
                                    }
                                    rows={9}
                                    className="w-full resize-y rounded-xl border border-slate-700 bg-[#0F1117] px-4 py-3 text-sm outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm text-slate-300">
                                    Constraints
                                </label>

                                <textarea
                                    value={constraints}
                                    onChange={(e) =>
                                        setConstraints(e.target.value)
                                    }
                                    rows={6}
                                    placeholder="One constraint per line"
                                    className="w-full resize-y rounded-xl border border-slate-700 bg-[#0F1117] px-4 py-3 text-sm outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </section>

                    {/* LIMITS */}
                    <section className="rounded-2xl border border-slate-800 bg-[#151922] p-6">
                        <h2 className="mb-6 text-lg font-semibold">
                            Execution Limits
                        </h2>

                        <div className="grid gap-5 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm text-slate-300">
                                    Time Limit (ms)
                                </label>

                                <input
                                    type="number"
                                    min={1}
                                    value={timeLimitMs}
                                    onChange={(e) =>
                                        setTimeLimitMs(
                                            Number(e.target.value)
                                        )
                                    }
                                    className="w-full rounded-xl border border-slate-700 bg-[#0F1117] px-4 py-3 text-sm outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm text-slate-300">
                                    Memory Limit (MB)
                                </label>

                                <input
                                    type="number"
                                    min={1}
                                    value={memoryLimitMb}
                                    onChange={(e) =>
                                        setMemoryLimitMb(
                                            Number(e.target.value)
                                        )
                                    }
                                    className="w-full rounded-xl border border-slate-700 bg-[#0F1117] px-4 py-3 text-sm outline-none focus:border-blue-500"
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
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold hover:bg-blue-500"
                            >
                                <Plus size={15} />
                                Add Example
                            </button>
                        </div>

                        <div className="space-y-5">
                            {examples.map((example, index) => (
                                <div
                                    key={example.id}
                                    className="rounded-xl border border-slate-800 bg-[#0F1117] p-5"
                                >
                                    <div className="mb-4 flex items-center justify-between">
                                        <h3 className="text-sm font-semibold">
                                            Example #{index + 1}
                                        </h3>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                removeExample(example.id)
                                            }
                                            className="rounded-lg p-2 text-red-400 hover:bg-red-500/10"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <textarea
                                            value={example.input}
                                            onChange={(e) =>
                                                setExamples((current) =>
                                                    current.map((item) =>
                                                        item.id === example.id
                                                            ? {
                                                                ...item,
                                                                input:
                                                                    e.target.value,
                                                            }
                                                            : item
                                                    )
                                                )
                                            }
                                            placeholder="Input"
                                            rows={5}
                                            className="rounded-xl border border-slate-700 bg-[#151922] p-4 text-sm outline-none focus:border-blue-500"
                                        />

                                        <textarea
                                            value={example.output}
                                            onChange={(e) =>
                                                setExamples((current) =>
                                                    current.map((item) =>
                                                        item.id === example.id
                                                            ? {
                                                                ...item,
                                                                output:
                                                                    e.target.value,
                                                            }
                                                            : item
                                                    )
                                                )
                                            }
                                            placeholder="Output"
                                            rows={5}
                                            className="rounded-xl border border-slate-700 bg-[#151922] p-4 text-sm outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    <textarea
                                        value={example.explanation ?? ""}
                                        onChange={(e) =>
                                            setExamples((current) =>
                                                current.map((item) =>
                                                    item.id === example.id
                                                        ? {
                                                            ...item,
                                                            explanation:
                                                                e.target.value,
                                                        }
                                                        : item
                                                )
                                            )
                                        }
                                        placeholder="Explanation (optional)"
                                        rows={3}
                                        className="mt-4 w-full rounded-xl border border-slate-700 bg-[#151922] p-4 text-sm outline-none focus:border-blue-500"
                                    />
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* TEST CASES */}
                    <section className="rounded-2xl border border-slate-800 bg-[#151922] p-6">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold">
                                    Test Cases
                                </h2>

                                <p className="mt-1 text-xs text-slate-500">
                                    Hidden test cases are never exposed to normal
                                    users.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={addTestCase}
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold hover:bg-blue-500"
                            >
                                <Plus size={15} />
                                Add Test
                            </button>
                        </div>

                        <div className="space-y-5">
                            {testCases.map((test, index) => (
                                <div
                                    key={test.id}
                                    className="rounded-xl border border-slate-800 bg-[#0F1117] p-5"
                                >
                                    <div className="mb-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-sm font-semibold">
                                                Test Case #{index + 1}
                                            </h3>

                                            <label className="flex items-center gap-2 text-xs text-slate-400">
                                                <input
                                                    type="checkbox"
                                                    checked={test.isSample}
                                                    onChange={(e) =>
                                                        setTestCases(
                                                            (current) =>
                                                                current.map(
                                                                    (item) =>
                                                                        item.id ===
                                                                            test.id
                                                                            ? {
                                                                                ...item,
                                                                                isSample:
                                                                                    e.target
                                                                                        .checked,
                                                                            }
                                                                            : item
                                                                )
                                                        )
                                                    }
                                                />
                                                Sample
                                            </label>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                removeTestCase(test.id)
                                            }
                                            className="rounded-lg p-2 text-red-400 hover:bg-red-500/10"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <textarea
                                            value={test.input}
                                            onChange={(e) =>
                                                setTestCases((current) =>
                                                    current.map((item) =>
                                                        item.id === test.id
                                                            ? {
                                                                ...item,
                                                                input:
                                                                    e.target.value,
                                                            }
                                                            : item
                                                    )
                                                )
                                            }
                                            placeholder="Input"
                                            rows={6}
                                            className="rounded-xl border border-slate-700 bg-[#151922] p-4 text-sm outline-none focus:border-blue-500"
                                        />

                                        <textarea
                                            value={test.expectedOutput}
                                            onChange={(e) =>
                                                setTestCases((current) =>
                                                    current.map((item) =>
                                                        item.id === test.id
                                                            ? {
                                                                ...item,
                                                                expectedOutput:
                                                                    e.target.value,
                                                            }
                                                            : item
                                                    )
                                                )
                                            }
                                            placeholder="Expected Output"
                                            rows={6}
                                            className="rounded-xl border border-slate-700 bg-[#151922] p-4 text-sm outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* FORMATS / HINTS / EDITORIAL */}
                    <section className="rounded-2xl border border-slate-800 bg-[#151922] p-6">
                        <h2 className="mb-6 text-lg font-semibold">
                            Additional Information
                        </h2>

                        <div className="space-y-5">
                            <textarea
                                value={inputFormat}
                                onChange={(e) =>
                                    setInputFormat(e.target.value)
                                }
                                placeholder="Input format"
                                rows={3}
                                className="w-full rounded-xl border border-slate-700 bg-[#0F1117] p-4 text-sm outline-none focus:border-blue-500"
                            />

                            <textarea
                                value={outputFormat}
                                onChange={(e) =>
                                    setOutputFormat(e.target.value)
                                }
                                placeholder="Output format"
                                rows={3}
                                className="w-full rounded-xl border border-slate-700 bg-[#0F1117] p-4 text-sm outline-none focus:border-blue-500"
                            />

                            <textarea
                                value={hints}
                                onChange={(e) =>
                                    setHints(e.target.value)
                                }
                                placeholder="Hints — one per line"
                                rows={5}
                                className="w-full rounded-xl border border-slate-700 bg-[#0F1117] p-4 text-sm outline-none focus:border-blue-500"
                            />

                            <textarea
                                value={editorial}
                                onChange={(e) =>
                                    setEditorial(e.target.value)
                                }
                                placeholder="Editorial / solution explanation"
                                rows={8}
                                className="w-full rounded-xl border border-slate-700 bg-[#0F1117] p-4 text-sm outline-none focus:border-blue-500"
                            />

                            <input
                                value={supportedLanguages}
                                onChange={(e) =>
                                    setSupportedLanguages(e.target.value)
                                }
                                placeholder="Supported languages: cpp, javascript, python"
                                className="w-full rounded-xl border border-slate-700 bg-[#0F1117] px-4 py-3 text-sm outline-none focus:border-blue-500"
                            />
                        </div>
                    </section>

                    {/* PUBLISH SETTINGS */}
                    <section className="rounded-2xl border border-slate-800 bg-[#151922] p-6">
                        <h2 className="mb-5 text-lg font-semibold">
                            Publishing
                        </h2>

                        <div className="space-y-4">
                            <label className="flex cursor-pointer items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={published}
                                    onChange={(e) =>
                                        setPublished(e.target.checked)
                                    }
                                />

                                <div>
                                    <p className="text-sm font-medium">
                                        Published
                                    </p>

                                    <p className="text-xs text-slate-500">
                                        Make this problem available to users.
                                    </p>
                                </div>
                            </label>

                            <label className="flex cursor-pointer items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={archived}
                                    onChange={(e) =>
                                        setArchived(e.target.checked)
                                    }
                                />

                                <div>
                                    <p className="text-sm font-medium">
                                        Archived
                                    </p>

                                    <p className="text-xs text-slate-500">
                                        Hide this problem from normal active listings.
                                    </p>
                                </div>
                            </label>
                        </div>
                    </section>

                    {/* SAVE */}
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={() =>
                                router.push(
                                    `/admin/problems/${encodeURIComponent(
                                        problem.slug
                                    )}`
                                )
                            }
                            className="rounded-xl border border-slate-700 px-6 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {saving ? (
                                <>
                                    <Loader2
                                        size={17}
                                        className="animate-spin"
                                    />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save size={17} />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}