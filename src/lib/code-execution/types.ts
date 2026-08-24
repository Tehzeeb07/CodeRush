/**
 * Shared types for the CodeRush code execution system.
 *
 * These types are used by both the API route (server) and the
 * frontend editor components (client), so they must stay
 * framework-agnostic and free of Node-only imports.
 */

/** Identifiers of every language CodeRush can execute. */
export type LanguageId = "javascript" | "python" | "cpp" | "java";

/** Request body sent from the editor to POST /api/code/execute. */
export interface ExecuteRequestBody {
    language: LanguageId;
    code: string;
    input?: string;
}

/** High-level outcome of an execution, surfaced in the UI. */
export type ExecutionStatus =
    | "success"
    | "runtime_error"
    | "compilation_error"
    | "timeout"
    | "internal_error";

/** Structured result returned by the execution backend. */
export interface ExecutionResult {
    success: boolean;
    status: ExecutionStatus;
    /** Combined program stdout (truncated to a safe size). */
    output: string;
    /** Compiler/runtime error message, or null on success. */
    error: string | null;
    /** Wall-clock execution time in milliseconds. */
    executionTime: number;
    /** Peak memory usage in KB when the backend reports it, else null. */
    memoryUsageKb: number | null;
}

/** Error thrown internally when a request fails validation. */
export class ValidationError extends Error {
    constructor(
        message: string,
        public readonly statusCode: number,
    ) {
        super(message);
        this.name = "ValidationError";
    }
}

/** Error thrown when execution exceeds the configured time limit. */
export class ExecutionTimeoutError extends Error {
    constructor(message = "Execution timed out") {
        super(message);
        this.name = "ExecutionTimeoutError";
    }
}

/** Error thrown when no execution backend can run the requested language. */
export class BackendUnavailableError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "BackendUnavailableError";
    }
}

/**
 * Error thrown when the configured remote execution service cannot be
 * used because of application configuration — e.g. it answers
 * HTTP 401/403 (bad/missing API key or whitelist-only instance) or the
 * URL itself is wrong. Never surfaced raw to the browser: the API
 * route logs the underlying reason server-side and shows a friendly
 * configuration message instead.
 */
export class ConfigurationError extends Error {
    constructor(
        /** Friendly, user-safe message. */
        message: string,
        /** Full technical detail — logged server-side only. */
        public readonly detail?: string,
    ) {
        super(message);
        this.name = "ConfigurationError";
    }
}