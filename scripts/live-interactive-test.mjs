// scripts/live-interactive-test.mjs
// End-to-end check of the interactive execution flow against a running dev server.
// Usage: node scripts/live-interactive-test.mjs [baseUrl] [language]
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const BASE = process.argv[2] ?? "http://localhost:3001";
const lang = process.argv[3] ?? "javascript";
const code = process.argv[4] ?? 'console.log("Hello CodeRush");';

const out = [];
const log = (...args) => out.push(args.join(" "));
const RESULT_FILE = fileURLToPath(
  new URL("./live-test-result.txt", import.meta.url),
);

async function main() {
  try {
    log(`Starting session (language=${lang}) on ${BASE} ...`);
    const startRes = await fetch(`${BASE}/api/code/interactive/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: lang, code }),
    });
    const startJson = await startRes.json().catch(() => ({}));
    log(`start status: ${startRes.status} body: ${JSON.stringify(startJson)}`);

    if (!startRes.ok || !startJson.sessionId) {
      log("FAILED: could not start session.");
      return 1;
    }

    const sessionId = startJson.sessionId;
    log(`sessionId: ${sessionId}`);
    log("Opening SSE stream...");

    const streamRes = await fetch(
      `${BASE}/api/code/interactive/stream?sessionId=${encodeURIComponent(sessionId)}`,
      { cache: "no-store" },
    );
    log(`stream status: ${streamRes.status}`);
    if (!streamRes.ok || !streamRes.body) {
      log("FAILED: could not open stream.");
      return 1;
    }

    const reader = streamRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let gotExit = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let i;
        while ((i = buffer.indexOf("\n\n")) !== -1) {
          const block = buffer.slice(0, i);
          buffer = buffer.slice(i + 2);
          if (!block.trim()) continue;
          log("SSE>" + JSON.stringify(block));
          if (block.includes("event: exit")) gotExit = true;
        }
        if (gotExit) break;
        await new Promise((r) => setTimeout(r, 20));
      }
    } catch (err) {
      log(`stream read ended: ${err.message}`);
    } finally {
      reader.releaseLock();
    }

    log(gotExit ? "PASS: received an exit event." : "WARN: stream ended without exit event.");
    return gotExit ? 0 : 1;
  } catch (err) {
    log(`EXCEPTION: ${err.message}`);
    return 1;
  } finally {
    writeFileSync(RESULT_FILE, out.join("\n") + "\n", "utf8");
  }
}

process.exit(await main());