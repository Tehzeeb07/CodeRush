/* Live re-verification of interactive C++ input against the running server. */
const BASE = "http://localhost:3000";
const code = `#include <iostream>
#include <string>
using namespace std;
int main() {
  string u; int id;
  cout << "Enter username: " << flush; cin >> u;
  cout << "Enter ID: " << flush; cin >> id;
  cout << "\\nResult: " << u << " " << id << "\\n";
  return 0;
}
`;
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
async function main(){
  let sessionId;
  for(let i=0;i<5;i++){
    const r=await fetch(BASE+"/api/code/interactive/start",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({language:"cpp",code})});
    console.log("start",r.status);
    if(r.ok){sessionId=(await r.json()).sessionId;break;}
    await sleep(1500);
  }
  if(!sessionId){console.log("NO SESSION");return;}
  const sres=await fetch(BASE+`/api/code/interactive/stream?sessionId=${encodeURIComponent(sessionId)}`,{cache:"no-store"});
  console.log("stream",sres.status);
  const reader=sres.body.getReader(); let buf="",events=[];
  let exited=false;
  const ir=reader;
  void (async()=>{
    await sleep(800);
    for(const line of ["Shakeel","123"]){
      const res=await fetch(BASE+`/api/code/interactive/input?sessionId=${encodeURIComponent(sessionId)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({line})});
      console.log("input",JSON.stringify(line),res.status);
      await sleep(800);
    }
  })();
  const dec=new TextDecoder();
  while(!exited){
    const {done,value}=await ir.read(); if(done)break;
    buf+=dec.decode(value,{stream:true});
    let b;
    while((b=buf.indexOf("\n\n"))!==-1){
      const bl=buf.slice(0,b); buf=buf.slice(b+2);
      const evt=/^event:\s*(.*)$/m.exec(bl)?.[1]??"";
      const data=bl.split("\n").filter(l=>l.startsWith("data:")).map(l=>l.slice(5).trimStart()).join("");
      events.push("EVENT "+evt+": "+JSON.stringify(data));
      const text=(evt==="stdout")?data:"";
      if(evt==="exit")exited=true;
    }
  }
  console.log("--- events ---"); for(const e of events)console.log(e);
  await fetch(BASE+`/api/code/interactive/stop?sessionId=${encodeURIComponent(sessionId)}`,{method:"POST"}).then(()=>console.log("stopped"));
  process.exit(0);
}
void main();