/**
 * Docker execution backend — the recommended production sandbox.
 *
 * Every job runs in an ephemeral container with:
 *   - no network (--network none)
 *   - memory cap (--memory)
 *   - CPU cap (--cpus)
 *   - process cap (--pids-limit, fork-bomb protection)
 *   - read-only root filesystem (--read-only) with a small writable tmpfs
 *   - a clean environment (containers inherit NO host env vars,
 *     so Convex/Mongo credentials and API keys are unreachable)
 *   - automatic termination when the wall-clock limit is exceeded
 *
 * The user's code is written to a fresh temp directory on the host and
 * bind-mounted read/write at /sandbox; the directory is deleted afterwards.
 */

import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { ExecutionBackend, ExecutionJob } from "./backend";
import type { ExecutionResult } from "../types";
import {
    SANDBOX_LIMITS,
    cleanupWorkspace,
    createWorkspace,
    truncateOutput,
} from "../sandbox";
import { ExecutionTimeoutError } from "../types";

interface SpawnOutcome {
    stdout: string;
    stderr: string;
    timedOut: boolean;
    exitCode: number | null;
}

function runDocker(
    args: string[],
    timeoutMs: number,
    stdin?: string,
): Promise<SpawnOutcome> {
    return new Promise((resolve, reject) => {
        // stdin must be a live pipe: programs that read input receive the
        // job's stdin through it. Output pipes capture stdout/stderr.
        const child = spawn("docker", args, {
            stdio: ["pipe", "pipe", "pipe"],
            windowsHide: true,
        });

        const stdoutChunks: Buffer[] = [];
        const stderrChunks: Buffer[] = [];
        let timedOut = false;

        const timer = setTimeout(() => {
            timedOut = true;
            // Kill the docker CLI; `docker run` forwards the stop to the
            // container, tearing down the sandboxed process tree.
            child.kill("SIGKILL");
        }, timeoutMs);

        child.stdout.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
        child.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk));

        // The program may exit without reading all (or any) stdin — a
        // failed write must never crash the process.
        child.stdin.on("error", () => {
            /* EPIPE — program did not consume stdin; ignore. */
        });

        // Feed the user's/test's input, then close the pipe so programs
        // reading until EOF terminate normally instead of hanging.
        child.stdin.end(stdin && stdin.length > 0 ? stdin : undefined);

        child.on("error", (err) => {
            clearTimeout(timer);
            reject(err);
        });

        child.on("close", (code) => {
            clearTimeout(timer);
            resolve({
                stdout: Buffer.concat(stdoutChunks).toString("utf8"),
                stderr: Buffer.concat(stderrChunks).toString("utf8"),
                timedOut,
                exitCode: code,
            });
        });
    });
}

export class DockerBackend implements ExecutionBackend {
    readonly name = "docker";

    async isAvailable(job?: ExecutionJob): Promise<boolean> {
        void job;
        try {
            const result = await runDocker(["info", "--format", "ok"], 5_000);
            return !result.timedOut && result.stdout.trim() === "ok";
        } catch {
            return false;
        }
    }

    async execute(job: ExecutionJob): Promise<ExecutionResult> {
        const startedAt = Date.now();
        const workspace = await createWorkspace();
        const codePath = join(workspace, job.language.fileName);

        try {
            await writeFile(codePath, job.code, "utf8");

            const args = [
                "run",
                "--rm",
                // Keep the container's stdin open and attached to the CLI's
                // pipe so the job's stdin actually reaches the program.
                "--interactive",
                "--network", "none",
                "--cpus", String(SANDBOX_LIMITS.cpus),
                "--memory", `${SANDBOX_LIMITS.memoryMb}m`,
                "--pids-limit", String(SANDBOX_LIMITS.pidsLimit),
                "--read-only",
                "--tmpfs",
                `/tmp:size=${SANDBOX_LIMITS.tmpfsMb}m,noexec,nosuid`,
                "--security-opt", "no-new-privileges",
                "-v", `${workspace}:/sandbox`,
                "--workdir", "/sandbox",
                job.language.dockerImage,
                "sh", "-c", job.language.runCommand,
            ];

            let outcome: SpawnOutcome;
            try {
                outcome = await runDocker(
                    args,
                    SANDBOX_LIMITS.timeoutMs + 2_000,
                    job.input,
                );
            } catch {
                throw new Error(
                    "Failed to start the execution sandbox. Is Docker installed and running?",
                );
            }

            if (outcome.timedOut) {
                throw new ExecutionTimeoutError();
            }

            const executionTime = Date.now() - startedAt;

            return {
                success: outcome.exitCode === 0,
                status:
                    outcome.exitCode === 0 ? "success" : "runtime_error",
                output: truncateOutput(outcome.stdout),
                error:
                    outcome.exitCode === 0
                        ? null
                        : truncateOutput(outcome.stderr || outcome.stdout) || null,
                executionTime,
                memoryUsageKb: null,
            };
        } finally {
            await cleanupWorkspace(workspace);
        }
    }
}