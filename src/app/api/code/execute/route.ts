/**
 * POST /api/code/execute
 *
 * Executes code and stores execution logs in Convex.
 */

import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";

import { api } from "@/../convex/_generated/api";

import { executeCode } from "@/lib/code-execution/executor";
import { SANDBOX_LIMITS } from "@/lib/code-execution/sandbox";
import { isSupportedLanguage } from "@/lib/code-execution/languages";
import { checkRateLimit } from "@/lib/code-execution/rate-limit";

import {
    BackendUnavailableError,
    ConfigurationError,
    ExecutionTimeoutError,
    ValidationError,
} from "@/lib/code-execution/types";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Convex server client.
 */
const convex = new ConvexHttpClient(
    process.env.NEXT_PUBLIC_CONVEX_URL!
);

function getClientKey(request: NextRequest): string {
    return (
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        "local"
    );
}

/**
 * Save a log into Convex.
 */
async function saveExecutionLog(
    executionId: string | undefined,
    type: "stdout" | "stderr" | "stdin" | "system",
    data: string,
    sequence: number
) {
    if (!executionId || !data) {
        return;
    }

    try {
        // The inbound executionId is the client-side correlation UUID, but the
        // logs table references the executions row by its Convex document id,
        // so resolve it first (mirrors the editor client in code/page.tsx).
        const execution = await convex.query(api.executions.getExecution, {
            executionId,
        });
        if (!execution) {
            console.warn(
                `[execution-log] cannot save log: execution ${executionId} not found`
            );
            return;
        }

        await convex.mutation(api.executionLogs.addLog, {
            executionId: execution._id,
            type,
            data,
            sequence,
        });

        console.log(
            `[execution-log] saved ${type} for execution ${executionId}`
        );
    } catch (error) {
        /**
         * Logging failure should NOT make the actual code execution fail.
         */
        console.error(
            "[execution-log] failed to save log:",
            error
        );
    }
}

