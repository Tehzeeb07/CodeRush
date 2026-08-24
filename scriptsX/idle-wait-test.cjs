/* Idle-survival test: a program waiting for stdin must NOT be killed.
 * Starts a JS readline session, stays silent for 65s — LONGER than the
 * old 45s idle limit that used to kill it ("idle_timeout") — verifies
 * the session is still alive, then answers and expects normal exit.   */
const BASE = process.argv[2] ?? "http://localhost:3000";
const SILENT_WAIT_MS = 65_000; // > old 45s idle limit

const code = `
const readline = require("node:readline");
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question("Enter your name: ", (name) => {
  console.log("Hello " + name);
  rl.close();
});
`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function joinData(block) {
  return block.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trimStart()).join("\n");
}

async function main() {
  let sessionId;
  const r = await fetch(BASE + "/api/code/interactive/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language: "javascript", code }) });
  if (!r.ok) { console.log("FAIL start:", r.status); process.exit(1); }
  sessionId = (await r.json()).sessionId;
  console.log("session:", sessionId);

  const sres = await fetch(BASE + `/api/code/interactive/stream?sessionId=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
  console.log("stream:", sres.status, "— staying silent for", SILENT_WAIT_MS / 1000, "s ...");
  const reader = sres.body.getReader();
  const dec = new TextDecoder();
  let buf = "", stdoutText = "", exitInfo = null;

  // Simulated browser client: heartbeat every 20s while "terminal open".
  void (async () => {
    while (!exitInfo) {
      await sleep(20_000);
      if (exitInfo) break;
      try {
        const hb = await fetch(BASE + `/api/code/interactive/heartbeat?sessionId=${encodeURIComponent(sessionId)}`, { method: "POST" });
        console.log(`[t+${Math.round((Date.now() - t0) / 1000)}s] heartbeat:`, hb.status);
      } catch {}
    }
  })();

  // The answer arrives only AFTER the long silent wait.
  void (async () => {
    await sleep(SILENT_WAIT_MS);
    if (exitInfo) { console.log("input skipped — session already exited!"); return; }
    console.log(`[t+${SILENT_WAIT_MS / 1000}s] still alive — sending input now`);
    const res = await fetch(BASE + `/api/code/interactive/input?sessionId=${encodeURIComponent(sessionId)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input: "Shakeel\n" }) });
    console.log("input:", res.status);
    // Ctrl+D so the readline program can exit normally.
    await sleep(500);
    const eof = await fetch(BASE + `/api/code/interactive/eof?sessionId=${encodeURIComponent(sessionId)}`, { method: "POST" });
    console.log("eof:", eof.status);
  })();

  const t0 = Date.now();
  try {
    while (!exitInfo && Date.now() - t0 < SILENT_WAIT_MS + 30_000) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let b;
      while ((b = buf.indexOf("\n\n")) !== -1) {
        const bl = buf.slice(0, b); buf = buf.slice(b + 2);
        const evt = /^event:\s*(.*)$/m.exec(bl)?.[1] ?? "";
        const data = joinData(bl);
        if (evt === "stdout") stdoutText += data;
        if (evt === "exit") exitInfo = data;
      }
    }
  } catch (e) { console.log("stream err", String(e)); }

  let reason = null, exitCode = null;
  try { const j = JSON.parse(exitInfo ?? "{}"); reason = j.reason; exitCode = j.exitCode; } catch {}

  console.log("\nterminal output:", JSON.stringify(stdoutText));
  console.log("exit:", exitInfo);

  let ok = true, why = [];
  if (reason !== null) { ok = false; why.push(`session was KILLED during the silent wait (reason=${reason})`); }
  if (!(stdoutText.includes("Enter your name:") && stdoutText.includes("Hello Shakeel"))) { ok = false; why.push("expected interactive output missing"); }
  if (reason !== "exit") { ok = false; why.push(`final reason expected "exit" got ${reason}`); }

  console.log("\nRESULT:", ok ? "PASS ✓ (program survived the silent wait and completed normally)" : `FAIL ✗ — ${why.join("; ")}`);
  process.exit(ok ? 0 : 1);
}
void main();