/**
 * Judge runner — executes submissions against problem test cases using
 * the existing sandboxed execution infrastructure (`executeCode`).
 *
 * Server-only module. Guarantees:
 *   - Every execution goes through an isolated backend (Piston/Docker);
 *     user code never runs inside the Next.js process.
 *   - Hidden test data NEVER appears in the returned results.
 *   - All diagnoses come from real compiler/runtime output parsed by
 *     the language-specific parsers; nothing is mocked.
 */

import { executeCode } from "@/lib/code-execution/executor";
import type {
    ExecutionResult,
    LanguageId,
} from "@/lib/code-execution/types";
import { ExecutionTimeoutError } from "@/lib/code-execution/types";

import {
    makeCompilationError,
    makeInternalError,
    makeTimeLimitError,
    parseError,
} from "@/lib/error-parsing";
import type { ParsedError } from "@/lib/error-parsing/types";

import type {
    CustomRunResult,
    JudgeMode,
    JudgeOutcome,
    JudgeResponse,
    JudgeTestCase,
} from "./types";

/** Hard cap so one submit cannot monopolize a worker for minutes. */
const MAX_TESTS_PER_JUDGE_RUN = 60;

/**
 * Full judge output. `passedTestCaseIds` is server-only: it feeds the XP
 * accounting in Convex and is stripped before the response reaches the
 * browser (the browser only ever sees per-test statuses and aggregates).
 */
export type JudgeRunResult = Omit<
    JudgeResponse,
    "submissionId" | "createdAt" | "xpAwarded"
> & {
    /** Ids of the test cases that passed (hidden ones included). */
    passedTestCaseIds: string[];
};

export interface JudgeTest {
    id: string;
    input: string;
    expectedOutput: string;
    hidden: boolean;
}

export interface JudgeParams {
    mode: JudgeMode;
    language: LanguageId;
    code: string;
    tests: JudgeTest[];
    customInput?: string | null;
    timeLimitMs: number;
    memoryLimitMb: number;
}

function normalizeOutput(s: string): string {
    return s
        // Normalize Windows (CRLF) and legacy Mac (lone CR) line endings.
        .replace(/\r\n?/g, "\n")
        .split("\n")
        .map((l) => l.replace(/[ \t]+$/g, ""))
        .join("\n")
        .trim();
}

interface SingleExec {
    /**
     * Status reported by the execution backend. Preserved verbatim so the
     * judge maps verdicts (compilation_error / runtime_error / timeout /
     * success) from the ACTUAL backend status instead of re-inferring them
     * from `exitCode` or output heuristics.
     */
    status: ExecutionResult["status"];
    stdout: string;
    stderr: string;
    exitCode: number | null;
    executionTimeMs: number;
    memoryUsageKb: number | null;
    timedOut: boolean;
}

async function executeOnce(
    language: LanguageId,
    code: string,
    stdin: string,
): Promise<SingleExec> {
    const startedAt = Date.now();
    try {
        const result = await executeCode({ language, code, input: stdin });
        const timedOut =
            result.status === "timeout" ||
            /timed?\s*out/i.test(result.error ?? "");
        return {
            status: result.status,
            stdout: result.output ?? "",
            stderr: result.error ?? "",
            exitCode: result.success ? 0 : 1,
            executionTimeMs: Math.max(1, result.executionTime),
            memoryUsageKb: result.memoryUsageKb ?? null,
            timedOut,
        };
    } catch (err) {
        if (
            err instanceof ExecutionTimeoutError ||
            (err instanceof Error && err.name === "ExecutionTimeoutError")
        ) {
            return {
                status: "timeout",
                stdout: "",
                stderr: "",
                exitCode: null,
                executionTimeMs: Date.now() - startedAt,
                memoryUsageKb: null,
                timedOut: true,
            };
        }
        throw err;
    }
}

