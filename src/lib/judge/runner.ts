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
import type { LanguageId } from "@/lib/code-execution/types";
import { ExecutionTimeoutError } from "@/lib/code-execution/types";

import {
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
        .replace(/\r\n/g, "\n")
        .split("\n")
        .map((l) => l.replace(/[ \t]+$/g, ""))
        .join("\n")
        .trim();
}

interface SingleExec {
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
): Promise<Omit<JudgeResponse, "submissionId" | "createdAt">> {
    const { mode, language } = params;

    const selected = params.tests
        .filter((t) => mode === "submit" || !t.hidden)
        .slice(0, MAX_TESTS_PER_JUDGE_RUN);

    const testResults: JudgeTestCase[] = [];
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

        const caseStatus: JudgeTestCase["status"] = exec.timedOut
            ? "timeout"
            : exec.exitCode !== 0
              ? "runtime_error"
              : normalizeOutput(exec.stdout) ===
                  normalizeOutput(tc.expectedOutput)
                ? "accepted"
                : "wrong_answer";

        if (caseStatus === "accepted") {
            passedCount += 1;
        } else if (outcome === "accepted") {
            outcome =
                caseStatus === "timeout"
                    ? "time_limit_exceeded"
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
            parsedError = parseError({
                language,
                compileOutput:
                    exec.exitCode !== 0 &&
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
                // Non-zero exit without a recognizable message is still a
                // genuine runtime failure.
                parsedError = makeInternalError(
                    `Program exited with code ${exec.exitCode}.`,
                );
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

        // The FIRST failing case ends submission-style judging; running all
        // cases would waste quota once the verdict is already decided.
        if (outcome !== "accepted") break;
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
    };
}

/**
 * Run a full judging pass. Throws only on infrastructure errors
 * (unavailable backend / misconfiguration are surfaced by the route).
 */
export async function judge(
    params: JudgeParams,
): Promise<Omit<JudgeResponse, "submissionId" | "createdAt">> {
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
        const outcome: JudgeOutcome = exec.timedOut
            ? "time_limit_exceeded"
            : error?.type === "memory_limit"
              ? "memory_limit_exceeded"
              : error !== null && exec.exitCode !== 0
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
        };
    }

    return judgeTests(params);
}
