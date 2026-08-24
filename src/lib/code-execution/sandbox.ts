/**
 * Sandbox primitives shared by every execution backend:
 * resource limits, isolated temp workspaces, and output sanitizing.
 *
 * Server-only module (uses node:fs, node:os, node:child_process helpers).
 */

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Hard limits applied to every execution.
 *
 * IMPORTANT:
 * maxCodeBytes controls the maximum size of source code
 * accepted by the code execution API.
 */
export const SANDBOX_LIMITS = {
    /** Max wall-clock time for the whole run (compile + execute). */
    timeoutMs: 10_000,

    /** Container memory cap (docker backend). */
    memoryMb: 256,

    /** Container CPU cap (docker backend). */
    cpus: 0.5,

    /** Max processes inside the container (fork-bomb protection). */
    pidsLimit: 128,

    /** Writable tmpfs inside the container, in MB. */
    tmpfsMb: 32,

    /**
     * Max bytes of source code accepted per request.
     *
     * Previous limit:
     * 20,000 bytes
     *
     * New limit:
     * 100,000 bytes
     *
     * This allows substantially larger programs,
     * including large interactive testing programs.
     */
    maxCodeBytes: 100_000,

    /**
     * Max bytes of stdin accepted per request.
     *
     * This is separate from maxCodeBytes.
     * It controls how much user input can be sent
     * to the running program.
     */
    maxInputBytes: 10_000,

    /**
     * Max bytes of stdout/stderr captured before truncation.
     *
     * This prevents a program producing unlimited output
     * from consuming excessive memory.
     */
    maxOutputBytes: 64_000,
} as const;

/**
 * Create a fresh, empty working directory for one execution.
 *
 * Each execution receives its own temporary workspace.
 */
export async function createWorkspace(): Promise<string> {
    return mkdtemp(join(tmpdir(), "coderush-run-"));
}

/**
 * Recursively delete an execution workspace.
 *
 * Never throws because cleanup should not cause an execution
 * request to fail.
 */
export async function cleanupWorkspace(dir: string): Promise<void> {
    try {
        await rm(dir, {
            recursive: true,
            force: true,
        });
    } catch {
        // Best-effort cleanup.
        // Leftover temporary directories are harmless.
    }
}

/**
 * Truncate captured output so a runaway program
 * cannot exhaust server memory.
 */
export function truncateOutput(text: string): string {
    if (
        Buffer.byteLength(text, "utf8") <=
        SANDBOX_LIMITS.maxOutputBytes
    ) {
        return text;
    }

    const sliced = Buffer.from(text)
        .subarray(0, SANDBOX_LIMITS.maxOutputBytes)
        .toString("utf8");

    return `${sliced}
... [output truncated at ${SANDBOX_LIMITS.maxOutputBytes} bytes]`;
}