async function judgeTests(
    params: JudgeParams,
): Promise<JudgeRunResult> {
    const { mode, language } = params;

    const selected = params.tests
        .filter((t) => mode === "submit" || mode === "test" || !t.hidden)
        .slice(0, MAX_TESTS_PER_JUDGE_RUN);

    // Strictness guard: the judge must NEVER mark a problem Accepted when
    // there is nothing to compare against. A compile that succeeds (or a
    // program that merely runs) is not proof of correctness. Without at
    // least one admin-defined test case there is no input → output
    // contract, so the result is an internal error, not Accepted.
    if (selected.length === 0) {
        const error = makeInternalError(
            "This problem has no test cases configured, so it cannot be judged. Please contact the problem author.",
        );
        return {
            ok: false,
            outcome: "internal_error",
            mode,
            problemSlug: "",
            language,
            error,
            testResults: [],
            passedCount: 0,
            totalCount: 0,
            totalRuntimeMs: 0,
            maxMemoryKb: null,
            custom: null,
            passedTestCaseIds: [],
        };
    }

    const testResults: JudgeTestCase[] = [];
    const passedTestCaseIds: string[] = [];
    let passedCount = 0;
    let maxRuntime = 0;
    let maxMemoryKb: number | null = null;
    let outcome: JudgeOutcome = "accepted";
    let topError: ParsedError | null = null;

    for (let i = 0; i < selected.length; i += 1) {
        const tc = selected[i];
        let exec: SingleExec;
        try {
            exec = await executeOnce(language, params.code, tc.input);
        } catch (err) {
            // Infrastructure failure (backend down / misconfigured):
            // surface it rather than fabricating a verdict.
            topError = makeInternalError(
                err instanceof Error ? err.message : String(err),
            );
            outcome = "internal_error";
            break;
        }

        maxRuntime = Math.max(maxRuntime, exec.executionTimeMs);
        if (exec.memoryUsageKb !== null) {
            maxMemoryKb =
                maxMemoryKb === null
                    ? exec.memoryUsageKb
                    : Math.max(maxMemoryKb, exec.memoryUsageKb);
        }

        const caseStatus: JudgeTestCase["status"] =
            exec.status === "compilation_error"
                ? "compilation_error"
                : exec.timedOut || exec.status === "timeout"
                  ? "timeout"
                  : exec.exitCode !== 0
                    ? "runtime_error"
                    : normalizeOutput(exec.stdout) ===
                        normalizeOutput(tc.expectedOutput)
                      ? "accepted"
                      : "wrong_answer";

        // Server-side diagnostics (see the problem-runner trace). Only the
        // Next.js terminal sees this — never the browser.
        console.log(
            `[problem-runner] language: ${language}`,
            `| problem: judging`,
            `| test input: ${tc.hidden ? "(hidden)" : JSON.stringify(tc.input)}`,
            `| expected output: ${tc.hidden ? "(hidden)" : JSON.stringify(tc.expectedOutput)}`,
            `| execution status: ${exec.status}`,
            `| execution output: ${JSON.stringify(exec.stdout)}`,
            `| execution error: ${JSON.stringify(exec.stderr)}`,
            `| final test status: ${caseStatus}`,
        );

        if (caseStatus === "accepted") {
            passedCount += 1;
            passedTestCaseIds.push(tc.id);
        } else if (outcome === "accepted") {
            outcome =
                caseStatus === "timeout"
                    ? "time_limit_exceeded"
                    : caseStatus === "compilation_error"
                      ? "compilation_error"
                      : caseStatus === "runtime_error"
                        ? "runtime_error"
                        : "wrong_answer";
        } else if (
            caseStatus === "runtime_error" &&
            outcome === "wrong_answer"
        ) {
            outcome = "runtime_error";
        }

        let parsedError: ParsedError | null = null;
        if (exec.timedOut) {
            parsedError = makeTimeLimitError({
                timeLimitMs: params.timeLimitMs,
                actualMs: exec.executionTimeMs,
            });
        } else {
            // When the backend reported a compilation failure, feed the
            // compiler diagnostics through the compile path so the parser
            // yields a REAL `compilation_error` (with line/column when
            // available) — never a guessed runtime_error.
            parsedError = parseError({
                language,
                compileOutput:
                    exec.status === "compilation_error"
                        ? exec.stderr || null
                        : exec.exitCode !== 0 &&
                            /(?:fatal\s+error|:\s*\d+:\s*(?:\d+:)?\s*error:)/i.test(exec.stderr)
                          ? exec.stderr
                          : null,
                stderr: exec.stderr || null,
                stdout: exec.stdout,
                exitCode: exec.exitCode,
            });
            if (parsedError?.type === "memory_limit") {
                outcome = "memory_limit_exceeded";
            }
            if (exec.exitCode !== 0 && parsedError === null) {
                if (exec.status === "compilation_error") {
                    // Backend said "compilation failed" but produced no
                    // diagnostics — still a compilation error, not runtime.
                    parsedError = makeCompilationError(
                        exec.stderr || "Compilation failed.",
                    );
                } else {
                    // Non-zero exit without a recognizable message is still
                    // a genuine runtime failure.
                    parsedError = makeInternalError(
                        `Program exited with code ${exec.exitCode}.`,
                    );
                }
            }
        }
        if (topError === null && outcome !== "accepted") {
            topError = parsedError;
        }

        testResults.push({
            id: tc.id,
            index: i + 1,
            hidden: tc.hidden,
            status: caseStatus,
            // Hidden tests reveal only status/timing — never their data.
            input: tc.hidden ? null : tc.input,
            expectedOutput:
                tc.hidden || caseStatus === "accepted"
                    ? null
                    : tc.expectedOutput,
            actualOutput: tc.hidden ? null : exec.stdout,
            executionTimeMs: exec.executionTimeMs,
            memoryUsageKb: exec.memoryUsageKb,
        });

        // §10: every test case gets an independent result. Submit mode does
        // NOT stop at the first failure — all configured tests are executed
        // and compared so passed/failed counts and per-test XP (§12) reflect
        // the complete judging result. Run mode shows every visible test's
        // verdict as well (e.g. ✓ Test 1 / ✗ Test 2 / ✓ Test 3).
    }

    return {
        ok: outcome === "accepted" && passedCount === selected.length,
        outcome,
        mode,
        problemSlug: "",
        language,
        error: topError,
        testResults,
        passedCount,
        totalCount: selected.length,
        totalRuntimeMs: maxRuntime,
        maxMemoryKb,
        custom: null,
        passedTestCaseIds,
    };
}

