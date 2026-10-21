// Exercise recipient configuration without editing the distribution or provisioning anything.
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
const root=mkdtempSync(path.join(tmpdir(),"command-centre-setup-test-"));
for(const dir of ["lib","config","scripts",".openai"])mkdirSync(path.join(root,dir));
for(const file of ["lib/setup-config.mjs","lib/instance.mjs","lib/work-plan.mjs","config/instance.json","config/planning-policy.json","scripts/configure-instance.mjs","scripts/prepare-schedule.mjs"])copyFileSync(new URL("../"+file,import.meta.url),path.join(root,file));
const answers=JSON.parse(readFileSync(new URL("../setup/answers.example.json",import.meta.url),"utf8"));
answers.ownerName="Pilot user";answers.timezone="America/New_York";answers.calendarId="pilot-calendar";
answers.siteOrigin="https://example.chatgpt.site";answers.schedule.times=["07:00","13:00"];
writeFileSync(path.join(root,"answers.json"),JSON.stringify(answers));
writeFileSync(path.join(root,".openai/hosting.json"),JSON.stringify({project_id:"local-test-only"}));
const run=(script,args=[])=>spawnSync(process.execPath,[path.join(root,"scripts",script),...args],{cwd:root,encoding:"utf8"});
let result=run("configure-instance.mjs",["answers.json"]);assert.equal(result.status,0,result.stderr);
const instance=JSON.parse(readFileSync(path.join(root,"config/instance.json"),"utf8"));
const policy=JSON.parse(readFileSync(path.join(root,"config/planning-policy.json"),"utf8"));
assert.equal(instance.timezone,answers.timezone);assert.equal(policy.timezone,answers.timezone);
result=run("prepare-schedule.mjs");assert.equal(result.status,0,result.stderr);
const proposal=JSON.parse(result.stdout).task;
assert.equal(proposal.timezone,answers.timezone);assert.match(proposal.schedule,/BYHOUR=7,13/);assert.match(proposal.prompt,/pilot-calendar|Source selections/);
assert.match(proposal.prompt,/planning.playbook/);assert.match(proposal.prompt,/Never|No new Sites/);
answers.schedule.enabled=false;writeFileSync(path.join(root,"answers.json"),JSON.stringify(answers));
assert.equal(run("configure-instance.mjs",["answers.json"]).status,0);
assert.notEqual(run("prepare-schedule.mjs").status,0);
// Synthetic scratch retained in OS temp for diagnostics; contains no secrets or real data.
console.log("PASS: isolated recipient setup, alternate timezone/calendar, two daily times, schedule proposal and manual-only refusal");
