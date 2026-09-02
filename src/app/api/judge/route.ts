
/**
 * POST /api/judge
 *
 * Single entry point for:
 *   - Run sample tests
 *   - Run custom input
 *   - Submit solution
 *
 * Browser -> /api/judge -> judge runner -> sandbox
 *
 * Hidden test data NEVER gets sent to the browser.
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

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function getClientKey(request: NextRequest): string {
    return (
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        "local"
    );
}

function jsonError(
    message: string,
    status: number,
    extra?: Record<string, unknown>,
) {
    return NextResponse.json(
        {
            ok: false,
            error: message,
            ...extra,
        },
        { status },
    );
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

/**
 * Normalize frontend mode values.
 *
 * Supported:
 *   run
 *   custom
 *   submit
 *
 * Also accepts a few common frontend aliases.
 */
function normalizeMode(value: unknown): JudgeMode | null {
    if (typeof value !== "string") {
        return null;
    }

    const mode = value.trim().toLowerCase();

    if (mode === "run") {
        return "run";
    }

    if (
        mode === "custom" ||
        mode === "custom_input" ||
        mode === "custom-input"
    ) {
        return "custom";
    }

    if (
        mode === "submit" ||
        mode === "submission"
    ) {
        return "submit";
    }

    if (mode === "test") {
        return "test";
    }

    return null;
}

/**
 * Normalize language names coming from the editor.
 */
function normalizeLanguage(value: unknown): string | null {
    if (typeof value !== "string") {
        return null;
    }

    const language = value.trim().toLowerCase();

    const aliases: Record<string, string> = {
        cpp: "cpp",
        "c++": "cpp",
        "c-plus-plus": "cpp",

        c: "c",

        javascript: "javascript",
        js: "javascript",

        typescript: "typescript",
        ts: "typescript",

        python: "python",
        python3: "python",

        java: "java",

        go: "go",

        rust: "rust",

        csharp: "csharp",
        "c#": "csharp",

        php: "php",

        ruby: "ruby",

        kotlin: "kotlin",

        swift: "swift",
    };

    return aliases[language] ?? language;
}

/**
 * Extract the problem slug.
 *
 * This accepts:
 *   problemSlug
 *   slug
 *
 * so the frontend does not have to be changed immediately.
 */
function getProblemSlug(body: Record<string, unknown>): string | null {
    const value = body.problemSlug ?? body.slug;

    if (typeof value !== "string") {
        return null;
    }

    const slug = value.trim();

    return slug.length > 0 ? slug : null;
}

/* -------------------------------------------------------------------------- */
/* POST                                                                       */
/* -------------------------------------------------------------------------- */

