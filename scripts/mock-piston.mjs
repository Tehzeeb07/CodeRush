#!/usr/bin/env node
/**
 * mock-piston.mjs — a minimal Piston-compatible execution service for
 * LOCAL DEVELOPMENT AND TESTING ONLY.
 *
 * Implements the subset of the Piston v2 API CodeRush uses:
 *   GET  /api/v2/piston/runtimes
 *   POST /api/v2/piston/execute
 *
 * Behaviour:
 *   - javascript : executed FOR REAL via the local Node.js runtime
 *                  (stdin piped, wall-clock timeout enforced).
 *   - python /
 *     c++ / java : faithfully simulated stages — compilation (with
 *                  realistic diagnostics on failure), stdout extraction,
 *                  runtime/syntax errors, timeouts and stdin pass-through
 *                  (see the STDIN_ECHO marker below).
 *
 * Useful markers inside submitted code (simulation only):
 *   STDIN_ECHO           -> echoes received stdin back as stdout
 *                           (proves stdin plumbing end-to-end)
 *   oops / COMPILE_ERROR -> compile stage fails (C++/Java)
 *   undefined_name       -> Python NameError at runtime
 *   RUNTIME_ERROR        -> generic nonzero-exit runtime failure
 *   LARGE_OUTPUT         -> emits ~100 KB of stdout
 *   while(true)/while True -> killed after the run_timeout (SIGKILL)
 *
 * Env flags:
 *   MOCK_PISTON_PORT    port to listen on (default 2000)
 *   MOCK_REQUIRE_AUTH=1 reject requests without Authorization header (401)
 *
 * Usage: node scripts/mock-piston.mjs
 */

import http from "node:http";
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PORT = Number(process.env.MOCK_PISTON_PORT ?? 2000);
const REQUIRE_AUTH = process.env.MOCK_REQUIRE_AUTH === "1";

const RUNTIMES = [
    {
        language: "javascript",
        version: "22.11.0",
        aliases: ["js", "node", "node-js"],
        runtime: "node",
    },
    {
        language: "python",
        version: "3.12.3",
        aliases: ["py", "py3", "python3"],
        runtime: "python3",
    },
    {
        language: "c++",
        version: "13.2.0",
        aliases: ["cpp", "cxx"],
        runtime: "g++",
    },
    {
        language: "java",
        version: "21.0.4",
        aliases: ["openjdk", "jdk"],
        runtime: "openjdk",
    },
];

function sendJson(res, status, body) {
    const payload = JSON.stringify(body);
    res.writeHead(status, {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
    });
    res.end(payload);
}

/** Run JavaScript for real with the local Node.js runtime. */
function runJavaScript(code, stdin, timeoutMs) {
    return new Promise((resolve) => {
        const dir = mkdtempSync(join(tmpdir(), "mock-piston-"));
        const file = join(dir, "main.js");
        writeFileSync(file, code, "utf8");

        const startedAt = Date.now();
        const child = spawn(process.execPath, [file], {
            stdio: ["pipe", "pipe", "pipe"],
            windowsHide: true,
        });

        const out = [];
        const err = [];
        let timedOut = false;
        const timer = setTimeout(() => {
            timedOut = true;
            child.kill("SIGKILL");
        }, Math.max(timeoutMs, 500));

        child.stdout.on("data", (c) => out.push(c));
        child.stderr.on("data", (c) => err.push(c));
        child.stdin.on("error", () => {});
        if (stdin) child.stdin.write(stdin);
        child.stdin.end();

        child.on("error", (e) => {
            clearTimeout(timer);
            rmSync(dir, { recursive: true, force: true });
            resolve({
                stdout: "",
                stderr: String(e),
                code: 1,
                signal: null,
                time: Date.now() - startedAt,
            });
        });

        child.on("close", (exitCode, signal) => {
            clearTimeout(timer);
            rmSync(dir, { recursive: true, force: true });
            resolve({
                stdout: Buffer.concat(out).toString("utf8"),
                stderr: Buffer.concat(err).toString("utf8"),
                code: timedOut ? null : exitCode,
                signal: timedOut ? "SIGKILL" : signal,
                time: Date.now() - startedAt,
            });
        });
    });
}

function extractPrintedStrings(code, language) {
    const patterns = {
        python: [/print\(\s*f?"([^"]*)"/g],
        "c++": [/cout\s*<<\s*"([^"]*)"/g],
        java: [/System\.out\.println\(\s*"([^"]*)"\s*\)/g],
    };
    const lines = [];
    for (const re of patterns[language] ?? []) {
        for (const match of code.matchAll(re)) lines.push(match[1]);
    }
    return lines;
}

