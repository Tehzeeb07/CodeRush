/**
 * One interactive execution session — a live sandboxed program whose
 * stdio are bridged between the sandbox and the browser:
 *
 *   child.stdout / child.stderr  -> broadcast to SSE subscribers
 *   subscriber input (one line)  -> child.stdin
 *   exit / idle timeout / stop   -> "exit" event + workspace cleanup
 *
 * Guarantees:
 *   - the process tree is ALWAYS terminated (idle + total wall-clock
 *     timers, explicit stop) so infinite loops cannot linger;
 *   - the temp workspace is ALWAYS deleted after exit;
 *   - output buffered before a subscriber attaches (or after it
 *     detaches) is replayed, capped at maxBufferedBytes.
 *
 * Server-only module.
 */

import { randomUUID } from "node:crypto";

import type { ChildProcessWithoutNullStreams } from "node:child_process";

import { cleanupWorkspace, truncateOutput } from "../sandbox";
import { INTERACTIVE_LIMITS } from "./limits";
import { killProcessTree, stopDockerContainer } from "./spawn-interactive";

export type SessionExitReason =
    | "exit"
    | "timeout"
    | "idle_timeout"
    | "stopped";

export interface SessionExitInfo {
    exitCode: number | null;
    signal: string | null;
    reason: SessionExitReason;
}

interface SessionSubscriber {
    onStdout(chunk: string): void;
    onStderr(chunk: string): void;
    onExit(info: SessionExitInfo): void;
}

export class InteractiveSession {
    readonly id = randomUUID();

    constructor(
        readonly ip: string,
        readonly startedAt: number,
        private readonly child: ChildProcessWithoutNullStreams,
        private readonly workspace: string,
        /** Invoked exactly once when the session has fully ended. */
        private readonly onFinished: (session: InteractiveSession) => void,
        /** Docker container name (when sandboxed) so cleanup can stop it. */
        private readonly containerName?: string,
    ) {
        this.armTimers();
        this.wireChild();
    }

    // -------------------------------------------------------------
    // State
    // -------------------------------------------------------------

    private exited = false;
    private exitInfo: SessionExitInfo | null = null;
    private pendingKillReason: SessionExitReason | null = null;

    /** True once the underlying process has fully ended. */
    get hasExited(): boolean {
        return this.exited;
    }

    private stdoutBuffer = "";
    private stderrBuffer = "";
    private subscribers = new Set<SessionSubscriber>();

            private stdinBytesWritten = 0;
    private idleTimer: NodeJS.Timeout | null = null;
    private totalTimer: NodeJS.Timeout | null = null;
    private eofKillTimer: NodeJS.Timeout | null = null;

    // -------------------------------------------------------------
    // Subscriptions
    // -------------------------------------------------------------

    /**
     * Subscribe to live events. Buffered output produced before this
     * call is replayed immediately; if the session already exited the
     * exit event fires right away. Returns an unsubscribe function.
     */
    subscribe(subscriber: SessionSubscriber): () => void {
        this.subscribers.add(subscriber);

        if (this.stdoutBuffer) subscriber.onStdout(this.stdoutBuffer);
        if (this.stderrBuffer) subscriber.onStderr(this.stderrBuffer);
        if (this.exitInfo) subscriber.onExit(this.exitInfo);

        return () => {
            this.subscribers.delete(subscriber);
        };
    }

    // -------------------------------------------------------------
    // stdin
    // -------------------------------------------------------------

    /**
     * Write one user-supplied line to the running process' stdin.
     * Returns false when the session has exited or the payload would
     * exceed the configured limits.
     */
    writeLine(text: string): boolean {
        if (this.exited) return false;
        const bytes = Buffer.byteLength(text, "utf8");
        if (
            bytes > INTERACTIVE_LIMITS.maxLineBytes ||
            this.stdinBytesWritten + bytes >
                INTERACTIVE_LIMITS.maxTotalStdinBytes
        ) {
            return false;
        }
        this.stdinBytesWritten += bytes;
        try {
            // Callers may or may not include the trailing newline
            // (sendLine sends bare text; external API consumers often
            // send "Shakeel\n"). Normalize to exactly ONE newline so a
            // doubled "\n\n" never reaches the program — for line-based
            // readers like Node readline / Java Scanner / cin >>, a
            // phantom empty line silently consumes the NEXT prompt's
            // answer.
            const payload = text.replace(/\r?\n$/, "");
            this.child.stdin.write(`${payload}\n`);
        } catch {
            return false;
        }
        this.resetIdleTimer();
        return true;
    }

    get totalStdinBytes(): number {
        return this.stdinBytesWritten;
    }

    // -------------------------------------------------------------
    // Client liveness (heartbeat)
    // -------------------------------------------------------------

    private lastClientSeenAt = Date.now();

    /**
     * Called by the heartbeat endpoint: proves a live browser client is
     * still attached to this terminal. Resets the idle-reap timer so a
     * user reading the prompt / thinking about their answer is never
     * interrupted mid-thought. Abandoned sessions (no pings, no output)
     * are still reaped by maxIdleMs; genuine hangs by maxTotalRuntimeMs.
     */
    heartbeat(): void {
        if (this.exited) return;
        this.lastClientSeenAt = Date.now();
        this.resetIdleTimer();
    }

    /** Timestamp of the most recent proven-live client signal. */
    get lastClientActivityAt(): number {
        return this.lastClientSeenAt;
    }

