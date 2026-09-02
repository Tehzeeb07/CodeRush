/**
 * Shared judge contracts between the API routes, Convex functions and
 * the editor workspace components.
 *
 * Hidden test cases NEVER carry their input/expected data through these
 * types — only aggregate status information travels to the browser.
 */

import type { ParsedError } from "@/lib/error-parsing/types";

/** A sample test case visible to users (rendered under Examples). */
export interface SampleTestCase {
    id: string;
    input: string;
    output: string;
    explanation?: string | null;
}

/** Public-safe problem projection returned by queries/API. */
export interface SanitizedProblem {
    slug: string;
    title: string;
    difficulty: "easy" | "medium" | "hard";
    tags: string[];
    description: string;
    examples: SampleTestCase[];
    constraints: string[];
    timeLimitMs: number;
    memoryLimitMb: number;
    /** Counts of tests for display: [sampleCount, hiddenCount]. */
    counts: { sample: number; hidden: number };
}

export interface JudgeTestCase {
    id: string;
    /** Test cases, 1-based stable order. */
    index: number;
    hidden: boolean;
    status:
        | "accepted"
        | "wrong_answer"
        | "compilation_error"
        | "runtime_error"
        | "timeout"
        | "memory_limit";
    /**
     * Non-null ONLY for visible tests. Hidden tests reveal status/timing
     * exclusively.
     */
    input: string | null;
    expectedOutput: string | null;
    actualOutput: string | null;
    executionTimeMs: number;
    memoryUsageKb: number | null;
}

export type JudgeOutcome =
    | "accepted"
    | "wrong_answer"
    | "compilation_error"
    | "runtime_error"
    | "time_limit_exceeded"
    | "memory_limit_exceeded"
    | "internal_error";

/** Mode semantics (requirement §13). */
export type JudgeMode =
    /** Run against the sample (public) test cases only. */
    | "run"
    /** Execute once with arbitrary custom stdin; no verdict comparisons. */
    | "custom"
    /** Judge against ALL public + hidden tests and persist a submission. */
    | "submit"
    /**
     * Run custom-input execution AND validate against ALL public + hidden
     * tests. No submission is persisted and no XP is awarded. This powers
     * the unified Test Results panel where users provide stdin and see
     * both their output and the full test verdict without committing a
     * submission.
     */
    | "test";

export interface CustomRunResult {
    stdout: string;
    stderr: string;
    exitCode: number | null;
    executionTimeMs: number;
    memoryUsageKb: number | null;
}

/** Response body of POST /api/judge. */
export interface JudgeResponse {
    ok: boolean;
    outcome: JudgeOutcome;
    mode: JudgeMode;
    problemSlug: string;
    language: string;
    /** Deterministically parsed top-level error (compile/TLE/etc.). */
    error: ParsedError | null;
    /** Per-test results (sample details revealed, hidden aggregated). */
    testResults: JudgeTestCase[];
    passedCount: number;
    totalCount: number;
    totalRuntimeMs: number;
    maxMemoryKb: number | null;
    /** Only present for mode === "custom". */
    custom: CustomRunResult | null;
    /** Only present for mode === "submit". */
    submissionId: string | null;
    createdAt: number | null;
    /**
     * XP granted by the backend for this submission (§12). Null when no XP
     * accounting ran (run/custom modes, anonymous users, or XP already
     * awarded earlier). Computed exclusively server-side — the client only
     * displays this value, it can never influence it (§13).
     */
    xpAwarded: number | null;
}

/** Shape stored in/returned from Convex for submission history. */
export interface SubmissionSummary {
    _id: string;
    problemSlug: string;
    problemTitle: string;
    language: string;
    outcome: JudgeOutcome;
    passedCount: number;
    totalCount: number;
    runtimeMs: number;
    memoryKb: number | null;
    createdAt: number;
}
