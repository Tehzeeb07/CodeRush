/* Local experiment v3: does the cmd.exe intermediate shell swallow
 * stdin EOF? Same readline-closed program, but spawned exactly like
 * the server does: cmd.exe /d /s /c node <file>.                      */
const { spawn } = require("node:child_process");
const { mkdtempSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const dir = mkdtempSync(join(tmpdir(), "eof-exp-"));
const file = join(dir, "main.js");
writeFileSync(file, `
const rl=require("node:readline").createInterface({input:process.stdin,output:process.stdout});
rl.question("q: ",(a)=>{console.log("ANSWER:"+a);rl.close();});
rl.on("close",()=>{console.log("RL-CLOSE");});
`);

const t0 = Date.now();
const log = (m) => console.log(`[+${((Date.now() - t0) / 1000).toFixed(2)}s] ${m}`);
const isWin = process.platform === "win32";
const child = spawn(isWin ? "cmd.exe" : "/bin/sh", isWin ? ["/d","/s","/c","node main.js"] : ["-c","node main.js"], { cwd: dir, stdio: ["pipe","pipe","pipe"], windowsHide: true });
let sent = false;
child.stdout.on("data",(c)=>{ const s=c.toString(); process.stdout.write("OUT "+JSON.stringify(s)+"\n");
  if (!sent && s.includes("q:")) { sent=true; child.stdin.write("hi\n"); setTimeout(()=>{ log("parent stdin.end()"); child.stdin.end(); },400); }
});
child.stderr.on("data",(c)=>process.stdout.write("ERR "+JSON.stringify(c.toString())+"\n"));
child.on("close",(code,sig)=>{ log(`CLOSED code=${code} sig=${sig}`); process.exit(0); });
setTimeout(()=>{ log("TIMEOUT via-shell — child alive 8s after EOF"); child.kill("SIGKILL"); process.exit(1); }, 8000);