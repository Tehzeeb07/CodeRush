/**
 * Executor — the single entry point used by the API route to run code.
 *
 * Selects an isolation backend based on configuration:
 *
 *   CODE_EXECUTION_BACKEND=http (recommended / default for production)
 *     Delegates every submission to the configured external
 *     Piston-compatible execution service (EXECUTION_SERVICE_URL).
 *     STRICT mode: if the service is unreachable, rejects authorization
 *     or lacks a runtime, the request fails with a clear configuration
 *     error — there is NO silent fallback into this server process.
 *
 *   CODE_EXECUTION_BACKEND=docker
 *     Runs each submission in a hardened, ephemeral Docker container.
 *
 *   CODE_EXECUTION_BACKEND=local
 *     Restricted child-process fallback (development only; not a hard
 *     security boundary). Must be selected explicitly.
 *
 *   CODE_EXECUTION_BACKEND=auto (default)
 *     Picks by availability: docker -> http -> local.
 *
 * User code NEVER executes inside the Next.js server process unless a
 * developer explicitly opts into the `local` backend.
 *
 * Server-only module.
 */

import { DockerBackend } from "./backends/docker-backend";
import { HttpBackend } from "./backends/http-backend";
import { LocalBackend } from "./backends/local-backend";
import type { ExecutionBackend, ExecutionJob } from "./backends/backend";
import { getLanguage } from "./languages";
import {
    BackendUnavailableError,
    ExecutionResult,
} from "./types";

export type BackendMode = "auto" | "docker" | "http" | "local";

let cachedDockerBackend: DockerBackend | null = null;
let cachedDockerAvailable: boolean | null = null;

function getConfiguredMode(): BackendMode {
    const raw = process.env.CODE_EXECUTION_BACKEND?.trim().toLowerCase();
    if (raw === "docker" || raw === "http" || raw === "local") return raw;
    return "auto";
}

async function resolveBackend(job: ExecutionJob): Promise<ExecutionBackend> {
    const mode = getConfiguredMode();
    const httpUrl = process.env.EXECUTION_SERVICE_URL?.trim();

    const httpBackend =
        httpUrl && httpUrl.length > 0
            ? new HttpBackend(
                httpUrl.replace(/\/+$/, ""),
                process.env.EXECUTION_SERVICE_API_KEY?.trim() || undefined,
            )
            : null;
    const localBackend = new LocalBackend();

    if (mode === "http") {
        // Strict: the configured execution service is the ONLY backend.
        // Failures surface as configuration errors — never a silent
        // downgrade to the non-hardened local sandbox.
        if (!httpBackend) {
            throw new BackendUnavailableError(
                "HTTP execution backend selected but EXECUTION_SERVICE_URL is not configured.",
            );
        }
        return httpBackend;
    }

    if (mode === "docker") return getCachedDockerBackend();
    if (mode === "local") return localBackend;

    // auto mode: pick by availability — docker -> http -> local
    const docker = await getCachedDockerBackend();
    if (await docker.isAvailable(job)) return docker;
    if (httpBackend && (await httpBackend.isAvailable(job))) return httpBackend;
    if (await localBackend.isAvailable(job)) return localBackend;

    throw new BackendUnavailableError(
        `No execution backend is available for ${job.language.label}. Configure EXECUTION_SERVICE_URL to point at a self-hosted Piston-compatible service, or install Docker.`,
    );
}

async function getCachedDockerBackend(): Promise<DockerBackend> {
    cachedDockerBackend ??= new DockerBackend();
    cachedDockerAvailable ??= await cachedDockerBackend.isAvailable();
    return cachedDockerBackend;
}

/**
 * Validate + execute a submission end-to-end.
 * Throws ValidationError / ExecutionTimeoutError / BackendUnavailableError
 * which the API route maps to HTTP responses.
 */
export async function executeCode(params: {
    language: Parameters<typeof getLanguage>[0];
    code: string;
    input?: string;
}): Promise<ExecutionResult> {
    const job: ExecutionJob = {
        language: getLanguage(params.language),
        code: params.code,
        input: params.input ?? "",
    };

    const backend = await resolveBackend(job);
    return backend.execute(job);
}