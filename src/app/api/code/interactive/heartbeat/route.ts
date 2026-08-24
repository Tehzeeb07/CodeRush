/**
 * POST /api/code/interactive/heartbeat?sessionId=...
 *
 * Sent periodically (~every 20s) by the browser for as long as its
 * terminal is open on a session. It proves a LIVE USER is attached,
 * resetting the session's idle-reap timer — so a program blocked on
 * `cin >> x` / `input()` / readline() is never killed as "hung" merely
 * because it produces no stdout while waiting for input.
 *
 * Unknown or already-finished sessions answer 200 with a no-op: a
 * heartbeat racing a natural program exit must never surface as an
 * error in the browser console.
 */

import { NextRequest, NextResponse } from "next/server";

import { getSessionManager } from "@/lib/code-execution/interactive/manager";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    const sessionId =
        new URL(request.url).searchParams.get("sessionId") ?? "";

    if (sessionId) {
        const session = getSessionManager().get(sessionId);
        // Feature-detected for the same dev-HMR reason as /eof.
        if (
            session &&
            typeof session.heartbeat === "function"
        ) {
            session.heartbeat();
        }
    }

    return NextResponse.json({ ok: true });
}