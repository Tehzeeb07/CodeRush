/**
 * HTTP execution backend — delegates execution to an external,
 * fully isolated sandbox service that speaks the Piston API
 * (https://github.com/engineer-man/piston).
 *
 * This is the recommended backend when Docker is not available on the
 * Next.js host. The service runs each submission in its own hardened
 * container/jail with CPU, memory, process and time limits, and never
 * shares environment variables or secrets with the sandbox.
 *
 * Configuration (server-side only — never exposed to the browser):
 *   EXECUTION_SERVICE_URL      base URL of a self-hosted Piston-compatible
 *                              instance, e.g. http://localhost:2000/api/v2/piston
 *   EXECUTION_SERVICE_API_KEY  optional bearer token for private instances
 *
 * Behaviour notes:
 *   - The configured language id (e.g. "cpp") is resolved against the
 *     service's /runtimes endpoint (names + aliases) into an exact
 *     language/version pair, so installations exposing different
 *     runtime names keep working without code changes.
 *   - Compilation (C++ / Java) happens inside the service; a failed
 *     compile stage is reported as `compilation_error`.
 *   - HTTP 401/403 raise ConfigurationError: the app is not authorized
 *     for this service at all, so we surface a clear configuration
 *     message and never silently fall back to another backend.
 *   - Java submissions are written to <PublicClass>.java (auto-detected)
 *     so users never configure class/file names manually.
 */

import type { ExecutionBackend, ExecutionJob } from "./backend";
import type { ExecutionResult } from "../types";
import { SANDBOX_LIMITS, truncateOutput } from "../sandbox";
import { resolveEntryFileName } from "../languages";
import {
    BackendUnavailableError,
    ConfigurationError,
    ExecutionTimeoutError,
} from "../types";

interface PistonRunStage {
    stdout: string | null;
    stderr: string | null;
    output: string | null;
    code: number | null;
    signal: string | null;
}

interface PistonResponse {
    language?: string;
    version?: string;
    compile?: PistonRunStage;
    run?: PistonRunStage;
    message?: string;
}

interface PistonRuntimeInfo {
    language: string;
    version: string;
    aliases?: string[];
    runtime?: string;
}

/** How long the /runtimes discovery result is reused (ms). */
const RUNTIME_CACHE_TTL_MS = 60_000;

export class HttpBackend implements ExecutionBackend {
    readonly name = "http";

    /** Cached /runtimes payload. */
    private runtimesCache: {
        at: number;
        runtimes: PistonRuntimeInfo[];
    } | null = null;

    constructor(
        private readonly baseUrl: string,
        private readonly apiKey?: string,
    ) { }

    /**
     * Accept URLs with or without a trailing "/execute" so both
     *   EXECUTION_SERVICE_URL=http://host:2000/api/v2/piston
     * and .../piston/execute work identically.
     */
    private get serviceRoot(): string {
        return this.baseUrl.replace(/\/+$/, "").replace(/\/execute$/, "");
    }

    async isAvailable(_job?: ExecutionJob): Promise<boolean> {
        return Boolean(this.baseUrl);
    }

    // -------------------------------------------------------------
    // Runtime discovery / language mapping
    // -------------------------------------------------------------

    private async fetchRuntimes(): Promise<PistonRuntimeInfo[] | null> {
        if (
            this.runtimesCache &&
            Date.now() - this.runtimesCache.at < RUNTIME_CACHE_TTL_MS
        ) {
            return this.runtimesCache.runtimes;
        }

        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 5_000);
            const response = await fetch(
                `${this.serviceRoot}/runtimes`,
                {
                    headers: this.buildHeaders(),
                    signal: controller.signal,
                    cache: "no-store",
                },
            ).finally(() => clearTimeout(timer));

            if (!response.ok) return null;

            const data = (await response.json()) as PistonRuntimeInfo[];
            if (!Array.isArray(data) || data.length === 0) return null;

