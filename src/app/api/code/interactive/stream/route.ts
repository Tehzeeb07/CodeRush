/**
 * GET /api/code/interactive/stream?sessionId=...
 *
 * Server-Sent Events stream for one interactive session:
 *
 *   event: stdout   data: <chunk>     (program standard output)
 *   event: stderr   data: <chunk>     (program error output)
 *   event: exit     data: {exitCode, signal, reason}
 *   : heartbeat (comment ping every 15s keeps proxies happy)
 *
 * Output produced before the stream opened is replayed first, so a
 * slow client never loses the prompt it must respond to.
 */

import { NextRequest } from "next/server";

import { getSessionManager } from "@/lib/code-execution/interactive/manager";
import type { SessionExitInfo } from "@/lib/code-execution/interactive/session";

export const runtime = "nodejs";
export const maxDuration = 60;

const PING_INTERVAL_MS = 15_000;

function sse(event: string, data: string): string {
    // Each data line must be prefixed with "data: " (SSE spec).
    const payload = data.split("\n").map((line) => `data: ${line}`).join("\n");
    return `event: ${event}\n${payload}\n\n`;
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId") ?? "";
    const session = getSessionManager().get(sessionId);

    if (!session) {
        return new Response("event: exit\ndata: {\"exitCode\":null,\"signal\":null,\"reason\":\"stopped\"}\n\n", {
            status: 200,
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache, no-transform",
                Connection: "keep-alive",
                "X-Accel-Buffering": "no",
            },
        });
    }

    const abortPromise = new Promise<{ aborted: true }>((resolve) => {
        const cleanup = () => {
            request.signal.removeEventListener("abort", onAbort);
        };
        const onAbort = () => {
            cleanup();
            resolve({ aborted: true });
        };
        request.signal.addEventListener("abort", onAbort, { once: true });
    });

    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            const encoder = new TextEncoder();
            const send = (event: string, data: string) => {
                try {
                    controller.enqueue(encoder.encode(sse(event, data)));
                } catch {
                    /* client gone */
                }
            };

            const unsubscribe = session.subscribe({
                onStdout: (chunk) => send("stdout", chunk),
                onStderr: (chunk) => send("stderr", chunk),
                onExit: (info: SessionExitInfo) => {
                    send("exit", JSON.stringify(info));
                },
            });

            const ping = setInterval(() => {
                try {
                    controller.enqueue(encoder.encode(": ping\n\n"));
                } catch {
                    /* client gone */
                }
            }, PING_INTERVAL_MS);
            ping.unref?.();

            void abortPromise.then(() => {
                clearInterval(ping);
                unsubscribe();
                try {
                    controller.close();
                } catch {
                    /* already closed */
                }
                // Do not kill the program on disconnect — the client
                // calls /stop explicitly when it wants to terminate.
            });
        },
        cancel() {
            // Client vanished (refresh, tab close). We do NOT kill the
            // session here: the next-polling client may reconnect.
        },
    });

    return new Response(stream, {
        status: 200,
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
}