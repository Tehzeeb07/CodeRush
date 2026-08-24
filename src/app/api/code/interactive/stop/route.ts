/**
 * POST /api/code/interactive/stop
 *
 * Terminates a running interactive session ("Stop" button, and used by
 * the client when it disconnects so processes cannot leak). Idempotent:
 * unknown or already-finished sessions return 200 with a no-op.
 */

import { NextRequest, NextResponse } from "next/server";

import { getSessionManager } from "@/lib/code-execution/interactive/manager";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId") ?? "";

    if (sessionId) {
        getSessionManager().stop(sessionId);
    }

    return NextResponse.json({ ok: true });
}