            this.runtimesCache = { at: Date.now(), runtimes: data };
            return data;
        } catch {
            // Discovery is best-effort; when unavailable we send the raw
            // language id with version "*" and let the service resolve it.
            return null;
        }
    }

    /**
     * Map CodeRush's language id to the exact language/version pair the
     * service exposes. Matches canonical names AND aliases
     * (e.g. "cpp" -> "c++", "py3" -> "python") case-insensitively.
     */
    private async resolveTarget(
        job: ExecutionJob,
    ): Promise<{ language: string; version: string }> {
        const wanted = job.language.pistonLanguage.toLowerCase();

        const runtimes = await this.fetchRuntimes();
        if (!runtimes) {
            // Service did not expose /runtimes — send as-is; stock
            // Piston resolves "*" to the latest installed version.
            return {
                language: job.language.pistonLanguage,
                version: job.language.pistonVersion,
            };
        }

        const match = runtimes.find(
            (rt) =>
                rt.language.toLowerCase() === wanted ||
                (rt.aliases ?? []).some(
                    (alias) => alias.toLowerCase() === wanted,
                ),
        );

        if (!match) {
            throw new BackendUnavailableError(
                `${job.language.label} (${job.language.pistonRuntime}) is not available on the configured execution service.`,
            );
        }

        return { language: match.language, version: match.version };
    }

    // -------------------------------------------------------------
    // Request building
    // -------------------------------------------------------------

    private buildHeaders(): Record<string, string> {
        return {
            "Content-Type": "application/json",
            // Some execution services sit behind CDNs that reject
            // requests without a recognizable User-Agent.
            "User-Agent": "CodeRush/1.0 (+https://coderush.app)",
            ...(this.apiKey
                ? { Authorization: `Bearer ${this.apiKey}` }
                : {}),
        };
    }

    private buildPayload(
        job: ExecutionJob,
        target: { language: string; version: string },
    ): Record<string, unknown> {
        const timeoutSeconds = Math.max(
            1,
            Math.round(SANDBOX_LIMITS.timeoutMs / 1000),
        );
        return {
            language: target.language,
            version: target.version,
            files: [
                {
                    name: resolveEntryFileName(job.language.id, job.code),
                    content: job.code,
                },
            ],
            stdin: job.input,
            compile_timeout: timeoutSeconds,
            run_timeout: timeoutSeconds,
        };
    }

    async execute(job: ExecutionJob): Promise<ExecutionResult> {
        const startedAt = Date.now();
        const target = await this.resolveTarget(job);
        const controller = new AbortController();
        const timer = setTimeout(
            () => controller.abort(),
            SANDBOX_LIMITS.timeoutMs + 5_000,
        );

        try {
            const response = await fetch(`${this.serviceRoot}/execute`, {
                method: "POST",
                headers: this.buildHeaders(),
                body: JSON.stringify(this.buildPayload(job, target)),
                signal: controller.signal,
                cache: "no-store",
            });

            if (!response.ok) {
                // Capture the service's own reason for SERVER-SIDE logs
                // (Piston reports failures as {"message": "..."} JSON).
                let serverReason = "";
                try {
                    const raw = await response.text();
                    try {
                        const parsed = JSON.parse(raw) as { message?: string };
                        serverReason = parsed.message || raw.slice(0, 500);
                    } catch {
                        serverReason = raw.slice(0, 500) ||
                            "(no response body)";
                    }
                } catch {
                    serverReason = "(response body unreadable)";
                }

                console.error(
                    `[code-execution] execution service rejected request ` +
                        `(HTTP ${response.status}) for ${job.language.id}: ` +
                        `${serverReason}`,
                );

                // 401/403 mean this app is not authorized for the service
                // at all (bad/missing API key or a whitelist-only
                // instance). No retry helps — surface a clear
                // configuration error instead of falling back silently.
                if (response.status === 401 || response.status === 403) {
                    throw new ConfigurationError(
                        "Code execution service is not authorized.\nPlease configure a valid self-hosted execution service.",
                        `HTTP ${response.status}: ${serverReason}`,
                    );
                }
                if (response.status === 429) {
                    throw new Error(
                        "The execution service is rate limiting requests. Please wait a moment and try again.",
                    );
                }
                throw new Error(
                    `The code execution service reported a problem (HTTP ${response.status}). Please try again later.`,
                );
            }

            const data = (await response.json()) as PistonResponse;

            // Some Piston deployments report failures via a top-level
            // message instead of a run stage (unknown runtime, bad
            // request, service misconfiguration, ...).
            if (!data.run && data.message) {
                throw new BackendUnavailableError(data.message);
            }

            const run: PistonRunStage = data.run ?? {
                stdout: "",
                stderr: "",
                output: "",
                code: 1,
                signal: null,
            };
            const compile = data.compile;

            // Compilation stage failed (C++ / Java).
            if (
                compile &&
                ((compile.code !== null && compile.code !== 0) ||
                    compile.signal !== null)
            ) {
                return {
                    success: false,
                    status: "compilation_error",
                    output: truncateOutput(compile.stdout ?? ""),
                    error:
                        truncateOutput(
                            compile.stderr || compile.output || "",
                        ) || "Compilation failed.",
                    executionTime: Date.now() - startedAt,
                    memoryUsageKb: null,
                };
            }

            // The sandbox killed the process — treat it as the time
            // limit being exceeded (infinite loop protection).
            if (run.signal === "SIGKILL" || run.signal === "SIGTERM") {
                throw new ExecutionTimeoutError();
            }

            const stdout = truncateOutput(run.stdout || "");
            const stderr = truncateOutput(run.stderr || "");

            return {
                success: run.code === 0,
                status: run.code === 0 ? "success" : "runtime_error",
                output: stdout,
                error: run.code === 0 ? null : stderr || null,
                executionTime: Date.now() - startedAt,
                memoryUsageKb: null,
            };
        } catch (err) {
            if (err instanceof ExecutionTimeoutError) throw err;
            if (err instanceof Error && err.name === "AbortError") {
                throw new ExecutionTimeoutError();
            }
            // Network-level failures reaching the configured service
            // (connection refused, DNS failure, ...) are configuration
            // problems — say so clearly instead of a raw fetch error.
            if (err instanceof TypeError) {
                throw new ConfigurationError(
                    "Code execution service is unreachable.\nPlease verify EXECUTION_SERVICE_URL points at a running, self-hosted execution service.",
                    String(err),
                );
            }
            throw err;
        } finally {
            clearTimeout(timer);
        }
    }
}