export async function POST(request: NextRequest) {
    // -------------------------------------------------------------
    // Rate limiting
    // -------------------------------------------------------------
    if (!checkRateLimit(getClientKey(request))) {
        return NextResponse.json(
            {
                error:
                    "Too many requests. Please wait a moment and try again.",
            },
            { status: 429 }
        );
    }

    // -------------------------------------------------------------
    // Parse body
    // -------------------------------------------------------------
    let body: unknown;

    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            {
                error:
                    "Invalid request: body must be valid JSON.",
            },
            { status: 400 }
        );
    }

    if (
        typeof body !== "object" ||
        body === null
    ) {
        return NextResponse.json(
            {
                error:
                    "Invalid request: expected a JSON object.",
            },
            { status: 400 }
        );
    }

    const requestBody =
        body as Record<string, unknown>;

    const language = requestBody.language;
    const code = requestBody.code;

    /**
     * IMPORTANT:
     *
     * The frontend must send the same executionId that was
     * created in the executions table.
     */
    const executionId =
        typeof requestBody.executionId === "string"
            ? requestBody.executionId
            : undefined;

    // Accept both stdin and input.
    const input =
        requestBody.stdin !== undefined &&
        requestBody.stdin !== null
            ? requestBody.stdin
            : requestBody.input;

    // -------------------------------------------------------------
    // Validate language
    // -------------------------------------------------------------
    if (!isSupportedLanguage(language)) {
        return NextResponse.json(
            {
                error:
                    "Invalid or unsupported language. Supported languages: javascript, python, cpp, java.",
            },
            { status: 400 }
        );
    }

    // -------------------------------------------------------------
    // Validate code
    // -------------------------------------------------------------
    if (
        typeof code !== "string" ||
        code.trim().length === 0
    ) {
        return NextResponse.json(
            {
                error:
                    "Invalid request: code must be a non-empty string.",
            },
            { status: 400 }
        );
    }

    if (
        Buffer.byteLength(code, "utf8") >
        SANDBOX_LIMITS.maxCodeBytes
    ) {
        return NextResponse.json(
            {
                error: `Code too large. Maximum ${SANDBOX_LIMITS.maxCodeBytes} bytes allowed.`,
            },
            { status: 413 }
        );
    }

    // -------------------------------------------------------------
    // Validate input
    // -------------------------------------------------------------
    if (
        input !== undefined &&
        input !== null &&
        typeof input !== "string"
    ) {
        return NextResponse.json(
            {
                error:
                    "Invalid request: input must be a string.",
            },
            { status: 400 }
        );
    }

    const stdin =
        typeof input === "string"
            ? input
            : "";

    if (
        Buffer.byteLength(stdin, "utf8") >
        SANDBOX_LIMITS.maxInputBytes
    ) {
        return NextResponse.json(
            {
                error: `Input too large. Maximum ${SANDBOX_LIMITS.maxInputBytes} bytes allowed.`,
            },
            { status: 413 }
        );
    }

    // -------------------------------------------------------------
    // Save system log
    // -------------------------------------------------------------
    await saveExecutionLog(
        executionId,
        "system",
        `Starting ${language} execution`,
        0
    );

    // -------------------------------------------------------------
    // Execute code
    // -------------------------------------------------------------
    try {
        const result = await executeCode({
            language,
            code,
            input: stdin,
        });

        const isCompileError =
            result.status === "compilation_error";

        const stdout =
            result.output ?? "";

        const stderr =
            isCompileError
                ? ""
                : result.error ?? "";

        const compileOutput =
            isCompileError
                ? result.error ?? ""
                : "";

        // ---------------------------------------------------------
        // Save STDOUT
        // ---------------------------------------------------------
        if (stdout.trim()) {
            await saveExecutionLog(
                executionId,
                "stdout",
                stdout,
                1
            );
        }

        // ---------------------------------------------------------
        // Save STDERR
        // ---------------------------------------------------------
        if (stderr.trim()) {
            await saveExecutionLog(
                executionId,
                "stderr",
                stderr,
                2
            );
        }

        // ---------------------------------------------------------
        // Save compilation error
        // ---------------------------------------------------------
        if (compileOutput.trim()) {
            await saveExecutionLog(
                executionId,
                "stderr",
                compileOutput,
                2
            );
        }

        const message =
            result.status === "success"
                ? "Execution completed"
                : result.status === "compilation_error"
                    ? "Compilation failed"
                    : result.status === "timeout"
                        ? "Time limit exceeded"
                        : result.status === "runtime_error"
                            ? "Runtime error"
                            : "Execution failed";

        // ---------------------------------------------------------
        // Save completion system log
        // ---------------------------------------------------------
        await saveExecutionLog(
            executionId,
            "system",
            message,
            3
        );

        // ---------------------------------------------------------
        // AWARD XP FOR SUCCESSFUL EXECUTION
        // ---------------------------------------------------------
        let xpAwarded = 0;
        let totalXP = 0;

        if (executionId) {
            try {
                const token = await convexAuthNextjsToken().catch(() => undefined);
                let client = convex;
                if (token) {
                    const authedClient = new ConvexHttpClient(
                        process.env.NEXT_PUBLIC_CONVEX_URL!
                    );
                    authedClient.setAuth(token);
                    client = authedClient;
                }

                const xpResult = await client.mutation(
                    api.leaderboard.recordCodeExecution,
                    {
                        executionId,
                        status: result.status,
                        executionTime: result.executionTime,
                        exitCode: result.status === "success" ? 0 : 1,
                        errorMessage: result.error ?? undefined,
                    }
                );

                xpAwarded = xpResult.xpAwarded;
                totalXP = xpResult.totalXP;

                console.log(
                    `[code-execution] XP awarded: ${xpAwarded}, total XP: ${totalXP}`
                );
            } catch (xpError) {
                // XP award failure should NOT fail the execution request
                console.error(
                    `[code-execution] XP award failed:`,
                    xpError
                );
            }
        }

        // ---------------------------------------------------------
        // Return response
        // ---------------------------------------------------------
        return NextResponse.json(
            {
                success: result.success,

                status: result.status,

                stdout,

                stderr,

                compile_output: compileOutput,

                message,

                execution_time:
                    Math.round(
                        result.executionTime
                    ) / 1000,

                // Legacy fields
                output: stdout,

                error: result.error,

                executionTime:
                    result.executionTime,

                memoryUsageKb:
                    result.memoryUsageKb,

                // XP information
                xpAwarded,
                totalXP,
            },
            { status: 200 }
        );

    } catch (err) {

        // ---------------------------------------------------------
        // Timeout
        // ---------------------------------------------------------
        if (
            err instanceof
            ExecutionTimeoutError
        ) {
            const timeoutMessage =
                `Execution exceeded the ${SANDBOX_LIMITS.timeoutMs / 1000}s time limit and was terminated.`;

            await saveExecutionLog(
                executionId,
                "stderr",
                timeoutMessage,
                1
            );

            await saveExecutionLog(
                executionId,
                "system",
                "Time limit exceeded",
                2
            );

            return NextResponse.json({
                success: false,
                status: "timeout",
                stdout: "",
                stderr: "",
                compile_output: "",
                message:
                    "Time limit exceeded",
                error: timeoutMessage,
                output: "",
                executionTime:
                    SANDBOX_LIMITS.timeoutMs,
                memoryUsageKb: null,
            });
        }

        // ---------------------------------------------------------
        // Configuration error
        // ---------------------------------------------------------
        if (
            err instanceof
            ConfigurationError
        ) {
            console.error(
                "[code-execution] configuration error:",
                err.detail ??
                    err.message
            );

            await saveExecutionLog(
                executionId,
                "system",
                "Execution service misconfigured",
                1
            );

            return NextResponse.json(
                {
                    success: false,
                    status: "internal_error",
                    stdout: "",
                    stderr: "",
                    compile_output: "",
                    message:
                        "Execution service misconfigured",
                    error: err.message,
                    output: "",
                    executionTime: 0,
                    memoryUsageKb: null,
                },
                { status: 503 }
            );
        }

        // ---------------------------------------------------------
        // Validation error
        // ---------------------------------------------------------
        if (
            err instanceof
            ValidationError
        ) {
            await saveExecutionLog(
                executionId,
                "system",
                err.message,
                1
            );

            return NextResponse.json(
                {
                    error: err.message,
                },
                {
                    status:
                        err.statusCode,
                }
            );
        }

        // ---------------------------------------------------------
        // Backend unavailable
        // ---------------------------------------------------------
        if (
            err instanceof
            BackendUnavailableError
        ) {
            console.error(
                "[code-execution] backend unavailable:",
                err.message
            );

            await saveExecutionLog(
                executionId,
                "system",
                err.message,
                1
            );

            return NextResponse.json(
                {
                    error: err.message,
                },
                { status: 503 }
            );
        }

        // ---------------------------------------------------------
        // Unknown error
        // ---------------------------------------------------------
        console.error(
            "[code-execution] unexpected error:",
            err
        );

        await saveExecutionLog(
            executionId,
            "system",
            "Internal execution error",
            1
        );

        return NextResponse.json(
            {
                error:
                    "Internal execution error. Please try again later.",
            },
            { status: 500 }
        );
    }
}