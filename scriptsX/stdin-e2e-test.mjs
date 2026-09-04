#!/usr/bin/env node
/**
 * stdin-e2e-test.mjs — end-to-end verification that user input survives
 * the whole Run pipeline: request body -> /api/judge (mode=custom) ->
 * executeCode -> execution service stdin -> program output.
 */
const BASE = process.argv[2] ?? "http://localhost:3000";
const SLUG = process.argv[3] ?? "sum-two";

const CPP_READ_ALL = `#include <iostream>
#include <string>
#include <iterator>
int main(){std::string d((std::istreambuf_iterator<char>(std::cin)),std::istreambuf_iterator<char>());`;

async function post(path, body) {
    const res = await fetch(BASE + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    return { status: res.status, json: await res.json().catch(() => null) };
}

let pass = 0, fail = 0;
function check(name, cond, detail) {
    if (cond) { pass++; console.log(`PASS  ${name}`); }
    else { fail++; console.log(`FAIL  ${name} -> ${detail}`); }
}

// 1. Run (mode=custom) must feed the user's exact input via stdin.
{
    const { status, json } = await post("/api/judge", {
        mode: "custom",
        problemSlug: SLUG,
        language: "cpp",
        code: `#include <iostream>\nint main(){long long a,b;std::cin>>a>>b;std::cout<<"SUM:"<<(a+b)<<"\\n";}`,
        customInput: "3\n4\n",
    });
    const out = json?.custom?.stdout ?? "";
    check("run: two-value stdin reaches program",
        status === 200 && out.includes("SUM:7"),
        `status=${status} out=${JSON.stringify(out)} body=${JSON.stringify(json)?.slice(0, 300)}`);
}

// 2. Multi-line input with an empty line is preserved verbatim.
{
    const input = "alpha\n\nbeta\n";
    const { status, json } = await post("/api/judge", {
        mode: "custom",
        problemSlug: SLUG,
        language: "cpp",
        code: `${CPP_READ_ALL}std::cout<<"ECHO<"<<d<<">";}`,
        customInput: input,
    });
    const out = json?.custom?.stdout ?? "";
    check("run: multi-line + empty line preserved", status === 200 && out === `ECHO<${input}>`,
        `status=${status} out=${JSON.stringify(out)}`);
}

// 3. CRLF from a Windows textarea is normalized to \n (no \r artifacts).
{
    const { status, json } = await post("/api/judge", {
        mode: "custom",
        problemSlug: SLUG,
        language: "cpp",
        code: `${CPP_READ_ALL}int lines=0;for(char ch:d)if(ch=='\\n')lines++;std::cout<<"HASCR:"<<(d.find('\\r')==std::string::npos?0:1)<<" LINES:"<<lines;}`,
        customInput: "one\r\ntwo\r\n",
    });
    const out = json?.custom?.stdout ?? "";
    check("run: CRLF normalized to LF", status === 200 && out === "HASCR:0 LINES:2",
        `status=${status} out=${JSON.stringify(out)}`);
}

// 4. Program that reads but gets no input: must NOT be reported as success
//    with fake output — here the program exits non-zero on empty stdin.
{
    const { status, json } = await post("/api/judge", {
        mode: "custom",
        problemSlug: SLUG,
        language: "cpp",
        code: `${CPP_READ_ALL}if(d.find_first_not_of(" \\t\\r\\n")==std::string::npos)return 2;std::cout<<"ok";}`,
        customInput: "",
    });
    check("run: empty stdin not reported as clean success",
        status === 200 && json?.custom?.exitCode !== 0 && json?.outcome === "runtime_error",
        `status=${status} outcome=${json?.outcome} exit=${json?.custom?.exitCode}`);
}

// 5. /api/code/execute playground route also forwards stdin.
{
    const { status, json } = await post("/api/code/execute", {
        language: "cpp",
        code: `#include <iostream>\nint main(){long long a,b;std::cin>>a>>b;std::cout<<"SUM:"<<(a+b)<<"\\n";}`,
        stdin: "10\n32\n",
    });
    const out = json?.output ?? json?.stdout ?? "";
    check("playground /api/code/execute forwards stdin",
        status === 200 && out.includes("SUM:42"),
        `status=${status} out=${JSON.stringify(out)} body=${JSON.stringify(json)?.slice(0, 300)}`);
}

// 6. Run/Submit separation: mode "run" must still use the problem's OWN
//    admin-configured test cases (never the user's custom input), and
//    mode "custom" must never produce judged test results.
{
    const run = await post("/api/judge", {
        mode: "run",
        problemSlug: SLUG,
        language: "cpp",
        code: `#include <iostream>\nint main(){long long a,b;std::cin>>a>>b;std::cout<<(a+b)<<"\\n";}`,
        customInput: "999\n888\n",
    });
    const cust = await post("/api/judge", {
        mode: "custom",
        problemSlug: SLUG,
        language: "cpp",
        code: `#include <iostream>\nint main(){std::cout<<"custom-only\\n";}`,
        customInput: "",
    });
    check("separation: run mode judges admin tests (custom input ignored)",
        run.status === 200 && run.json?.custom === null &&
        Array.isArray(run.json?.testResults) && run.json.testResults.length > 0,
        `status=${run.status} custom=${JSON.stringify(run.json?.custom)} tests=${run.json?.testResults?.length}`);
    check("separation: custom mode never returns judged tests",
        cust.status === 200 && cust.json?.mode === "custom" &&
        cust.json?.testResults?.length === 0 && cust.json?.custom !== null,
        `status=${cust.status} tests=${cust.json?.testResults?.length}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
