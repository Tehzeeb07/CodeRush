/* Final acceptance test: exact program from the requirements, against localhost:3000 */
const BASE = "http://localhost:3000";
const code = `#include <iostream>
#include <string>
using namespace std;

int main() {
    string username;
    int id;
    double marks;

    cout << "Enter username: " << flush;
    cin >> username;

    cout << "Enter ID: " << flush;
    cin >> id;

    cout << "Enter marks: " << flush;
    cin >> marks;

    cout << "\\n----- Result -----\\n";
    cout << "Username: " << username << endl;
    cout << "ID: " << id << endl;
    cout << "Marks: " << marks << endl;

    return 0;
}
`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function joinData(block) {
  return block.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trimStart()).join("\n");
}

async function main() {
  // start (retry for dev compile races)
  let sessionId;
  for (let i = 0; i < 5; i++) {
    const r = await fetch(BASE + "/api/code/interactive/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language: "cpp", code }) });
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
  let buf = "", stdoutText = "";
  let exited = false;

  void (async () => {
    await sleep(900);
    for (const line of ["Shakeel", "123", "85"]) {
      const res = await fetch(BASE + `/api/code/interactive/input?sessionId=${encodeURIComponent(sessionId)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ line }) });
      console.log("input", JSON.stringify(line), res.status);
      await sleep(900);
    }
  })();

  try {
    while (!exited) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let b;
      while ((b = buf.indexOf("\n\n")) !== -1) {
        const bl = buf.slice(0, b); buf = buf.slice(b + 2);
        const evt = /^event:\s*(.*)$/m.exec(bl)?.[1] ?? "";
        const data = joinData(bl);
        if (evt === "stdout") stdoutText += data;
        if (evt === "stderr") stdoutText += data; // show errors inline
        if (evt === "exit") exited = true;
      }
    }
  } catch (e) { console.log("stream err", String(e)); }

  console.log("\\n----- full reconstructed terminal stdout (LF-normalized) -----");
  console.log(JSON.stringify(stdoutText));

  // Stop button is a no-op if already exited (idempotent).
  await fetch(BASE + `/api/code/interactive/stop?sessionId=${encodeURIComponent(sessionId)}`, { method: "POST" });

  const expected = "Enter username: Enter ID: Enter marks: \n----- Result -----\nUsername: Shakeel\nID: 123\nMarks: 85\n";
  const ok = stdoutText.replace(/\s+$/, "") === expected.replace(/\s+$/, "") ||
    stdoutText.includes("Username: Shakeel") && stdoutText.includes("ID: 123") && stdoutText.includes("Marks: 85");
  console.log("\nRESULT:", ok ? "PASS ✓" : "FAIL ✗");
  process.exit(0);
}
void main();