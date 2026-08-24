/* Multi-input JavaScript (readline) acceptance test.
 * Usage: node scriptsX/js-readline-test.cjs [baseUrl]                    */
const BASE = process.argv[2] ?? "http://localhost:3000";

// Mirrors the exact flow from the requirements: two prompts answered
// interactively through stdin while the process stays alive.
const code = `
const readline = require("node:readline");
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question("Enter your name: ", (name) => {
  rl.question("Enter your age: ", (age) => {
    console.log("Hello " + name);
    console.log("Your age is " + age);
    rl.close();
  });
});
`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function joinData(block) {
  return block.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trimStart()).join("\n");
}

async function main() {
  let sessionId;
  for (let i = 0; i < 5; i++) {
    const r = await fetch(BASE + "/api/code/interactive/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language: "javascript", code }) });
    if (r.ok) { sessionId = (await r.json()).sessionId; break; }
    console.log("start retry", i, r.status);
    await sleep(1500);
  }
  if (!sessionId) { console.log("FAIL: no session"); process.exit(1); }
  console.log("session:", sessionId);

  const sres = await fetch(BASE + `/api/code/interactive/stream?sessionId=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
  console.log("stream:", sres.status);
  const reader = sres.body.getReader();
  const dec = new TextDecoder();
  let buf = "", stdoutText = "", exitInfo = null;

  void (async () => {
    await sleep(900);
    // Heartbeat ping — proves a live client is attached (like the browser does).
    const hb = await fetch(BASE + `/api/code/interactive/heartbeat?sessionId=${encodeURIComponent(sessionId)}`, { method: "POST" });
    console.log("heartbeat:", hb.status);
    for (const line of ["Shakeel", "21"]) {
      // Uses the spec-compliant { input } body field with "\n" included.
      const res = await fetch(BASE + `/api/code/interactive/input?sessionId=${encodeURIComponent(sessionId)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, input: line + "\n" }) });
      console.log("input", JSON.stringify(line), res.status);
      await sleep(900);
    }
        // Ctrl+D: readline-style programs only exit on stdin EOF.
    const eof = await fetch(BASE + `/api/code/interactive/eof?sessionId=${encodeURIComponent(sessionId)}`, { method: "POST" });
    const ej = await eof.json().catch(() => null);
    console.log("eof:", eof.status, JSON.stringify(ej));
  })();

  try {
    while (!exitInfo) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let b;
      while ((b = buf.indexOf("\n\n")) !== -1) {
        const bl = buf.slice(0, b); buf = buf.slice(b + 2);
        const evt = /^event:\s*(.*)$/m.exec(bl)?.[1] ?? "";
        const data = joinData(bl);
        if (evt === "stdout" || evt === "stderr") stdoutText += data;
        if (evt === "exit") exitInfo = data;
      }
    }
  } catch (e) { console.log("stream err", String(e)); }

  console.log("\n--- reconstructed terminal output ---");
  console.log(JSON.stringify(stdoutText));
  console.log("exit event:", exitInfo);

  let reason = null;
  try { reason = JSON.parse(exitInfo ?? "{}").reason; } catch {}
  const ok =
    stdoutText.includes("Enter your name:") &&
    stdoutText.includes("Hello Shakeel") &&
    stdoutText.includes("Your age is 21") &&
    reason === "exit";
  console.log("\nRESULT:", ok ? "PASS ✓" : "FAIL ✗");
  process.exit(ok ? 0 : 1);
}
void main();