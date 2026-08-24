/**
 * POST /api/code/interactive/input
 *
 * Writes one user-supplied line to the stdin of a live interactive
 * session. The browser sends this for every submitted line while the
 * program is waiting for input.
 *
 * Returns 202 on success, 404 when the session no longer exists,
 * 400 when the payload is invalid or exceeds the per-line/total cap.
 */

import { NextRequest, NextResponse } from "next/server";

import { getSessionManager } from "@/lib/code-execution/interactive/manager";
import { INTERACTIVE_LIMITS } from "@/lib/code-execution/interactive/limits";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
    let body: unknown = null;
    try {
        body = await request.json();
    } catch {
        /* body is optional when sessionId rides in the query string */
    }

    const record =
        typeof body === "object" && body !== null
            ? (body as Record<string, unknown>)
            : {};

    // sessionId may arrive in the query string (existing clients) or in
    // the JSON body ({ "sessionId": "...", "input": "..." } shape).
    const urlSessionId =
        new URL(request.url).searchParams.get("sessionId") ?? "";
    const sessionId =
        urlSessionId ||
        (typeof record.sessionId === "string" ? record.sessionId : "");

    if (!sessionId) {
        return NextResponse.json(
            { error: "Missing sessionId." },
            { status: 400 },
        );
    }

    const session = getSessionManager().get(sessionId);
    if (!session) {
        return NextResponse.json(
            { error: "This program is no longer running." },
            { status: 404 },
        );
    }

    // `line` is the native field; `input` is accepted as an alias so
    // both client generations and external API consumers work.
    const line =
        typeof record.line === "string"
            ? record.line
            : typeof record.input === "string"
              ? record.input
              : "";

    const bytes = Buffer.byteLength(line, "utf8");
    if (
        bytes > INTERACTIVE_LIMITS.maxLineBytes ||
        session.totalStdinBytes + bytes >
            INTERACTIVE_LIMITS.maxTotalStdinBytes
    ) {
        return NextResponse.json(
            { error: "Input exceeds the maximum allowed size." },
            { status: 400 },
        );
    }

    if (!session.writeLine(line)) {
        // The session exited between lookup and write (or its stdin
        // pipe broke) — tell the client clearly instead of faking ok.
        return NextResponse.json(
            { ok: false, error: "This program is no longer running." },
            { status: 409 },
        );
    }

    return NextResponse.json({ ok: true });
}