/**
 * Spawn a LONG-LIVED sandboxed process for interactive execution.
 *
 * Unlike the single-shot backends (which pipe pre-supplied stdin and
 * collect all output until exit), this module starts a program whose
 * stdio stay connected so that:
 *
 *   process.stdout  -> streamed to the browser (SSE)
 *   process.stderr  -> streamed to the browser (SSE)
 *   browser input   -> process.stdin (one line per submit)
 *
 * Isolation mirrors the production backends:
 *
 *   docker (preferred)
 *     Ephemeral container with no network, memory/CPU/PID caps,
 *     read-only rootfs + tiny tmpfs, no privilege escalation and a
 *     clean environment. `-i` keeps the container's stdin attached to
 *     the pipe for the whole session; `--rm` guarantees cleanup.
 *
 *   local (development ONLY)
 *     Restricted child process with an allow-listed environment,
 *     fresh temp working directory and hidden window. NOT a hard
 *     security boundary.
 *
 * Server-only module.
 */

import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { ChildProcessWithoutNullStreams } from "node:child_process";

import { createWorkspace } from "../sandbox";
import type { ExecutionJob } from "../backends/backend";
import type { LanguageConfig } from "../languages";

export interface SpawnedInteractiveProcess {
    /** Live child process with open stdio pipes. */
    child: ChildProcessWithoutNullStreams;
    /** Host temp dir holding the source file (cleaned up on exit). */
    workspace: string;
    /** Container name to `docker stop` for cleanup, when running under Docker. */
    containerName?: string;
}

let cachedDockerAvailable: boolean | null = null;

/** Cheap cached probe whether the Docker daemon is reachable. */
export async function isDockerAvailable(): Promise<boolean> {
    cachedDockerAvailable ??= await new Promise<boolean>((resolve) => {
        const probe = spawn("docker", ["info", "--format", "ok"], {
            windowsHide: true,
            stdio: ["ignore", "pipe", "ignore"],
        });
        let out = "";
        probe.stdout?.on("data", (c: Buffer) => {
            out += c.toString();
        });
        const timer = setTimeout(() => {
            probe.kill("SIGKILL");
            resolve(false);
        }, 5_000);
        timer.unref();
        probe.on("error", () => resolve(false));
        probe.on("close", (code) => {
            clearTimeout(timer);
            resolve(code === 0 && out.trim() === "ok");
        });
    });
    return cachedDockerAvailable;
}

/** Minimal environment passed to locally spawned processes. */
function buildCleanEnv(): NodeJS.ProcessEnv {
    const env: Record<string, string> = {};
    if (process.env.PATH) env.PATH = process.env.PATH;
    if (process.platform === "win32") {
        if (process.env.SystemRoot) env.SystemRoot = process.env.SystemRoot;
        if (process.env.COMSPEC) env.COMSPEC = process.env.COMSPEC;
        if (process.env.TEMP) env.TEMP = process.env.TEMP;
        if (process.env.TMP) env.TMP = process.env.TMP;
    } else {
        env.HOME = "/tmp";
        env.TMPDIR = "/tmp";
    }
    return env as NodeJS.ProcessEnv;
}

/**
 * Adapt a POSIX-style run command for the LOCAL Windows fallback.
 *
 * The language `runCommand` uses POSIX executable syntax (the C++
 * command ends in `... && ./program`). Node runs it through
 * `cmd.exe /d /s /c`, and `cmd.exe` CANNOT resolve `./program` — it
 * aborts with `'.' is not recognized as an internal or external
 * command`, so the compiled program would never start. This strips the
 * leading `./` so the workspace program is launched by plain name
 * (`program` -> `program.exe` in the current directory). Docker (POSIX)
 * and non-Windows hosts are never affected because only the local
 * `<em>cmd.exe</em>` shell receives the rewritten command.
 */
function localWindowsRunCommand(command: string): string {
    if (process.platform !== "win32") return command;
    // `g++ ... -o program main.cpp && ./program` -> `... && program`
    return command.replace(/&&\s*\.\/([A-Za-z0-9_.-]+)\s*$/i, "&& $1");
}

/**
 * Build the run command used for INTERACTIVE sessions on the LOCAL
 * fallback path (no Docker). Same goal as `interactiveRunCommand` —
 * prompts like `input("Enter name: ")` must appear immediately even
 * though stdout is a pipe — but only with flags that exist locally:
 *
 *   python:  `-u` (unbuffered). On Windows the interpreter is invoked
 *            as `python` because `python3` commonly resolves to the
 *            Microsoft Store app-execution-alias stub, which is NOT a
 *            working runtime.
 *   c++:     stdbuf is a POSIX/coreutils tool and does not exist on
 *            Windows, so the plain compile+run command is kept;
 *            prompt flushing there depends on the program printing
 *            endl/flush. The Docker sandbox DOES wrap C++ in stdbuf.
 *   js/java: unchanged (node flushes per write; the JVM's internal
 *            buffering cannot be disabled from the command line).
 */