/** Simulate compiled/interpreted stages for python / c++ / java. */
function simulate(code, stdin, language, timeoutMs) {
    // --- Infinite loop protection -----------------------------------
    if (/while\s*\(\s*(true|1)\s*\)|while\s+True/.test(code)) {
        return Promise.resolve({
            compile: null,
            run: { stdout: "", stderr: "", output: "", code: null, signal: "SIGKILL" },
            time: Math.min(timeoutMs, 1500),
        });
    }

    const isCompiled = language === "c++" || language === "java";

    // --- Compilation stage -------------------------------------------
    let compile = null;
    if (isCompiled && /oops|COMPILE_ERROR/.test(code)) {
        const file = language === "c++" ? "main.cpp" : "Main.java";
        compile = {
            stdout: "",
            stderr:
                language === "c++"
                    ? `${file}: In function 'int main()':\n${file}:5:26: error: 'oops' was not declared in this scope\ncompilation terminated.`
                    : `${file}:7: error: cannot find symbol\n  symbol: variable oops\n1 error`,
            output: "",
            code: 1,
            signal: null,
        };
        return Promise.resolve({
            compile,
            run: { stdout: "", stderr: "", output: "", code: null, signal: null },
            time: 120,
        });
    }
    if (isCompiled) {
        compile = { stdout: "", stderr: "", output: "", code: 0, signal: null };
    }

    // --- Runtime stage ------------------------------------------------
    const lines = [];

    if (/STDIN_ECHO/.test(code)) {
        lines.push(...stdin.split("\n")); // echo stdin -> proves plumbing
    } else if (/LARGE_OUTPUT/.test(code)) {
        const chunk = "CodeRush large output line\n".repeat(4000); // ~108 KB
        lines.push(...chunk.split("\n"));
    } else {
        lines.push(...extractPrintedStrings(code, language));
    }

    let stderr = "";
    let exitCode = 0;

    if (/undefined_name/.test(code)) {
        stderr =
            "Traceback (most recent call last):\n" +
            '  File "main.py", line 1, in <module>\n' +
            "NameError: name 'undefined_name' is not defined";
        exitCode = 1;
    } else if (/RUNTIME_ERROR/.test(code)) {
        stderr = "Segmentation fault (core dumped)";
        exitCode = 139;
    }

    const stdout = lines.filter((l) => l !== "").join("\n");
    return Promise.resolve({
        compile,
        run: { stdout, stderr, output: stdout + stderr, code: exitCode, signal: null },
        time: isCompiled ? 90 : 25,
    });
}

let lastRequest = null;

const server = http.createServer(async (req, res) => {
    const url = req.url ?? "";

    if (REQUIRE_AUTH && !req.headers.authorization) {
        return sendJson(res, 401, { message: "unauthorized" });
    }

    if (req.method === "GET" && url.endsWith("/runtimes")) {
        return sendJson(res, 200, RUNTIMES);
    }

    if (req.method === "POST" && url.endsWith("/execute")) {
        let raw = "";
        req.on("data", (c) => (raw += c));
        req.on("end", async () => {
            let body;
            try {
                body = JSON.parse(raw);
            } catch {
                return sendJson(res, 400, { message: "invalid JSON body" });
            }

            lastRequest = {
                url,
                language: body.language,
                version: body.version,
                fileName: body.files?.[0]?.name,
                stdinLength: (body.stdin ?? "").length,
                stdin: body.stdin ?? "",
                compileTimeout: body.compile_timeout,
                runTimeout: body.run_timeout,
                at: new Date().toISOString(),
            };
            writeFileSync(
                new URL("./.mock-last-request.json", import.meta.url),
                JSON.stringify(lastRequest, null, 2),
            );

            const { language, files, stdin = "", run_timeout = 3 } = body;
            const code = files?.[0]?.content ?? "";
            const timeoutMs = Number(run_timeout) * 1000;

            if (!RUNTIMES.some((rt) => rt.language === language)) {
                return sendJson(res, 400, {
                    message: `${language} runtime is unknown`,
                });
            }

            let stage;
            if (language === "javascript") {
                const r = await runJavaScript(code, stdin, timeoutMs);
                stage = {
                    compile: null,
                    run: {
                        stdout: r.stdout,
                        stderr: r.stderr,
                        output: `${r.stdout}${r.stderr}`,
                        code: r.code,
                        signal: r.signal,
                    },
                };
            } else {
                stage = await simulate(code, stdin, language, timeoutMs);
            }

            const response = {
                language,
                version:
                    RUNTIMES.find((rt) => rt.language === language)?.version ??
                    "*",
                ...(stage.compile ? { compile: stage.compile } : {}),
                run: stage.run,
            };
            return sendJson(res, 200, response);
        });
        return;
    }

    sendJson(res, 404, { message: `no route for ${req.method} ${url}` });
});

server.listen(PORT, () => {
    console.log(`[mock-piston] listening on http://localhost:${PORT}`);
    console.log(
        "[mock-piston] endpoints: GET /api/v2/piston/runtimes, POST /api/v2/piston/execute",
    );
});


