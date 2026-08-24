/**
 * Local execution backend — DEVELOPMENT FALLBACK ONLY.
 *
 * Used when neither Docker nor an external execution service is
 * available (e.g. quick local development). It is NOT a hard security
 * boundary: it spawns the language runtime as a child process of the
 * Next.js server, but applies strong mitigations:
 *
 *   - a fresh empty temp working directory per run (deleted afterwards)
 *   - a minimal allow-list environment (PATH/SystemRoot only — no app
 *     secrets, no Convex/Mongo credentials, no API keys)
 *   - hard wall-clock timeout with forceful process-tree termination
 *   - output size capping
 *   - stdin/stdout piped (no TTY), windows hidden
 *
 * For production use the Docker or HTTP backends.
 */

import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { ExecutionBackend, ExecutionJob } from "./backend";
import type { ExecutionResult, ExecutionStatus } from "../types";
import {
    SANDBOX_LIMITS,
    cleanupWorkspace,
    createWorkspace,
    truncateOutput,
} from "../sandbox";

/** Minimal environment passed to sandboxed processes. */
function buildCleanEnv(): NodeJS.ProcessEnv {
    const env: Record<string, string> = {};
    if (process.env.PATH) env.PATH = process.env.PATH;
    if (process.platform === "win32") {
        // cmd.exe and many runtimes require these on Windows.
        if (process.env.SystemRoot) env.SystemRoot = process.env.SystemRoot;
        if (process.env.COMSPEC) env.COMSPEC = process.env.COMSPEC;
        if (process.env.TEMP) env.TEMP = process.env.TEMP;
        if (process.env.TMP) env.TMP = process.env.TMP;
    } else {
        env.HOME = "/tmp";
        env.TMPDIR = "/tmp";
    }
    // Next.js augments ProcessEnv with a required NODE_ENV field; the
    // sandbox environment intentionally contains nothing else.
    return env as NodeJS.ProcessEnv;
}

/** Runtime binaries each language needs on PATH for local execution. */
const REQUIRED_BINARIES: Record<string, string[]> = {
    javascript: ["node"],
    python: ["python3", "python"],
    cpp: ["g++"],
    java: ["java"],
};

/**
 * Adapt a POSIX-style run command for the LOCAL Windows fallback.
 *
 * The language `runCommand` uses POSIX executable syntax (the C++
 * command ends in `... && ./program`). Node runs it through
 * `cmd.exe /d /s /c`, and `cmd.exe` CANNOT resolve `./program` — it
 * aborts with `'.' is not recognized`, so the program never starts.
 * Strip the leading `./` so the workspace program launches by plain
 * name (cmd resolves `program` to `program.exe` in the current dir).
 * POSIX hosts are unaffected.
 */
function localWindowsRunCommand(command: string): string {
    if (process.platform !== "win32") return command;
    // `g++ ... -o program main.cpp && ./program` -> `... && program`
    return command.replace(/&&\s*\.\/([A-Za-z0-9_.-]+)\s*$/i, "&& $1");
}

function binaryExists(binary: string): Promise<boolean> {
    if (process.platform === "win32") {
        // `where` prints every match, one per line. On Windows, the
        // Microsoft Store's "app execution alias" stubs (e.g. the
        // python.exe that opens the Store) live under ...\WindowsApps\
        // and are NOT real runtimes — spawning them just prints a
        // "Python was not found" notice. Reject those matches.
        const command = spawn("where", [binary], { windowsHide: true });
        return new Promise((resolve) => {
            let output = "";
            command.stdout?.on("data", (chunk: Buffer) => {
                output += chunk.toString();
            });
            command.on("close", (code) => {
                if (code !== 0 || !output.trim()) return resolve(false);
                const real = output
                    .split(/\r?\n/)
                    .map((line) => line.trim())
                    .filter(
                        (line) =>
                            line.length > 0 &&
                            !/[\\/]WindowsApps[\\/]/i.test(line),
                    );
                resolve(real.length > 0);
            });
            command.on("error", () => resolve(false));
        });
    }
    const command = spawn("which", [binary]);
    return new Promise((resolve) => {
        command.on("close", (code) => resolve(code === 0));
        command.on("error", () => resolve(false));
    });
}

/**
 * Distinguish compiler diagnostics from runtime failures so the UI can
 * label them correctly.
 */
