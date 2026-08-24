/**
 * Hard limits for INTERACTIVE execution sessions.
 *
 * Interactive sessions live much longer than single-shot runs (the
 * program pauses whenever it waits for user input), so they get their
 * own budget instead of reusing SANDBOX_LIMITS.timeoutMs.
 *
 * Server-only module.
 */

export const INTERACTIVE_LIMITS = {
    /**
     * Max wall-clock lifetime of one session (all inputs combined).
     * This is the REAL hang protection: a genuinely stuck program
     * (e.g. an infinite loop producing nothing) is killed here no
     * matter how quiet it has been. It MUST stay comfortably longer
     * than maxIdleMs, because an interactive program legitimately
     * spends most of its life paused waiting for slow human input.
     */
    maxTotalRuntimeMs: 10 * 60_000,
    /**
     * Max time without ANY activity before an ABANDONED session is
     * reaped. A program sitting at its own prompt ("Enter your name:")
     * is NOT idle/hung — it is legitimately waiting for user input —
     * so this window is measured in MINUTES, never seconds. It resets
     * on every stdout/stderr chunk, every stdin write, and every
     * client heartbeat (the browser pings /interactive/heartbeat every
     * 20s while the terminal is open). Only a session whose client has
     * truly walked away can reach this limit; genuine hangs are caught
     * by maxTotalRuntimeMs instead.
     */
    maxIdleMs: 3 * 60_000,
    /** Max bytes accepted for a single submitted input line. */
    maxLineBytes: 4_000,
    /** Max cumulative stdin bytes per session. */
    maxTotalStdinBytes: 64_000,
    /** Max buffered stdout/stderr bytes kept for late SSE subscribers. */
    maxBufferedBytes: 64_000,
    /**
     * How long a FINISHED session stays in the registry (and stays
     * retrievable by id) so that an SSE stream which opens just after
     * the program exits can still replay the captured output and the
     * exit event. Without this grace period, quick programs finish and
     * get removed before the client's stream request arrives, which the
     * stream route misreports as a spurious "Program stopped.".
     */
                    retainedMs: 60_000,
    /**
     * How long after Ctrl+D (endStdin) we wait for a program that
     * honors stdin EOF to actually exit before reaping it ourselves.
     * Normal programs finish in milliseconds; this only ever fires for
     * runtimes/shells that fail to propagate the EOF, guaranteeing
     * the user's Ctrl+D always terminates the wait instead of hanging
     * forever.
     */
    eofGraceMs: 5_000,
    /** Concurrent sessions allowed per client IP. */
    maxSessionsPerIp: 2,
    /** Concurrent sessions allowed server-wide (all clients). */
    maxSessionsGlobal: 16,
} as const;
