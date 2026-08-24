/**
 * POST /api/code/interactive/eof?sessionId=...
 *
 * Half-closes the running program's stdin — the browser equivalent of
 * pressing Ctrl+D in a real terminal. Programs that read stdin until
 * EOF (Node readline, Scanner.hasNextLine, `for line in sys.stdin`)
 * need this to finish normally, because the interactive session keeps
 * stdin open for the whole conversation. Output streaming continues,
 * so the program's final lines still reach the browser before exit.
 *
 * Idempotent: unknown/exited sessions answer 200 no-op.
 */

import { NextRequest, NextResponse } from "next/server";

import { getSessionManager } from "@/lib/code-execution/interactive/manager";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    const sessionId =
        new URL(request.url).searchParams.get("sessionId") ?? "";

    let delivered = false;
    if (sessionId) {
        const session = getSessionManager().get(sessionId);
        // Feature-detected call: during development, hot module
        // replacement can leave sessions in the global registry that
        // were built by an older module graph without this method.
        // A missing method must degrade to a no-op, never a 500.
        if (
            session &&
            typeof session.endStdin === "function"
        ) {
            delivered = session.endStdin();
        }
    }

    return NextResponse.json({ ok: true, delivered });
}