
"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useRouter } from "next/navigation";

type Difficulty = "easy" | "medium" | "hard";

type TestCase = {
    id: string;
    input: string;
    expectedOutput: string;
    isHidden: boolean;
};

export default function NewProblemPage() {
    const router = useRouter();

    const createProblem = useMutation(api.problems.createProblem);

    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        title: "",
        slug: "",
        description: "",

        difficulty: "easy" as Difficulty,
        category: "",

        inputFormat: "",
        outputFormat: "",
        constraints: "",

        sampleInput: "",
        sampleOutput: "",
        explanation: "",

        tags: "",

        timeLimitMs: 1000,
        memoryLimitMb: 256,

        testCases: [
            {
                id: crypto.randomUUID(),
                input: "",
                expectedOutput: "",
                isHidden: false,
            },
        ] as TestCase[],

        javascript: "",
        typescript: "",
        python: "",
        cpp: "",
        java: "",
    });

    function updateField(
        field: keyof typeof form,
        value: string | number
    ) {
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    }

    function addTestCase() {
        setForm((prev) => ({
            ...prev,
            testCases: [
                ...prev.testCases,
                {
                    id: crypto.randomUUID(),
                    input: "",
                    expectedOutput: "",
                    isHidden: true,
                },
            ],
        }));
    }

    function removeTestCase(index: number) {
        if (form.testCases.length <= 1) {
            alert("At least one test case is required.");
            return;
        }

        setForm((prev) => ({
            ...prev,
            testCases: prev.testCases.filter(
                (_, i) => i !== index
            ),
        }));
    }

    function updateTestCase(
        index: number,
        field: "input" | "expectedOutput" | "isHidden",
        value: string | boolean
    ) {
        setForm((prev) => ({
            ...prev,
            testCases: prev.testCases.map((test, i) =>
                i === index
                    ? {
                        ...test,
                        [field]: value,
                    }
                    : test
            ),
        }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!form.title.trim()) {
            alert("Problem title is required.");
            return;
        }

        if (!form.slug.trim()) {
            alert("Problem slug is required.");
            return;
        }

        if (!form.description.trim()) {
            alert("Problem description is required.");
            return;
        }

        if (!form.category.trim()) {
            alert("Problem category is required.");
            return;
        }

        if (form.testCases.length === 0) {
            alert("Add at least one test case.");
            return;
        }

        for (let i = 0; i < form.testCases.length; i++) {
            const test = form.testCases[i];

            if (!test.input.trim()) {
                alert(`Test Case #${i + 1}: Input is required.`);
                return;
            }

            if (!test.expectedOutput.trim()) {
                alert(
                    `Test Case #${i + 1}: Expected output is required.`
                );
                return;
            }
        }

        try {
            setLoading(true);

            /*
             * Convert constraints textarea into string[].
             *
             * Example:
             *
             * 1 <= n <= 1000
             * Numbers are positive
             *
             * becomes:
             *
             * [
             *   "1 <= n <= 1000",
             *   "Numbers are positive"
             * ]
             */
            const constraints = form.constraints
                .split("\n")
                .map((constraint) => constraint.trim())
                .filter(Boolean);

            /*
             * Convert comma-separated tags into string[].
             */
            const tags = form.tags
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean);

            /*
             * Create examples from the Sample Input,
             * Sample Output and Explanation fields.
             *
             * Convex requires:
             *
             * examples: v.array(
             *   v.object({
             *     explanation: v.optional(v.string()),
             *     id: v.string(),
             *     input: v.string(),
             *     output: v.string()
             *   })
             * )
             */
            const examples =
                form.sampleInput.trim() ||
                    form.sampleOutput.trim()
                    ? [
                        {
                            id: crypto.randomUUID(),
                            input: form.sampleInput.trim(),
                            output: form.sampleOutput.trim(),
                            explanation:
                                form.explanation.trim() ||
                                undefined,
                        },
                    ]
                    : [];

            /*
             * Convex requires every test case to contain:
             *
             * id
             * input
             * expectedOutput
             * isSample
             *
             * The UI uses isHidden, so we convert:
             *
             * isSample = !isHidden
             */
            const testCases = form.testCases.map((test) => ({
                id: test.id,
                input: test.input.trim(),
                expectedOutput:
                    test.expectedOutput.trim(),
                isSample: !test.isHidden,
            }));

            /*
             * Ensure difficulty always matches Convex:
             *
             * "easy" | "medium" | "hard"
             */
            const difficulty =
                form.difficulty.toLowerCase() as Difficulty;

            const problemId = await createProblem({
                title: form.title.trim(),

                slug: form.slug
                    .trim()
                    .toLowerCase()
                    .replace(/\s+/g, "-"),

                description: form.description.trim(),

                difficulty,

                category: form.category.trim(),

                inputFormat:
                    form.inputFormat.trim(),

                outputFormat:
                    form.outputFormat.trim(),

                constraints,

                /*
                 * REQUIRED BY CONVEX
                 */
                examples,

                tags,

                timeLimitMs:
                    Number(form.timeLimitMs),

                memoryLimitMb:
                    Number(form.memoryLimitMb),

                testCases,

                starterCode: {
                    javascript:
                        form.javascript.trim() ||
                        undefined,

                    typescript:
                        form.typescript.trim() ||
                        undefined,

                    python:
                        form.python.trim() ||
                        undefined,

                    cpp:
                        form.cpp.trim() ||
                        undefined,

                    java:
                        form.java.trim() ||
                        undefined,
                },
            });

            console.log(
                "Created problem:",
                problemId
            );

            alert(
                "Problem created successfully!"
            );

            router.push("/admin/problems");
        } catch (error) {
            console.error(
                "Create problem error:",
                error
            );

            alert(
                error instanceof Error
                    ? error.message
                    : "Failed to create problem."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#0b0f17] px-6 py-10 text-white">
            <div className="mx-auto max-w-5xl">

                {/* Header */}
                <div className="mb-8">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="mb-4 text-sm text-slate-400 transition hover:text-white"
                    >
                        ← Back
                    </button>

                    <h1 className="text-3xl font-bold">
                        Create New Problem
                    </h1>

                    <p className="mt-2 text-slate-400">
                        Add a new coding challenge to CodeRush.
                    </p>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="space-y-8"
                >

                    {/* Basic Information */}
                    <section className="rounded-2xl border border-slate-700 bg-[#111722] p-6">

                        <h2 className="mb-6 text-xl font-semibold">
                            Basic Information
                        </h2>

                        <div className="grid gap-5 md:grid-cols-2">

                            <Input
                                label="Problem Title"
                                value={form.title}
                                onChange={(value) =>
                                    updateField(
                                        "title",
                                        value
                                    )
                                }
                                placeholder="Two Sum"
                            />

                            <Input
                                label="Slug"
                                value={form.slug}
                                onChange={(value) =>
                                    updateField(
                                        "slug",
                                        value
                                    )
                                }
                                placeholder="two-sum"
                            />

                            {/* Difficulty */}
                            <div>
                                <label className="mb-2 block text-sm text-slate-300">
                                    Difficulty
                                </label>

                                <select
                                    value={
                                        form.difficulty
                                    }
                                    onChange={(e) =>
                                        updateField(
                                            "difficulty",
                                            e.target.value
                                        )
                                    }
                                    className="w-full rounded-xl border border-slate-700 bg-[#0b0f17] px-4 py-3 text-white outline-none focus:border-blue-500"
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

                            <Input
                                label="Category"
                                value={form.category}
                                onChange={(value) =>
                                    updateField(
                                        "category",
                                        value
                                    )
                                }
                                placeholder="Arrays"
                            />

                        </div>

                        <div className="mt-5">
                            <TextArea
                                label="Description"
                                value={form.description}
                                onChange={(value) =>
                                    updateField(
                                        "description",
                                        value
                                    )
                                }
                                placeholder="Describe the problem..."
                            />
                        </div>

                        <div className="mt-5">
                            <Input
                                label="Tags"
                                value={form.tags}
                                onChange={(value) =>
                                    updateField(
                                        "tags",
                                        value
                                    )
                                }
                                placeholder="array, hashmap, searching"
                            />

                            <p className="mt-2 text-xs text-slate-500">
                                Separate multiple tags with commas.
                            </p>
                        </div>

                    </section>

                    {/* Problem Details */}
                    <section className="rounded-2xl border border-slate-700 bg-[#111722] p-6">

                        <h2 className="mb-6 text-xl font-semibold">
                            Problem Details
                        </h2>

                        <div className="space-y-5">

                            <TextArea
                                label="Input Format"
                                value={form.inputFormat}
                                onChange={(value) =>
                                    updateField(
                                        "inputFormat",
                                        value
                                    )
                                }
                                placeholder="Describe the input..."
                            />

                            <TextArea
                                label="Output Format"
                                value={form.outputFormat}
                                onChange={(value) =>
                                    updateField(
                                        "outputFormat",
                                        value
                                    )
                                }
                                placeholder="Describe the output..."
                            />

                            <div>
                                <TextArea
                                    label="Constraints"
                                    value={
                                        form.constraints
                                    }
                                    onChange={(value) =>
                                        updateField(
                                            "constraints",
                                            value
                                        )
                                    }
                                    placeholder={`1 <= n <= 1000
All numbers are positive`}
                                />

                                <p className="mt-2 text-xs text-slate-500">
                                    Enter one constraint
                                    per line.
                                </p>
                            </div>

                            <TextArea
                                label="Explanation"
                                value={form.explanation}
                                onChange={(value) =>
                                    updateField(
                                        "explanation",
                                        value
                                    )
                                }
                                placeholder="Explain how the sample works..."
                            />

                        </div>

                    </section>

                    {/* Samples */}
                    <section className="rounded-2xl border border-slate-700 bg-[#111722] p-6">

                        <h2 className="mb-2 text-xl font-semibold">
                            Sample
                        </h2>

                        <p className="mb-6 text-sm text-slate-400">
                            These fields are automatically
                            converted into a Convex example.
                        </p>

                        <div className="grid gap-5 md:grid-cols-2">

                            <TextArea
                                label="Sample Input"
                                value={form.sampleInput}
                                onChange={(value) =>
                                    updateField(
                                        "sampleInput",
                                        value
                                    )
                                }
                                placeholder="2 7"
                            />

                            <TextArea
                                label="Sample Output"
                                value={form.sampleOutput}
                                onChange={(value) =>
                                    updateField(
                                        "sampleOutput",
                                        value
                                    )
                                }
                                placeholder="9"
                            />

                        </div>

                    </section>

                    {/* Limits */}
                    <section className="rounded-2xl border border-slate-700 bg-[#111722] p-6">

                        <h2 className="mb-6 text-xl font-semibold">
                            Execution Limits
                        </h2>

                        <div className="grid gap-5 md:grid-cols-2">

                            <Input
                                label="Time Limit (ms)"
                                type="number"
                                value={String(
                                    form.timeLimitMs
                                )}
                                onChange={(value) =>
                                    updateField(
                                        "timeLimitMs",
                                        Number(value)
                                    )
                                }
                            />

                            <Input
                                label="Memory Limit (MB)"
                                type="number"
                                value={String(
                                    form.memoryLimitMb
                                )}
                                onChange={(value) =>
                                    updateField(
                                        "memoryLimitMb",
                                        Number(value)
                                    )
                                }
                            />

                        </div>

                    </section>

                    {/* Test Cases */}
                    <section className="rounded-2xl border border-slate-700 bg-[#111722] p-6">

                        <div className="mb-6 flex items-center justify-between">

                            <div>
                                <h2 className="text-xl font-semibold">
                                    Test Cases
                                </h2>

                                <p className="mt-1 text-sm text-slate-400">
                                    Hidden test cases are
                                    not shown to users.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={addTestCase}
                                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium transition hover:bg-blue-500"
                            >
                                + Add Test
                            </button>

                        </div>

                        <div className="space-y-5">

                            {form.testCases.map(
                                (test, index) => (
                                    <div
                                        key={test.id}
                                        className="rounded-xl border border-slate-700 bg-[#0b0f17] p-5"
                                    >

                                        <div className="mb-4 flex items-center justify-between">

                                            <h3 className="font-medium">
                                                Test Case #
                                                {index + 1}
                                            </h3>

                                            <div className="flex items-center gap-4">

                                                <label className="flex items-center gap-2 text-sm text-slate-400">
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            test.isHidden
                                                        }
                                                        onChange={(
                                                            e
                                                        ) =>
                                                            updateTestCase(
                                                                index,
                                                                "isHidden",
                                                                e
                                                                    .target
                                                                    .checked
                                                            )
                                                        }
                                                    />

                                                    Hidden
                                                </label>

                                                {form
                                                    .testCases
                                                    .length >
                                                    1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                removeTestCase(
                                                                    index
                                                                )
                                                            }
                                                            className="text-sm text-red-400 transition hover:text-red-300"
                                                        >
                                                            Remove
                                                        </button>
                                                    )}

                                            </div>

                                        </div>

                                        <div className="grid gap-4 md:grid-cols-2">

                                            <TextArea
                                                label="Input"
                                                value={
                                                    test.input
                                                }
                                                onChange={(
                                                    value
                                                ) =>
                                                    updateTestCase(
                                                        index,
                                                        "input",
                                                        value
                                                    )
                                                }
                                                placeholder="Test input"
                                            />

                                            <TextArea
                                                label="Expected Output"
                                                value={
                                                    test.expectedOutput
                                                }
                                                onChange={(
                                                    value
                                                ) =>
                                                    updateTestCase(
                                                        index,
                                                        "expectedOutput",
                                                        value
                                                    )
                                                }
                                                placeholder="Expected output"
                                            />

                                        </div>

                                    </div>
                                )
                            )}

                        </div>

                    </section>

                    {/* Starter Code */}
                    <section className="rounded-2xl border border-slate-700 bg-[#111722] p-6">

                        <h2 className="mb-2 text-xl font-semibold">
                            Starter Code
                        </h2>

                        <p className="mb-6 text-sm text-slate-400">
                            Optional code templates for users.
                        </p>

                        <div className="space-y-5">

                            <CodeArea
                                label="JavaScript"
                                value={form.javascript}
                                onChange={(value) =>
                                    updateField(
                                        "javascript",
                                        value
                                    )
                                }
                            />

                            <CodeArea
                                label="TypeScript"
                                value={form.typescript}
                                onChange={(value) =>
                                    updateField(
                                        "typescript",
                                        value
                                    )
                                }
                            />

                            <CodeArea
                                label="Python"
                                value={form.python}
                                onChange={(value) =>
                                    updateField(
                                        "python",
                                        value
                                    )
                                }
                            />

                            <CodeArea
                                label="C++"
                                value={form.cpp}
                                onChange={(value) =>
                                    updateField(
                                        "cpp",
                                        value
                                    )
                                }
                            />

                            <CodeArea
                                label="Java"
                                value={form.java}
                                onChange={(value) =>
                                    updateField(
                                        "java",
                                        value
                                    )
                                }
                            />

                        </div>

                    </section>

                    {/* Submit */}
                    <div className="flex justify-end gap-4 pb-10">

                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="rounded-xl border border-slate-700 px-6 py-3 text-sm font-medium transition hover:bg-slate-800"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={loading}
                            className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-7 py-3 font-semibold shadow-lg transition hover:from-blue-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading
                                ? "Creating..."
                                : "Create Problem"}
                        </button>

                    </div>

                </form>

            </div>
        </div>
    );
}