function classifyError(
    stderr: string,
    stdout: string,
): ExecutionStatus {
    const combined = `${stderr}
${stdout}`;
    if (
        /(?:error:|fatal error:|compilation terminated)/i.test(combined) ||
        /\.java:\d+:\s*error:/i.test(combined)
    ) {
        return "compilation_error";
    }
    return "runtime_error";
}

export class LocalBackend implements ExecutionBackend {
    readonly name = "local";

    async isAvailable(job: ExecutionJob): Promise<boolean> {
        const binaries = REQUIRED_BINARIES[job.language.id] ?? [];
        for (const binary of binaries) {
            if (await binaryExists(binary)) return true;
        }
        return false;
    }

    execute(job: ExecutionJob): Promise<ExecutionResult> {
        return this.run(job);
    }

    private run(job: ExecutionJob): Promise<ExecutionResult> {
        return new Promise<ExecutionResult>((resolve) => {
            void (async () => {
                const startedAt = Date.now();
                const workspace = await createWorkspace();
                await writeFile(
                    join(workspace, job.language.fileName),
                    job.code,
                    "utf8",
                );

                const isWindows = process.platform === "win32";
                const child = spawn(
                    isWindows ? "cmd.exe" : "/bin/sh",
                    isWindows
                        ? ["/d", "/s", "/c", localWindowsRunCommand(job.language.runCommand)]
                        : ["-c", job.language.runCommand],
                    {
                        cwd: workspace,
                        env: buildCleanEnv(),
                        stdio: ["pipe", "pipe", "pipe"] as const,
                        windowsHide: true,
                        // Own process group on POSIX so we can kill the tree.
                        detached: !isWindows,
                    },
                );

                const stdoutChunks: Buffer[] = [];
                const stderrChunks: Buffer[] = [];
                let timedOut = false;
                let settled = false;

                const timer = setTimeout(() => {
                    timedOut = true;
                    killProcessTree(child);
                }, SANDBOX_LIMITS.timeoutMs);

                child.stdout.on("data", (chunk: Buffer) =>
                    stdoutChunks.push(chunk),
                );
                child.stderr.on("data", (chunk: Buffer) =>
                    stderrChunks.push(chunk),
                );

                child.stdin.on("error", () => {
                    /* Program may not read stdin; ignore EPIPE. */
                });

                if (job.input.length > 0) {
                    child.stdin.write(job.input);
                }
                child.stdin.end();

                child.on("error", (err: NodeJS.ErrnoException) => {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timer);
                    void cleanupWorkspace(workspace);
                    resolve({
                        success: false,
                        status: "internal_error",
                        output: "",
                        error:
                            err.code === "ENOENT"
                                ? `The ${job.language.label} runtime is not installed on this machine. Use the Docker or HTTP execution backend instead.`
                                : "Failed to start the program.",
                        executionTime: Date.now() - startedAt,
                        memoryUsageKb: null,
                    });
                });

                child.on("close", (code) => {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timer);
                    void cleanupWorkspace(workspace);

                    if (timedOut) {
                        resolve({
                            success: false,
                            status: "timeout",
                            output: truncateOutput(
                                Buffer.concat(stdoutChunks).toString("utf8"),
                            ),
                            error: `Execution exceeded the ${SANDBOX_LIMITS.timeoutMs / 1000}s time limit and was terminated.`,
                            executionTime: Date.now() - startedAt,
                            memoryUsageKb: null,
                        });
                        return;
                    }

                    const stdout = truncateOutput(
                        Buffer.concat(stdoutChunks).toString("utf8"),
                    );
                    const stderr = truncateOutput(
                        Buffer.concat(stderrChunks).toString("utf8"),
                    );

                    resolve({
                        success: code === 0,
                        status:
                            code === 0
                                ? "success"
                                : classifyError(stderr, stdout),
                        output: stdout,
                        error: code === 0 ? null : stderr || null,
                        executionTime: Date.now() - startedAt,
                        memoryUsageKb: null,
                    });
                });
            })();
        });
    }
}

/** Forcefully terminate a spawned process and all of its children. */
function killProcessTree(child: ReturnType<typeof spawn>): void {
    if (child.pid === undefined) return;
    if (process.platform === "win32") {
        // taskkill /T kills the whole tree on Windows.
        spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
            windowsHide: true,
        });
    } else {
        try {
            // Negative PID targets the detached process group.
            process.kill(-child.pid, "SIGKILL");
        } catch {
            child.kill("SIGKILL");
        }
    }
}