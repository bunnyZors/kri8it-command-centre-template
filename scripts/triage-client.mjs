// Private HTTP fallback; credentials only via hidden stdin, never saved or logged.
import { readFileSync } from "node:fs";
import { instance } from "../lib/instance.mjs";
if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.setEncoding("utf8");
process.stdout.write("Ready for private triage request on stdin (input is hidden).\n");
let input="", running=false;
async function run() {
  if(running)return; running=true; process.stdin.pause();
  try {
    const {origin,token,payload,action="read"}=JSON.parse(input.trim());
    const hosting=JSON.parse(readFileSync(new URL("../.openai/hosting.json",import.meta.url),"utf8"));
    if(!hosting.project_id || !instance.configured || !instance.siteOrigin || origin!==instance.siteOrigin || !token || !["read","record"].includes(action)) throw Error("Invalid destination or action");
    const url=new URL("/api/command-centre",instance.siteOrigin);
    const body=action==="record"?JSON.stringify(payload):undefined;
    if(action==="record" && (!payload || typeof payload!=="object" || Array.isArray(payload)))throw Error("Invalid payload");
    const response=await fetch(url,{method:action==="record"?"POST":"GET",redirect:"manual",headers:{"OAI-Sites-Authorization":`Bearer ${token}`,"Content-Type":"application/json"},...(body?{body}:{})});
    console.log(JSON.stringify({status:response.status,result:await response.json()}));
    process.exit(response.ok?0:1);
  }catch{process.stderr.write("Private request failed; verify configuration, credentials and complete JSON.\n");process.exit(1);}
}
process.stdin.on("data",chunk=>{input+=chunk;if(input.length>500000){process.stderr.write("Request too large.\n");process.exit(1);} if(process.stdin.isTTY&&/[\r\n]/.test(input))void run();});
process.stdin.on("end",()=>void run());
