// Emits a NON-SECRET proposal only; never creates or changes a scheduled task.
import { readFileSync } from "node:fs";
import { instance, policy, scheduleLabel } from "../lib/instance.mjs";
import { validateSetup } from "../lib/setup-config.mjs";
import { localDate, localInstant } from "../lib/work-plan.mjs";
const hosting=JSON.parse(readFileSync(new URL("../.openai/hosting.json",import.meta.url),"utf8"));
validateSetup({...instance,workingHours:{days:policy.workingDays,startHour:policy.startHour,endHour:policy.endHour}});
if(!instance.configured || !hosting.project_id || !instance.siteOrigin)throw Error("Configure the recipient and persist its new Site ID/origin first");
if(!instance.schedule.enabled)throw Error("User selected manual-only; do not create a job");
const now=Date.now(), dates=[];
for(let n=0;n<9;n++){
  const date=new Date(Date.parse(localDate(now)+"T12:00:00Z")+n*86400000).toISOString().slice(0,10);
  if(!instance.schedule.days.includes(new Date(date+"T12:00:00Z").getUTCDay()))continue;
  for(const time of instance.schedule.times){const stamp=localInstant(date,Number(time.slice(0,2))*60+Number(time.slice(3)));if(stamp>now)dates.push({stamp,date,time});}
}
const next=dates.sort((a,b)=>a.stamp-b.stamp)[0];
const codes=["SU","MO","TU","WE","TH","FR","SA"];
const schedule=`BEGIN:VEVENT\nDTSTART;TZID=${instance.timezone}:${next.date.replaceAll("-","")}T${next.time.replace(":","")}00\nRRULE:FREQ=WEEKLY;BYDAY=${instance.schedule.days.map(d=>codes[d]).join(",")};BYHOUR=${instance.schedule.times.map(t=>Number(t.slice(0,2))).join(",")};BYMINUTE=${Number(next.time.slice(3))};BYSECOND=0\nEND:VEVENT`;
const prompt=`Refresh the owner's private command centre at ${instance.siteOrigin} (Site ${hosting.project_id}) using only this recipient's verified connected sources. First read the Site's list_tasks including planning.playbook, planning.policy, recent priorityFeedback, all task states and source cursors. Apply that current playbook; do not rely on old chat history. Source selections: ${JSON.stringify(instance.sources)}. If playbook or account identity cannot be verified, stop and notify; do not guess another account. Read-only email/calendar, no task execution. Prefer Wispr transcripts and the configured fallback. Use integrations first; bound retrieval, screen metadata, reuse unchanged sources and use the lightest reliable reasoning for routine work. Match commitments across sources and preserve edits/completed/dismissed decisions. Submit ONE atomic record_command_update_json with complete serialized JSON, exact calendar windowStart/windowEnd for success; read back the saved date, cursors, bounds and planning warning. If tools lag, use only this exact Site's supported private service endpoint and current credential obtained through Sites get_site after verifying owner-private access; credentials only in memory/hidden stdin, never files/arguments/logs. Keep complete JSON out of canonical TTY line truncation. Reconcile indeterminate writes before retries. No new Sites, key rotation, sharing changes, calendar bookings or email changes. Missing integrations stay unavailable; never report them fresh. Do not overlap runs. Stay quiet for routine or duplicate-only updates; notify only for new urgent work, connection/update failure or a required user decision. The board is the briefing. Configured preference: ${scheduleLabel()} in ${instance.timezone}; this prompt does not create scheduling.`;
console.log(JSON.stringify({task:{title:`${instance.appName} briefing`,prompt,schedule,timezone:instance.timezone}},null,2));
