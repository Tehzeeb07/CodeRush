/**
 * Common contract implemented by every execution backend.
 *
 * A backend is responsible for running one job inside its own
 * isolation boundary (container, remote sandbox service, or a
 * best-effort restricted local process) and returning a normalized
 * ExecutionResult. Backends must never leak host state into results.
 */

import type { LanguageConfig } from "../languages";
import type { ExecutionResult } from "../types";

export interface ExecutionJob {
    language: LanguageConfig;
    code: string;
    input: string;
}

export interface ExecutionBackend {
    /** Human-readable backend name (used in logs / error messages). */
    readonly name: string;
    /**
     * Cheap check whether this backend can currently run the given job
     * (e.g. Docker daemon reachable, service URL configured).
     */
    isAvailable(job: ExecutionJob): Promise<boolean>;
    /** Run the job. Must respect SANDBOX_LIMITS.timeoutMs. */
    execute(job: ExecutionJob): Promise<ExecutionResult>;
}