export async function POST(request: NextRequest) {
    console.log("[judge] POST /api/judge");

    /* ---------------------------------------------------------------------- */
    /* Rate limiting                                                          */
    /* ---------------------------------------------------------------------- */

    const clientKey = getClientKey(request);

    if (!checkRateLimit(clientKey)) {
        return jsonError(
            "Too many requests. Please wait a moment and try again.",
            429,
        );
    }

    /* ---------------------------------------------------------------------- */
    /* Parse request body                                                     */
    /* ---------------------------------------------------------------------- */

    let body: unknown;

    try {
        body = await request.json();
    } catch (error) {
        console.error("[judge] invalid JSON:", error);

        return jsonError(
            "Invalid request body. Expected valid JSON.",
            400,
        );
    }

    if (!isObject(body)) {
        return jsonError(
            "Invalid request body. Expected a JSON object.",
            400,
        );
    }

    console.log("[judge] request keys:", Object.keys(body));

    /* ---------------------------------------------------------------------- */
    /* Read request values                                                    */
    /* ---------------------------------------------------------------------- */

    const mode = normalizeMode(body.mode);

    const problemSlug = getProblemSlug(body);

    const language = normalizeLanguage(
        body.language ??
        body.lang,
    );

    const code =
        typeof body.code === "string"
            ? body.code
            : typeof body.sourceCode === "string"
                ? body.sourceCode
                : null;

    const customInput =
        typeof body.customInput === "string"
            ? body.customInput
            : typeof body.input === "string"
                ? body.input
                : body.customInput === null || body.input === null
                    ? null
                    : null;

    /* ---------------------------------------------------------------------- */
    /* Debug information                                                      */
    /* ---------------------------------------------------------------------- */

    console.log("[judge] mode:", body.mode);
    console.log("[judge] normalized mode:", mode);
    console.log("[judge] problemSlug:", problemSlug);
    console.log("[judge] language:", language);
    console.log(
        "[judge] code length:",
        typeof code === "string" ? code.length : 0,
    );
    console.log(
        "[judge] custom input length:",
        typeof customInput === "string"
            ? customInput.length
            : 0,
    );

    /* ---------------------------------------------------------------------- */
    /* Validate mode                                                          */
    /* ---------------------------------------------------------------------- */

    if (!mode) {
        return jsonError(
            `Invalid request: unknown mode "${String(
                body.mode,
            )}". Expected "run", "custom", or "submit".`,
            400,
            {
                received: body.mode ?? null,
                expected: ["run", "custom", "submit"],
            },
        );
    }

    /* ---------------------------------------------------------------------- */
    /* Validate problem                                                       */
    /* ---------------------------------------------------------------------- */

    if (!problemSlug) {
        return jsonError(
            "Invalid request: missing problemSlug.",
            400,
            {
                expectedField: "problemSlug",
            },
        );
    }

    /* ---------------------------------------------------------------------- */
    /* Validate language                                                      */
    /* ---------------------------------------------------------------------- */

    if (!language) {
        return jsonError(
            "Invalid request: missing language.",
            400,
            {
                expectedField: "language",
            },
        );
    }

    if (!isSupportedLanguage(language)) {
        return jsonError(
            `Unsupported language: ${language}.`,
            400,
            {
                language,
            },
        );
    }

    /* ---------------------------------------------------------------------- */
    /* Validate code                                                          */
    /* ---------------------------------------------------------------------- */

    if (!code || code.trim().length === 0) {
        return jsonError(
            "Invalid request: code must be a non-empty string.",
            400,
        );
    }

    if (
        Buffer.byteLength(code, "utf8") >
        SANDBOX_LIMITS.maxCodeBytes
    ) {
        return jsonError(
            "Code exceeds the maximum allowed size.",
            413,
        );
    }

    /* ---------------------------------------------------------------------- */
    /* Validate custom input                                                  */
    /* ---------------------------------------------------------------------- */

    if (
        customInput !== null &&
        typeof customInput !== "string"
    ) {
        return jsonError(
            "Invalid request: customInput must be a string or null.",
            400,
        );
    }

    if (
        typeof customInput === "string" &&
        Buffer.byteLength(customInput, "utf8") >
        SANDBOX_LIMITS.maxInputBytes
    ) {
        return jsonError(
            "Custom input exceeds the maximum allowed size.",
            413,
        );
    }

    /* ---------------------------------------------------------------------- */
    /* Server-side authentication                                             */
    /* ---------------------------------------------------------------------- */

    const token = await convexAuthNextjsToken().catch(() => undefined);

    let authedClient: ConvexHttpClient | null = null;

    if (token) {
        const convexUrl =
            process.env.NEXT_PUBLIC_CONVEX_URL;

        if (convexUrl) {
            authedClient = new ConvexHttpClient(
                convexUrl,
            );

            try {
                authedClient.setAuth(token);
            } catch (error) {
                console.error(
                    "[judge] failed to set Convex auth:",
                    error,
                );

                authedClient = null;
            }
        }
    }

    /* ---------------------------------------------------------------------- */
    /* Judge secret                                                           */
    /* ---------------------------------------------------------------------- */

    const judgeSecret =
        process.env.JUDGE_SECRET?.trim();

    if (!judgeSecret) {
        console.error(
            "[judge] JUDGE_SECRET is missing",
        );

        return jsonError(
            "Judge is not configured. Set JUDGE_SECRET in .env.local and in Convex.",
            503,
        );
    }

    /* ---------------------------------------------------------------------- */
    /* Convex URL                                                             */
    /* ---------------------------------------------------------------------- */

    const convexUrl =
        process.env.NEXT_PUBLIC_CONVEX_URL?.trim();

    if (!convexUrl) {
        console.error(
            "[judge] NEXT_PUBLIC_CONVEX_URL is missing",
        );

        return jsonError(
            "NEXT_PUBLIC_CONVEX_URL is not configured.",
            503,
        );
    }

    /* ---------------------------------------------------------------------- */
    /* Load problem data                                                      */
    /* ---------------------------------------------------------------------- */

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
        const convexClient =
            new ConvexHttpClient(convexUrl);

        problemData =
            await convexClient.query(
                api.problems.getJudgeData,
                {
                    slug: problemSlug,
                    secret: judgeSecret,
                },
            );
    } catch (error) {
        console.error(
            "[judge] failed to load problem:",
            error,
        );

        return jsonError(
            "Could not load the problem for judging. Verify the problem slug and JUDGE_SECRET.",
            503,
        );
    }

    if (!problemData) {
        return jsonError(
            `Problem not found: ${problemSlug}`,
            404,
        );
    }

    if (
        !Array.isArray(problemData.tests) ||
        problemData.tests.length === 0
    ) {
        return jsonError(
            "This problem has no test cases configured.",
            503,
        );
    }

    console.log(
        `[judge] problem=${problemSlug} mode=${mode} language=${language} tests=${problemData.tests.length}`,
    );

    /* ---------------------------------------------------------------------- */
    /* Create submission before judging                                       */
    /* ---------------------------------------------------------------------- */

    let submissionId: string | null = null;

    let createdAt: number | null = null;

    if (mode === "submit") {
        if (!authedClient) {
            return jsonError(
                "You must be signed in to submit a solution.",
                401,
            );
        }

        try {
            submissionId =
                await authedClient.mutation(
                    api.judgeSubmissions
                        .createSubmission,
                    {
                        problemSlug,
                        language,
                        code,
                    },
                );

            createdAt = Date.now();

            console.log(
                "[judge] submission created:",
                submissionId,
            );
        } catch (error) {
            console.error(
                "[judge] submission creation failed:",
                error,
            );

            const message =
                error instanceof Error
                    ? error.message
                    : "";

            if (
                /not authenticated/i.test(
                    message,
                )
            ) {
                return jsonError(
                    "You must be signed in to submit a solution.",
                    401,
                );
            }

            return jsonError(
                "Could not record the submission. Please try again.",
                500,
            );
        }
    }

    /* ---------------------------------------------------------------------- */
    /* Execute judge                                                          */
    /* ---------------------------------------------------------------------- */

    try {
        const result = await judge({
            mode,
            language: language as never,
            code,
            customInput,
            tests: problemData.tests,
            timeLimitMs:
                problemData.timeLimitMs,
            memoryLimitMb:
                problemData.memoryLimitMb,
        });

        console.log(
            "[judge] result:",
            {
                outcome: result.outcome,
                passedCount: result.passedCount,
                totalCount: result.totalCount,
                runtime: result.totalRuntimeMs,
            },
        );

        /* ------------------------------------------------------------------ */
        /* Save submission result                                             */
        /* ------------------------------------------------------------------ */

        let xpAwarded: number | null = null;

        if (
            mode === "submit" &&
            authedClient &&
            submissionId
        ) {
            try {
                await authedClient.mutation(
                    api.judgeSubmissions
                        .completeSubmission,
                    {
                        submissionId:
                            submissionId as never,

                        outcome:
                            result.outcome,

                        passedCount:
                            result.passedCount,

                        totalCount:
                            result.totalCount,

                        runtimeMs:
                            result.totalRuntimeMs,

                        ...(result.maxMemoryKb !==
                            null
                            ? {
                                memoryKb:
                                    result.maxMemoryKb,
                            }
                            : {}),

                        passedTestCaseIds:
                            result.passedTestCaseIds,
                    },
                );

                console.log(
                    "[judge] submission completed:",
                    submissionId,
                );
            } catch (error) {
                console.error(
                    "[judge] failed to complete submission:",
                    error,
                );
            }

            /* -------------------------------------------------------------- */
            /* Award XP                                                       */
            /* -------------------------------------------------------------- */

            try {
                const award =
                    await authedClient.mutation(
                        api.xp.awardSubmissionXp,
                        {
                            submissionId:
                                submissionId as never,

                            passedTestCaseIds:
                                result.passedTestCaseIds,
                        },
                    );

                xpAwarded =
                    award.xpAwarded;

                console.log(
                    "[judge] XP awarded:",
                    xpAwarded,
                );
            } catch (error) {
                console.error(
                    "[judge] XP award failed:",
                    error,
                );
            }
        }

        /* ------------------------------------------------------------------ */
        /* Build SAFE browser response                                        */
        /* ------------------------------------------------------------------ */

        const response: JudgeResponse = {
            ok: result.ok,

            outcome:
                result.outcome,

            mode:
                result.mode,

            problemSlug,

            language:
                result.language,

            error:
                result.error,

            testResults:
                result.testResults,

            passedCount:
                result.passedCount,

            totalCount:
                result.totalCount,

            totalRuntimeMs:
                result.totalRuntimeMs,

            maxMemoryKb:
                result.maxMemoryKb,

            custom:
                result.custom,

            submissionId,

            createdAt,

            xpAwarded,
        };

        return NextResponse.json(
            response,
            { status: 200 },
        );
    } catch (error) {
        console.error(
            "[judge] execution failed:",
            error,
        );

        return jsonError(
            "The execution service could not run your code right now. Please verify the sandbox service is running.",
            503,
        );
    }
}