function localInteractiveRunCommand(language: LanguageConfig): string {
    if (process.platform === "win32") {
        if (language.id === "python") {
            return `python -u ${language.fileName}`;
        }
        return localWindowsRunCommand(language.runCommand);
    }
    // POSIX hosts get the same unbuffering treatment as the container.
    return interactiveRunCommand(language);
}

function spawnShell(
    command: string,
    cwd: string,
): ChildProcessWithoutNullStreams {
    const isWindows = process.platform === "win32";
    return spawn(
        isWindows ? "cmd.exe" : "/bin/sh",
        isWindows ? ["/d", "/s", "/c", command] : ["-c", command],
        {
            cwd,
            env: buildCleanEnv(),
            stdio: ["pipe", "pipe", "pipe"],
            windowsHide: true,
            // Own process group on POSIX so the tree can be killed.
            detached: !isWindows,
        },
    ) as ChildProcessWithoutNullStreams;
}

/**
 * Build the run command used for INTERACTIVE sessions.
 *
 * Language runtimes buffer stdout when it is a pipe instead of a TTY
 * (Python: block-buffered; C++ iostream: fully buffered), which would
 * delay interactive prompts like `input("Enter name: ")` until the
 * program exits. This rewrites the command so output is line-buffered
 * or unbuffered:
 *
 *   python:  python3 -u main.py            (unbuffered)
 *   c++:     ... && stdbuf -oL -eL ./program  (line-buffered; coreutils)
 *   java:    java Main.java                (JVM buffers internally;
 *                                           javac/a JVM cannot be fixed
 *                                           from the command line)
 *   js:      node main.js                  (already prompt-flushing)
 *
 * Only applied to the Docker sandbox (POSIX). The Windows local
 * fallback keeps the plain runCommand.
 */
function interactiveRunCommand(language: LanguageConfig): string {
    const command = language.runCommand;
    switch (language.id) {
        case "python":
            return command.replace(/^python3(?=\s)/, "python3 -u");
        case "cpp":
            return command.replace(
                /&&\s*\.\/(program)\s*$/,
                "&& stdbuf -oL -eL ./$1",
            );
        default:
            return command;
    }
}

/** Best-effort Docker container cleanup (`docker rm -f` stops + removes). */
export function stopDockerContainer(name: string): void {
    void spawn("docker", ["rm", "-f", name], {
        windowsHide: true,
        stdio: "ignore",
    });
}

/**
 * Start the program described by `job` inside the strongest available
 * isolation boundary. The returned process' stdin is left OPEN — the
 * caller keeps it alive across multiple user inputs and ends the
 * session by killing the process tree.
 */
export async function spawnInteractiveProcess(
    job: ExecutionJob,
): Promise<SpawnedInteractiveProcess> {
    const workspace = await createWorkspace();
    await writeFile(join(workspace, job.language.fileName), job.code, "utf8");

    if (await isDockerAvailable()) {
        // Same hardening as the single-shot Docker backend, plus `-i`
        // so the container stdin stays connected for interactive use.
        const containerName = `coderush-run-${randomUUID()}`;
        const child = spawn("docker", [
            "run",
            "--rm",
            "-i",
            "--name", containerName,
            "--network", "none",
            "--cpus", "0.5",
            "--memory", "256m",
            // Fork-bomb protection.
            "--pids-limit", "128",
            "--read-only",
            "--tmpfs", "/tmp:size=32m,noexec,nosuid",
            "--security-opt", "no-new-privileges",
            "-v", `${workspace}:/sandbox`,
            "--workdir", "/sandbox",
            job.language.dockerImage,
            "sh", "-c", interactiveRunCommand(job.language),
        ], {
            stdio: ["pipe", "pipe", "pipe"],
            windowsHide: true,
        }) as ChildProcessWithoutNullStreams;
        return { child, workspace, containerName };
    }

    // Development fallback: restricted local child process.
    // The C++ runCommand ends in `&& ./program`, which cmd.exe on Windows
    // cannot run ("'.' is not recognized"); use the Windows-local rewrite.
    const child = spawnShell(
        localInteractiveRunCommand(job.language),
        workspace,
    );
    return { child, workspace };
}

/** Forcefully terminate a spawned process and all of its children. */
export function killProcessTree(child: ChildProcessWithoutNullStreams): void {
    try {
        child.stdin.end();
    } catch {
        /* stdin already gone */
    }
    if (child.pid === undefined) return;
    if (process.platform === "win32") {
        spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
            windowsHide: true,
            stdio: "ignore",
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
