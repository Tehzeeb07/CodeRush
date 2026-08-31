/**
 * POST /api/judge — the single entry point for Run / Custom Input / Submit.
 *
 * Architecture (requirement §33):
 *   Browser → this route → sandboxed executor (`executeCode`) → parser →
 *   Convex persistence → response. The browser never executes code and
 *   never sees hidden test data.
 *
 * Identity is resolved server-side with the user's Next.js session token
 * (`convexAuthNextjsToken`) so submissions are attributed correctly and
 * cannot be forged by crafted requests.
 */

import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";

import { api } from "@/../convex/_generated/api";

import { SANDBOX_LIMITS } from "@/lib/code-execution/sandbox";
import { isSupportedLanguage } from "@/lib/code-execution/languages";
import { checkRateLimit } from "@/lib/code-execution/rate-limit";

import { judge } from "@/lib/judge/runner";
import type {
    JudgeMode,
    JudgeResponse,
} from "@/lib/judge/types";

export const runtime = "nodejs";
export const maxDuration = 60;

function getClientKey(request: NextRequest): string {
    return (
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        "local"
    );
}

function jsonError(message: string, status: number) {
    return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
    // -------------------------------------------------------------
    // Rate limiting
    // -------------------------------------------------------------
    if (!checkRateLimit(getClientKey(request))) {
        return jsonError(
            "Too many requests. Please wait a moment and try again.",
            429,
        );
    }

    // -------------------------------------------------------------
    // Body validation
    // -------------------------------------------------------------
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return jsonError("Invalid request: body must be valid JSON.", 400);
    }
    if (typeof body !== "object" || body === null) {
        return jsonError("Invalid request: expected a JSON object.", 400);
    }

    const { mode, problemSlug, language, code, customInput } =
        body as Record<string, unknown>;

    if (
        mode !== "run" &&
        mode !== "custom" &&
        mode !== "submit"
    ) {
        return jsonError("Invalid request: unknown mode.", 400);
    }
    if (typeof problemSlug !== "string" || problemSlug.length === 0) {
        return jsonError("Invalid request: missing problem.", 400);
    }
    if (!isSupportedLanguage(language)) {
        return jsonError(`Unsupported language: ${String(language)}.`, 400);
    }
    if (typeof code !== "string" || code.trim().length === 0) {
        return jsonError("Invalid request: code must be a non-empty string.", 400);
    }
    if (Buffer.byteLength(code, "utf8") > SANDBOX_LIMITS.maxCodeBytes) {
        return jsonError("Code exceeds the maximum allowed size.", 413);
    }
    if (
        customInput !== undefined &&
        customInput !== null &&
        typeof customInput !== "string"
    ) {
        return jsonError("Invalid request: customInput must be a string.", 400);
    }
    if (
        typeof customInput === "string" &&
        Buffer.byteLength(customInput, "utf8") > SANDBOX_LIMITS.maxInputBytes
    ) {
        return jsonError("Custom input exceeds the maximum allowed size.", 413);
    }

    // -------------------------------------------------------------
    // Server-side identity (required for submit)
    // -------------------------------------------------------------
    const token = await convexAuthNextjsToken().catch(() => undefined);
    let authedClient: ConvexHttpClient | null = null;
    if (token) {
        authedClient = new ConvexHttpClient(
            process.env.NEXT_PUBLIC_CONVEX_URL!,
        );
        try {
            authedClient.setAuth(token);
        } catch {
            authedClient = null;
        }
    }


    // -------------------------------------------------------------
    // Load problem test data (judge secret required)
    // -------------------------------------------------------------
    const judgeSecret = process.env.JUDGE_SECRET?.trim();
    if (!judgeSecret) {
        return jsonError(
            "Judge is not configured. Set JUDGE_SECRET in the Next.js environment and in the Convex deployment (`npx convex env set JUDGE_SECRET ...`).",
            503,
        );
    }

    let problemData: {
        timeLimitMs: number;
        memoryLimitMb: number;
        title: string;
        tests: Array<{
            id: string;
            input: string;
            expectedOutput: string;
            hidden: boolean;
        }>;
    } | null = null;

    try {
        problemData = await new ConvexHttpClient(
            process.env.NEXT_PUBLIC_CONVEX_URL!,
        ).query(api.problems.getJudgeData, {
            slug: problemSlug as string,
            secret: judgeSecret,
        });
    } catch (err) {
        console.error("[judge] failed to load problem data:", err);
        return jsonError(
            "Could not load the problem for judging. Verify JUDGE_SECRET matches `npx convex env get JUDGE_SECRET`.",
            503,
        );
    }

    if (!problemData) {
        return jsonError("Problem not found.", 404);
    }

    // Server-side trace for the problem runner (visible in the Next.js
    // terminal only — hidden test data never reaches the browser).
    console.log(
        `[problem-runner] problem: ${problemSlug} | mode: ${mode} | ` +
            `language: ${language} | tests: ${problemData.tests.length}`,
    );

    // -------------------------------------------------------------
    // Create the submission record before evaluating (submit mode)
    // -------------------------------------------------------------
    let submissionId: string | null = null;
    let createdAt: number | null = null;

    if (mode === "submit" && authedClient) {
        try {
            submissionId = await authedClient.mutation(
                api.judgeSubmissions.createSubmission,
                {
                    problemSlug: problemSlug as string,
                    language: language as string,
                    code: code as string,
                },
            );
            createdAt = Date.now();
        } catch (err) {
            console.error("[judge] submission creation failed:", err);
            return jsonError(
                err instanceof Error && /not authenticated/i.test(err.message)
                    ? "You must be signed in to submit a solution."
                    : "Could not record the submission. Please try again.",
                401,
            );
        }
    }

    // -------------------------------------------------------------
    // Judge!
    // -------------------------------------------------------------
    try {
        const result = await judge({
            mode: mode as JudgeMode,
            language: language as never,
            code: code as string,
            customInput:
                typeof customInput === "string" ? customInput : null,
            tests: problemData.tests,
            timeLimitMs: problemData.timeLimitMs,
            memoryLimitMb: problemData.memoryLimitMb,
        });

        // Persist verdicts for submissions.
        if (mode === "submit" && authedClient && submissionId) {
            try {
                await authedClient.mutation(
                    api.judgeSubmissions.completeSubmission,
                    {
                        submissionId: submissionId as never,
                        outcome: result.outcome,
                        passedCount: result.passedCount,
                        totalCount: result.totalCount,
                        runtimeMs: result.totalRuntimeMs,
                        ...(result.maxMemoryKb !== null
                            ? { memoryKb: result.maxMemoryKb }
                            : {}),
                    },
                );
            } catch (err) {
                console.error("[judge] completing submission failed:", err);
            }
        }

        const response: JudgeResponse = {
            ...result,
            problemSlug: problemSlug as string,
            submissionId,
            createdAt,
        };
        return NextResponse.json(response, { status: 200 });
    } catch (err) {
        console.error("[judge] execution failed:", err);
        return jsonError(
            "The execution service could not run your code right now. Please verify the sandbox service is running and try again.",
            503,
        );
    }
}
