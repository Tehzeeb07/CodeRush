/**
 * Registry of active interactive sessions (process-per-run).
 *
 * Enforces concurrency caps per client IP and globally so one client
 * cannot exhaust the host with parallel sandboxes. Stored on
 * globalThis so Next.js dev-mode module reloads keep a single registry.
 *
 * Server-only module.
 */

import type { LanguageConfig } from "../languages";
import { ValidationError } from "../types";
import { spawnInteractiveProcess } from "./spawn-interactive";
import { InteractiveSession } from "./session";
import { INTERACTIVE_LIMITS } from "./limits";

class InteractiveSessionManager {
    private sessions = new Map<string, InteractiveSession>();

    /**
     * Number of sessions whose process is still alive. Finished sessions
     * are retained briefly for late SSE replay and therefore stay in the
     * map, but they must not consume concurrency budget.
     */
    activeCount(): number {
        let count = 0;
        for (const session of this.sessions.values()) {
            if (!session.hasExited) count += 1;
        }
        return count;
    }

    activeCountForIp(ip: string): number {
        let count = 0;
        for (const session of this.sessions.values()) {
            if (session.ip === ip && !session.hasExited) count += 1;
        }
        return count;
    }

    get(id: string): InteractiveSession | undefined {
        return this.sessions.get(id);
    }

    /**
     * Spawn a new sandboxed process and register it as a session.
     * Throws ValidationError(429) when concurrency caps are reached.
     */
    async create(ip: string, language: LanguageConfig, code: string): Promise<InteractiveSession> {
        if (
            this.activeCount() >= INTERACTIVE_LIMITS.maxSessionsGlobal ||
            this.activeCountForIp(ip) >= INTERACTIVE_LIMITS.maxSessionsPerIp
        ) {
            throw new ValidationError(
                "Too many concurrent programs running. Stop a running program or wait for it to finish.",
                429,
            );
        }

        const { child, workspace, containerName } = await spawnInteractiveProcess({
            language,
            code,
            input: "",
        });

        const session = new InteractiveSession(
            ip,
            Date.now(),
            child,
            workspace,
            (s) => {
                // Do NOT delete finished sessions immediately: a fast
                // program may exit before the client's SSE stream opens,
                // and that stream still needs to find the session to
                // replay the buffered output and the exit event. Retain
                // it for a short grace period, then prune (unref'd timer
                // so the process isn't held open by the registry).
                const timer = setTimeout(() => {
                    this.sessions.delete(s.id);
                }, INTERACTIVE_LIMITS.retainedMs);
                timer.unref?.();
            },
            containerName,
        );
        this.sessions.set(session.id, session);
        return session;
    }

    /** Stop a session by id. Idempotent — unknown ids are ignored. */
    stop(id: string): boolean {
        const session = this.sessions.get(id);
        if (!session) return false;
        session.stop("stopped");
        return true;
    }
}

// Survive dev-server hot reloads: one registry per process.
const globalForSessions = globalThis as unknown as {
    __coderushInteractiveSessions?: InteractiveSessionManager;
};

export function getSessionManager(): InteractiveSessionManager {
    globalForSessions.__coderushInteractiveSessions ??=
        new InteractiveSessionManager();
    return globalForSessions.__coderushInteractiveSessions;
}

export type { InteractiveSessionManager };