/**
 * Run a full judging pass. Throws only on infrastructure errors
 * (unavailable backend / misconfiguration are surfaced by the route).
 */
export async function judge(
    params: JudgeParams,
): Promise<JudgeRunResult> {
    const { mode, language, code } = params;

    // ------------------------------------------------------------------
    // Custom-input mode: a single execution, comparisons skipped.
    // ------------------------------------------------------------------
    if (mode === "custom") {
        const exec = await executeOnce(language, code, params.customInput ?? "");
        const error = exec.timedOut
            ? makeTimeLimitError({
                  timeLimitMs: params.timeLimitMs,
                  actualMs: exec.executionTimeMs,
              })
            : parseError({
                  language,
                  stderr: exec.stderr || null,
                  exitCode: exec.exitCode,
              });
        const custom: CustomRunResult = {
            stdout: exec.stdout,
            stderr: exec.stderr,
            exitCode: exec.exitCode,
            executionTimeMs: exec.executionTimeMs,
            memoryUsageKb: exec.memoryUsageKb,
        };
        // The outcome reflects the ACTUAL execution behaviour: a program
        // that crashed or exited non-zero (e.g. it required input that was
        // not supplied) is a runtime error — never a silent "accepted".
        const outcome: JudgeOutcome = exec.timedOut
            ? "time_limit_exceeded"
            : error?.type === "memory_limit"
              ? "memory_limit_exceeded"
              : exec.exitCode !== 0
                ? "runtime_error"
                : "accepted";
        return {
            ok: !exec.timedOut && exec.exitCode === 0,
            outcome,
            mode,
            problemSlug: "",
            language,
            error,
            testResults: [],
            passedCount: 0,
            totalCount: 0,
            totalRuntimeMs: exec.executionTimeMs,
            maxMemoryKb: exec.memoryUsageKb,
            custom,
            // Custom runs are never judged — no XP, no test accounting.
            passedTestCaseIds: [],
        };
    }

    // ------------------------------------------------------------------
    // Test mode: run with custom input, compare output against all tests.
    // ------------------------------------------------------------------
    if (mode === "test") {
        // Execute the code once with the user's custom input.
        const customExec = await executeOnce(language, code, params.customInput ?? "");

        const custom: CustomRunResult = {
            stdout: customExec.stdout,
            stderr: customExec.stderr,
            exitCode: customExec.exitCode,
            executionTimeMs: customExec.executionTimeMs,
            memoryUsageKb: customExec.memoryUsageKb,
        };

        // If the execution itself failed, return early with the error.
        if (customExec.timedOut) {
            const error = makeTimeLimitError({
                timeLimitMs: params.timeLimitMs,
                actualMs: customExec.executionTimeMs,
            });
            return {
                ok: false,
                outcome: "time_limit_exceeded",
                mode,
                problemSlug: "",
                language,
                error,
                testResults: [],
                passedCount: 0,
                totalCount: 0,
                totalRuntimeMs: customExec.executionTimeMs,
                maxMemoryKb: customExec.memoryUsageKb,
                custom,
                passedTestCaseIds: [],
            };
        }

        if (customExec.exitCode !== 0) {
            const error = parseError({
                language,
                stderr: customExec.stderr || null,
                exitCode: customExec.exitCode,
            });
            return {
                ok: false,
                outcome: "runtime_error",
                mode,
                problemSlug: "",
                language,
                error,
                testResults: [],
                passedCount: 0,
                totalCount: 0,
                totalRuntimeMs: customExec.executionTimeMs,
                maxMemoryKb: customExec.memoryUsageKb,
                custom,
                passedTestCaseIds: [],
            };
        }

        // Compare the custom output against ALL test cases (public + hidden).
        const userOutput = normalizeOutput(customExec.stdout);
        const testResults: JudgeTestCase[] = params.tests.map((test, idx) => {
            const expectedOutput = normalizeOutput(test.expectedOutput);
            const passed = userOutput === expectedOutput;
            return {
                id: test.id,
                index: idx + 1,
                hidden: test.hidden,
                status: passed ? "accepted" : "wrong_answer",
                input: test.hidden ? null : test.input,
                expectedOutput: test.hidden ? null : test.expectedOutput,
                actualOutput: test.hidden ? null : customExec.stdout,
                executionTimeMs: customExec.executionTimeMs,
                memoryUsageKb: customExec.memoryUsageKb,
            };
        });

        const passedCount = testResults.filter((t) => t.status === "accepted").length;
        const allPassed = passedCount === testResults.length;

        return {
            ok: allPassed,
            outcome: allPassed ? "accepted" : "wrong_answer",
            mode,
            problemSlug: "",
            language,
            error: null,
            testResults,
            passedCount,
            totalCount: testResults.length,
            totalRuntimeMs: customExec.executionTimeMs,
            maxMemoryKb: customExec.memoryUsageKb,
            custom,
            // Test mode never persists a submission or awards XP.
            passedTestCaseIds: [],
        };
    }

    return judgeTests(params);
}
