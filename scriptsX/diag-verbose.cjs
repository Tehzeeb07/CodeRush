/* Verbose interactive diagnostic: logs every SSE event with timestamps
 * and answers prompts reactively (no fixed-timing races).              */
const BASE = process.argv[2] ?? "http://localhost:3000";

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

const t0 = Date.now();
const ts = () => `[t+${((Date.now() - t0) / 1000).toFixed(2)}s]`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function joinData(block) {
  return block.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trimStart()).join("\n");
}

async function main() {
  const r = await fetch(BASE + "/api/code/interactive/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language: "javascript", code }) });
  console.log(ts(), "start:", r.status);
  const { sessionId } = await r.json();

  const send = async (text) => {
    const res = await fetch(BASE + `/api/code/interactive/input?sessionId=${encodeURIComponent(sessionId)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input: text }) });
    console.log(ts(), `send ${JSON.stringify(text)} ->`, res.status);
  };

  const sres = await fetch(BASE + `/api/code/interactive/stream?sessionId=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
  console.log(ts(), "stream:", sres.status);

  const reader = sres.body.getReader();
  const dec = new TextDecoder();
  let buf = "", acc = "", exited = false;

  // Safety net: if no prompt within 6s, push the first input blindly.
  const blind = setTimeout(() => { console.log(ts(), "!! no prompt seen in 6s — sending blind"); void send("Shakeel"); }, 6000);

  setTimeout(() => { console.log(ts(), "GLOBAL TIMEOUT"); console.log("acc:", JSON.stringify(acc)); process.exit(1); }, 25000);

  while (!exited) {
    const { done, value } = await reader.read();
    if (done) { console.log(ts(), "stream done"); break; }
    buf += dec.decode(value, { stream: true });
    let b;
    while ((b = buf.indexOf("\n\n")) !== -1) {
      const bl = buf.slice(0, b); buf = buf.slice(b + 2);
      const evt = /^event:\s*(.*)$/m.exec(bl)?.[1] ?? "";
      const data = joinData(bl);
      console.log(ts(), `EVT ${evt}: ${JSON.stringify(data)}`);
      if (evt === "stdout") {
        acc += data;
        if (data.includes("Enter your name:")) { clearTimeout(blind); await sleep(150); await send("Shakeel\n"); }
        else if (data.includes("Enter your age:")) { await sleep(150); await send("21\n"); }
        else if (data.includes("Your age is 21")) {
          // Ctrl+D: readline programs exit only on stdin EOF.
          const eof = await fetch(BASE + `/api/code/interactive/eof?sessionId=${encodeURIComponent(sessionId)}`, { method: "POST" });
          console.log(ts(), "eof:", eof.status);
        }
      }
      if (evt === "exit") { exited = true; }
    }
  }
  console.log(ts(), "FINAL acc:", JSON.stringify(acc));
  console.log(acc.includes("Hello Shakeel") && acc.includes("Your age is 21") ? "DIAG PASS ✓" : "DIAG FAIL ✗");
}
void main();