#!/usr/bin/env node
/**
 * verify.mjs — end-to-end verification of POST /api/code/execute
 * against a running CodeRush dev server + execution service.
 *
 * Usage:
 *   node scripts/verify.mjs [baseUrl]     (default http://localhost:3000)
 */

const BASE = process.argv[2] ?? "http://localhost:3000";
const URL = `${BASE}/api/code/execute`;

let pass = 0;
let fail = 0;

async function run(name, body, expect) {
    try {
        const res = await fetch(URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));

        const ok =
            res.status === expect.http &&
            (expect.success === undefined || data.success === expect.success) &&
            (expect.status === undefined || data.status === expect.status) &&
            (expect.stdout === undefined || data.stdout === expect.stdout) &&
            (expect.stdoutIncludes === undefined ||
                String(data.stdout ?? "").includes(expect.stdoutIncludes)) &&
            (expect.compileOutputIncludes === undefined ||
                String(data.compile_output ?? "").includes(expect.compileOutputIncludes)) &&
            (expect.stderrIncludes === undefined ||
                String(data.stderr ?? "").includes(expect.stderrIncludes));

        if (ok) {
            pass++;
            console.log(`  PASS  ${name}`);
        } else {
            fail++;
            console.log(`  FAIL  ${name}`);
            console.log(`        expected: ${JSON.stringify(expect)}`);
            console.log(
                `        actual:   HTTP ${res.status} ${JSON.stringify(data).slice(0, 300)}`,
            );
        }
    } catch (err) {
        fail++;
        console.log(`  FAIL  ${name} — request error: ${err.message}`);
    }
}

console.log(`Verifying ${URL}\n`);

// ---- All four languages: hello world ---------------------------------
await run("javascript hello", {
    language: "javascript",
    code: 'console.log("CodeRush JavaScript works!");',
    stdin: "",
}, { http: 200, success: true, status: "success", stdout: "CodeRush JavaScript works!\n" });

await run("python hello", {
    language: "python",
    code: 'print("CodeRush Python works!")',
    stdin: "",
}, { http: 200, success: true, status: "success", stdout: "CodeRush Python works!" });

await run("cpp hello (compile+run)", {
    language: "cpp",
    code: '#include <iostream>\nusing namespace std;\nint main() {\n    cout << "CodeRush C++ works!" << endl;\n    return 0;\n}\n',
    stdin: "",
}, { http: 200, success: true, status: "success", stdout: "CodeRush C++ works!" });

await run("java hello (compile+run)", {
    language: "java",
    code: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("CodeRush Java works!");\n    }\n}\n',
    stdin: "",
}, { http: 200, success: true, status: "success", stdout: "CodeRush Java works!" });

// ---- Java class-name auto-detection ----------------------------------
await run("java custom public class name", {
    language: "java",
    code: 'public class HelloWorld {\n    public static void main(String[] args) {\n        System.out.println("Hello from HelloWorld");\n    }\n}\n',
    stdin: "",
}, { http: 200, success: true, status: "success", stdout: "Hello from HelloWorld" });

// ---- stdin -------------------------------------------------------------
await run("javascript stdin sum (10+20=30)", {
    language: "javascript",
    code: 'const fs = require("fs");\nconst input = fs.readFileSync(0, "utf8").trim().split(/\\s+/).map(Number);\nconsole.log(input[0] + input[1]);',
    stdin: "10\n20",
}, { http: 200, success: true, stdout: "30\n" });

await run("python stdin passthrough", {
    language: "python",
    code: '# STDIN_ECHO\nprint("x")',
    stdin: "10\n20",
}, { http: 200, success: true, stdout: "10\n20" });

// ---- Errors --------------------------------------------------------------
await run("cpp compilation error", {
    language: "cpp",
    code: '// COMPILE_ERROR\n#include <iostream>\nusing namespace std;\nint main() {\n    cout << oops << endl;\n    return 0;\n}\n',
    stdin: "",
}, { http: 200, success: false, status: "compilation_error", compileOutputIncludes: "error" });

await run("python runtime error", {
    language: "python",
    code: "print(undefined_name)",
    stdin: "",
}, { http: 200, success: false, status: "runtime_error", stderrIncludes: "NameError" });

await run("javascript syntax error", {
    language: "javascript",
    code: 'console.log("unclosed',
    stdin: "",
}, { http: 200, success: false, status: "runtime_error", stderrIncludes: "SyntaxError" });

await run("infinite loop -> timeout", {
    language: "javascript",
    code: "while(true){}",
    stdin: "",
}, { http: 200, success: false, status: "timeout" });

// ---- Output edge cases ------------------------------------------------------
await run("empty output", {
    language: "python",
    code: "x = 1 + 1",
    stdin: "",
}, { http: 200, success: true, stdout: "" });

await run("large output truncated", {
    language: "python",
    code: '# LARGE_OUTPUT\nprint("x")',
    stdin: "",
}, { http: 200, success: true, stdoutIncludes: "[output truncated" });

// ---- Request validation -------------------------------------------------------
await run("invalid language rejected", {
    language: "ruby",
    code: "puts 1",
    stdin: "",
}, { http: 400 });

await run("empty code rejected", {
    language: "python",
    code: "",
    stdin: "",
}, { http: 400 });

{
    const res = await fetch(URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{not json",
    });
    if (res.status === 400) {
        pass++;
        console.log("  PASS  malformed JSON rejected");
    } else {
        fail++;
        console.log(`  FAIL  malformed JSON rejected — HTTP ${res.status}`);
    }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);




