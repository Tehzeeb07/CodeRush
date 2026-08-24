/* Minimal probe: non-interactive program must stream stdout + exit event. */
const BASE = process.argv[2] ?? "http://localhost:3000";

async function main() {
  const r = await fetch(BASE + "/api/code/interactive/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language: "javascript", code: 'console.log("probe-hello");' }) });
  console.log("start:", r.status);
  const { sessionId } = await r.json();
  const sres = await fetch(BASE + `/api/code/interactive/stream?sessionId=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
  console.log("stream:", sres.status);
  const reader = sres.body.getReader();
  const dec = new TextDecoder();
  let buf = "", exited = false;
  const timeout = setTimeout(() => { console.log("TIMEOUT: no exit event within 15s"); process.exit(1); }, 15000);
  while (!exited) {
    const { done, value } = await reader.read();
    if (done) { console.log("stream ended (done)"); break; }
    buf += dec.decode(value, { stream: true });
    let b;
    while ((b = buf.indexOf("\n\n")) !== -1) {
      const bl = buf.slice(0, b); buf = buf.slice(b + 2);
      console.log("SSE>", JSON.stringify(bl));
      if (bl.includes("event: exit")) { exited = true; clearTimeout(timeout); }
    }
  }
  console.log(exited ? "PROBE PASS ✓" : "PROBE FAIL ✗");
  process.exit(exited ? 0 : 1);
}
void main();