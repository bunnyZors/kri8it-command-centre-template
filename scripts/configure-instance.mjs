// Run only in the recipient's copy. Input contains preferences, NEVER credentials.
import { readFileSync, writeFileSync } from "node:fs";
import { validateSetup } from "../lib/setup-config.mjs";
if (process.argv.length!==3) throw new Error("Usage: node scripts/configure-instance.mjs <answers.json>");
const answer=validateSetup(JSON.parse(readFileSync(process.argv[2],"utf8")));
const {workingHours,...instance}=answer;
const policyPath=new URL("../config/planning-policy.json",import.meta.url);
const policy=JSON.parse(readFileSync(policyPath,"utf8"));
// Validate everything before either write. Reruns preserve any confirmed client rules.
writeFileSync(new URL("../config/instance.json",import.meta.url),JSON.stringify(instance,null,2)+"\n");
writeFileSync(policyPath,JSON.stringify({...policy,timezone:instance.timezone,workingDays:workingHours.days,startHour:workingHours.startHour,endHour:workingHours.endHour},null,2)+"\n");
console.log("Configured recipient preferences; no Site created, account connected or schedule activated.");
