/**
 * POST /api/code/execute
 *
 * Receives { language, code, stdin } ("input" is accepted as an alias)
 * from the editor, validates it, runs the code inside an isolated
 * execution backend (never in this process), and returns a consistent,
 * structured result on HTTP 200:
 *
 *   {
 *     "success": true|false,
 *     "status": "success" | "runtime_error" | "compilation_error"
 *               | "timeout" | "internal_error",
 *     "stdout": "...",            // program standard output
 *     "stderr": "...",            // runtime/syntax error output
 *     "compile_output": "...",    // compiler diagnostics (C++/Java)
 *     "output": "...",            // legacy alias of stdout (UI compat)
 *     "error": null | "...",      // legacy combined error (UI compat)
 *     "message": "...",           // short human summary
 *     "execution_time": 0.12,     // seconds
 *     "executionTime": 120,       // legacy ms (UI compat)
 *     "memoryUsageKb": null
 *   }
 *
 * Non-200 statuses are reserved for request/infrastructure problems:
 *   400 -> invalid JSON / unsupported language / empty code
 *   413 -> code or input exceeds size limits
 *   429 -> too many requests
 *   503 -> execution service unavailable / misconfigured (401, 403,
 *          unreachable, missing runtime). Raw service errors are logged
 *          server-side only; the client gets a friendly message.
 *   500 -> internal execution failure (details are never leaked)
 */

import { NextRequest, NextResponse } from "next/server";

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

function getClientKey(request: NextRequest): string {
    return (
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        "local"
    );
}

export async function POST(request: NextRequest) {
    // --- Rate limiting -------------------------------------------------
    if (!checkRateLimit(getClientKey(request))) {
        return NextResponse.json(
            { error: "Too many requests. Please wait a moment and try again." },
            { status: 429 },
        );
    }

    // --- Parse body ----------------------------------------------------
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: "Invalid request: body must be valid JSON." },
            { status: 400 },
        );
    }

    if (typeof body !== "object" || body === null) {
        return NextResponse.json(
            { error: "Invalid request: expected a JSON object." },
            { status: 400 },
        );
    }

    const { language, code } = body as Record<string, unknown>;
    // Accept both "stdin" (spec) and "input" (legacy editor field).
    const rawInput = (body as Record<string, unknown>);
    const input =
        rawInput.stdin !== undefined && rawInput.stdin !== null
            ? rawInput.stdin
            : rawInput.input;

    // --- Validate language ----------------------------------------------
    if (!isSupportedLanguage(language)) {
        return NextResponse.json(
            {
                error:
                    "Invalid or unsupported language. Supported languages: javascript, python, cpp, java.",
            },
            { status: 400 },
        );
    }

    // --- Validate code ---------------------------------------------------
    if (typeof code !== "string" || code.trim().length === 0) {
        return NextResponse.json(
            { error: "Invalid request: code must be a non-empty string." },
            { status: 400 },
        );
    }
    if (Buffer.byteLength(code, "utf8") > SANDBOX_LIMITS.maxCodeBytes) {
        return NextResponse.json(
            {
                error: `Code too large. Maximum ${SANDBOX_LIMITS.maxCodeBytes} bytes allowed.`,
            },
            { status: 413 },
        );
    }

    // --- Validate input --------------------------------------------------
    if (input !== undefined && input !== null && typeof input !== "string") {
        return NextResponse.json(
            { error: "Invalid request: input must be a string." },
            { status: 400 },
        );
    }
    const stdin = typeof input === "string" ? input : "";
    if (Buffer.byteLength(stdin, "utf8") > SANDBOX_LIMITS.maxInputBytes) {
        return NextResponse.json(
            {
                error: `Input too large. Maximum ${SANDBOX_LIMITS.maxInputBytes} bytes allowed.`,
            },
            { status: 413 },
        );
    }

    // --- Execute in an isolated backend ---------------------------------
    try {
        const result = await executeCode({ language, code, input: stdin });

        // Map the internal result to the consistent public response
        // format. Compilation diagnostics go to `compile_output`,
        // runtime/syntax errors to `stderr`; legacy fields (`output`,
        // `error`, `executionTime`) are kept for UI compatibility.
        const isCompileError = result.status === "compilation_error";
        const stderr = isCompileError ? "" : result.error ?? "";
        const compileOutput = isCompileError ? result.error ?? "" : "";
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

        return NextResponse.json(
            {
                success: result.success,
                status: result.status,
                stdout: result.output,
                stderr,
                compile_output: compileOutput,
                message,
                execution_time:
                    Math.round(result.executionTime) / 1000,
                // Legacy fields consumed by the existing output panel.
                output: result.output,
                error: result.error,
                executionTime: result.executionTime,
                memoryUsageKb: result.memoryUsageKb,
            },
            { status: 200 },
        );
    } catch (err) {
        // Timeouts are a normal, expected outcome of running user code
        // (e.g. infinite loops) — report them as a structured result so
        // the output panel can show the "Time Limit Exceeded" state.
        if (err instanceof ExecutionTimeoutError) {
            return NextResponse.json({
                success: false,
                status: "timeout",
                stdout: "",
                stderr: "",
                compile_output: "",
                message: "Time limit exceeded",
                error: `Execution exceeded the ${SANDBOX_LIMITS.timeoutMs / 1000}s time limit and was terminated.`,
                output: "",
                executionTime: SANDBOX_LIMITS.timeoutMs,
                memoryUsageKb: null,
            });
        }

        if (err instanceof ConfigurationError) {
            // Log the real reason server-side; show only the friendly
            // configuration message to the user.
            console.error(
                "[code-execution] configuration error:",
                err.detail ?? err.message,
            );
            return NextResponse.json(
                {
                    success: false,
                    status: "internal_error",
                    stdout: "",
                    stderr: "",
                    compile_output: "",
                    message: "Execution service misconfigured",
                    error: err.message,
                    output: "",
                    executionTime: 0,
                    memoryUsageKb: null,
                },
                { status: 503 },
            );
        }

        if (err instanceof ValidationError) {
            return NextResponse.json(
                { error: err.message },
                { status: err.statusCode },
            );
        }

        if (err instanceof BackendUnavailableError) {
            console.error(
                "[code-execution] backend unavailable:",
                err.message,
            );
            return NextResponse.json(
                { error: err.message },
                { status: 503 },
            );
        }

        // Log server-side only; never leak internals to the client.
        console.error("[code-execution] unexpected error:", err);
        return NextResponse.json(
            { error: "Internal execution error. Please try again later." },
            { status: 500 },
        );
    }
}