/**
 * POST /api/code/interactive/start
 *
 * Starts a LONG-LIVED sandboxed process for interactive execution
 * (real stdin/stdout, not single-shot). Returns:
 *
 *   { success, sessionId, backend, startedAt }
 *
 * The client then opens GET /api/code/interactive/stream?sessionId=...
 * for live output and POSTs each submitted line to
 * POST /api/code/interactive/input.
 *
 * Concurrency caps per IP and globally are enforced here (429).
 */

import { NextRequest, NextResponse } from "next/server";

import { isSupportedLanguage, getLanguage } from "@/lib/code-execution/languages";
import { SANDBOX_LIMITS } from "@/lib/code-execution/sandbox";
import { checkRateLimit } from "@/lib/code-execution/rate-limit";
import { ValidationError } from "@/lib/code-execution/types";
import { getSessionManager } from "@/lib/code-execution/interactive/manager";
import { isDockerAvailable } from "@/lib/code-execution/interactive/spawn-interactive";

export const runtime = "nodejs";
export const maxDuration = 60;

function getClientKey(request: NextRequest): string {
    return (
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        "local"
    );
}

export async function POST(request: NextRequest) {
    if (!checkRateLimit(getClientKey(request))) {
        return NextResponse.json(
            { error: "Too many requests. Please wait a moment and try again." },
            { status: 429 },
        );
    }

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

    if (!isSupportedLanguage(language)) {
        return NextResponse.json(
            { error: `Unsupported language: ${String(language)}` },
            { status: 400 },
        );
    }
    if (typeof code !== "string" || code.trim().length === 0) {
        return NextResponse.json(
            { error: "Code must be a non-empty string." },
            { status: 400 },
        );
    }
    if (Buffer.byteLength(code, "utf8") > SANDBOX_LIMITS.maxCodeBytes) {
        return NextResponse.json(
            { error: "Code exceeds the maximum allowed size." },
            { status: 413 },
        );
    }

    try {
        const manager = getSessionManager();
        const languageConfig = getLanguage(language);
        const session = await manager.create(
            getClientKey(request),
            languageConfig,
            code,
        );

        const backend = (await isDockerAvailable()) ? "docker" : "local";

        return NextResponse.json(
            {
                sessionId: session.id,
                backend,
                startedAt: session.startedAt,
                interactive: true,
            },
            { status: 201 },
        );
    } catch (err) {
        if (err instanceof ValidationError) {
            return NextResponse.json(
                { error: err.message },
                { status: err.statusCode },
            );
        }
        console.error("[code-interactive] start failed:", err);
        return NextResponse.json(
            { error: "Failed to start the program in the sandbox." },
            { status: 500 },
        );
    }
}