/* ---------------- Input Component ---------------- */

function Input({
    label,
    value,
    onChange,
    placeholder,
    type = "text",
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: string;
}) {
    return (
        <div>
            <label className="mb-2 block text-sm text-slate-300">
                {label}
            </label>

            <input
                type={type}
                value={value}
                onChange={(e) =>
                    onChange(e.target.value)
                }
                placeholder={placeholder}
                className="w-full rounded-xl border border-slate-700 bg-[#0b0f17] px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
            />
        </div>
    );
}


/* ---------------- TextArea Component ---------------- */

function TextArea({
    label,
    value,
    onChange,
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}) {
    return (
        <div>
            <label className="mb-2 block text-sm text-slate-300">
                {label}
            </label>

            <textarea
                value={value}
                onChange={(e) =>
                    onChange(e.target.value)
                }
                placeholder={placeholder}
                rows={5}
                className="w-full resize-y rounded-xl border border-slate-700 bg-[#0b0f17] px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
            />
        </div>
    );
}


/* ---------------- CodeArea Component ---------------- */

function CodeArea({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <div>
            <label className="mb-2 block text-sm text-slate-300">
                {label}
            </label>

            <textarea
                value={value}
                onChange={(e) =>
                    onChange(e.target.value)
                }
                rows={8}
                spellCheck={false}
                className="w-full rounded-xl border border-slate-700 bg-[#080b10] px-4 py-3 font-mono text-sm text-slate-200 outline-none focus:border-blue-500"
                placeholder={`// ${label} starter code`}
            />
        </div>
    );
}