    /**
     * Half-close the child's stdin (the browser equivalent of Ctrl+D).
     *
     * Long-lived stdin readers — Node's `readline`, Java's `Scanner`
     * loops, `for line in sys.stdin` — only finish when stdin reaches
     * EOF. Because this session deliberately KEEPS stdin open for the
     * whole conversation (so prompts can be answered one by one),
     * programs that are done reading input would otherwise linger
     * forever waiting for an EOF that never arrives, even though all
     * their work is complete. Ending stdin delivers that EOF: the
     * program finishes and exits normally, while stdout/stderr stay
     * connected so its final output still streams to the browser.
     */
                endStdin(): boolean {
        if (this.exited) return false;
        try {
            this.child.stdin.end();
        } catch {
            return false;
        }
        this.resetIdleTimer();
        // Safety net: a program that genuinely exits on EOF finishes in
        // milliseconds. If this timer ever fires, the runtime/shell
        // failed to propagate EOF — reap the session so the user's
        // Ctrl+D always ends the wait instead of hanging forever.
        if (!this.eofKillTimer) {
            this.eofKillTimer = setTimeout(() => {
                if (!this.exited) {
                    this.pendingKillReason = "stopped";
                    this.stop("stopped");
                }
            }, INTERACTIVE_LIMITS.eofGraceMs);
            this.eofKillTimer.unref?.();
        }
        return true;
    }

    // -------------------------------------------------------------
    // Termination
    // -------------------------------------------------------------

    /** User/infrastructure requested termination ("Stop" button). */
    stop(reason: SessionExitReason = "stopped"): void {
        if (this.exited) return;
        this.pendingKillReason = reason;
        if (this.containerName) {
            // Killing the `docker run` client does NOT stop the
            // container — remove it explicitly (also stops the child).
            this.child.stdin.end();
            void stopDockerContainer(this.containerName);
        } else {
            killProcessTree(this.child);
        }
    }

    private finish(code: number | null, signal: string | null): void {
        if (this.exited) return;
                    this.exited = true;

        if (this.idleTimer) clearTimeout(this.idleTimer);
        if (this.totalTimer) clearTimeout(this.totalTimer);
        if (this.eofKillTimer) clearTimeout(this.eofKillTimer);
        this.idleTimer = null;
        this.totalTimer = null;
        this.eofKillTimer = null;

        this.exitInfo = {
            exitCode: code,
            signal,
            reason: this.pendingKillReason ?? "exit",
        };

        void cleanupWorkspace(this.workspace);

        for (const subscriber of this.subscribers) {
            subscriber.onExit(this.exitInfo);
        }
        this.onFinished(this);
    }

    // -------------------------------------------------------------
    // Timers
    // -------------------------------------------------------------

    private armTimers(): void {
        this.resetIdleTimer();
        this.totalTimer = setTimeout(() => {
            this.pendingKillReason = "timeout";
            this.stop("timeout");
        }, INTERACTIVE_LIMITS.maxTotalRuntimeMs);
        this.totalTimer.unref?.();
    }

    private resetIdleTimer(): void {
        if (this.idleTimer) clearTimeout(this.idleTimer);
        this.idleTimer = setTimeout(() => {
            this.pendingKillReason = "idle_timeout";
            this.stop("idle_timeout");
        }, INTERACTIVE_LIMITS.maxIdleMs);
        this.idleTimer.unref?.();
    }

    // -------------------------------------------------------------
    // Process wiring
    // -------------------------------------------------------------

    private wireChild(): void {
        this.child.stdout.setEncoding("utf8");
        this.child.stderr.setEncoding("utf8");

        this.child.stdout.on("data", (chunk: string) => {
            this.appendStdout(chunk);
            this.resetIdleTimer();
        });
        this.child.stderr.on("data", (chunk: string) => {
            this.appendStderr(chunk);
            this.resetIdleTimer();
        });

        this.child.stdin.on("error", () => {
            /* Program may not read stdin; ignore EPIPE. */
        });

        this.child.on("error", () => {
            // Spawn-level failure (runtime missing, docker gone, ...).
            this.finish(null, null);
        });

        this.child.on("close", (code, signal) => {
            this.finish(code, signal ?? null);
        });
    }

    private appendStdout(chunk: string): void {
        // Windows console programs (via cmd.exe) emit CR / CRLF line
        // endings; normalize to LF so the browser terminal renders cleanly.
        const normalized = normalizeNewlines(chunk);
        this.stdoutBuffer = truncateOutput(this.stdoutBuffer + normalized);
        if (
            Buffer.byteLength(this.stdoutBuffer) >
            INTERACTIVE_LIMITS.maxBufferedBytes * 2
        ) {
            this.stdoutBuffer = this.stdoutBuffer.slice(
                -INTERACTIVE_LIMITS.maxBufferedBytes,
            );
        }
        for (const subscriber of this.subscribers)
            subscriber.onStdout(normalized);
    }

    private appendStderr(chunk: string): void {
        const normalized = normalizeNewlines(chunk);
        this.stderrBuffer = truncateOutput(this.stderrBuffer + normalized);
        if (
            Buffer.byteLength(this.stderrBuffer) >
            INTERACTIVE_LIMITS.maxBufferedBytes * 2
        ) {
            this.stderrBuffer = this.stderrBuffer.slice(
                -INTERACTIVE_LIMITS.maxBufferedBytes,
            );
        }
        for (const subscriber of this.subscribers)
            subscriber.onStderr(normalized);
    }
}

/** Normalize CRLF / lone CR line endings to LF for cross-platform display. */
function normalizeNewlines(text: string): string {
    return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}
