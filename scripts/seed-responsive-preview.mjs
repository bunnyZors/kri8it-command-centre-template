// Synthetic local-only fixture for the mobile/desktop acceptance checklist.
// Fixed loopback origin: never use this against the owner-private production board.
import { localInstant } from "../lib/work-plan.mjs";
const origin = "http://localhost:5173";
const headers = { "Content-Type": "application/json", Cookie: "__sites_local_auth=1" };
async function request(path, method = "GET", data) {
  const response = await fetch(origin + path, { method, headers, ...(data ? { body: JSON.stringify(data) } : {}) });
  const result = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(result));
  return result;
}
const now = Date.now();
const date = new Intl.DateTimeFormat("en-CA", { timeZone:"Europe/Dublin", year:"numeric",month:"2-digit",day:"2-digit" }).format(now);
const tomorrow = new Date(Date.parse(date+"T12:00:00Z")+86400000).toISOString().slice(0,10);
const instant = minutes => new Date(localInstant(date, minutes)).toISOString();
const titles = ["Review the client delivery plan and confirm the next milestone", "Prepare the recurring-revenue proposal", "Agree the website review with the delivery team", "Wait for the approved artwork", "Verify the finished handover", "Confirm who owns the shared follow-up"];
const board = await request("/api/command-centre");
const tasks = titles.map((title,i)=>({commitmentKey:`responsive-preview:${i}`, ...(board.tasks.find(t=>t.commitmentKey===`responsive-preview:${i}`)?{existingTaskId:board.tasks.find(t=>t.commitmentKey===`responsive-preview:${i}`).id}:{}),title,
  description:"Synthetic preview only. This deliberately longer description checks wrapping and readability on a narrow phone, including an unbroken-reference-ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789. The full task remains available in the editor.",
  priority:i<2?"high":"medium",state:i===3?"waiting":i===5?"review":"inbox",
  extra:{project:"Preview project",durationMinutes:30,confidence:i===5?"needs_confirmation":"confirmed",...(i===5?{reviewReason:"Shared ownership needs a decision; do not infer a personal commitment."}:{}),...(i===3?{waitingOn:"Approved artwork from the design team"}:{}),sources:[{type:"meeting",id:`preview-${i}`,label:"Synthetic local meeting",excerpt:"Local QA evidence only, not a real commitment."}]}}));
await request("/api/command-centre","POST",{date,timezone:"Europe/Dublin",calendarId:"primary",tasks,
  highlights:["The client needs a response before Friday; confirm scope before committing to delivery.","Tomorrow is meeting-heavy. Review the proposal before the morning call.","The design handover is waiting on approved artwork, not on a new task for you.","One meeting has no readable recording. Missing notes are a coverage gap, not evidence of no actions.","No calendar events have been created. Suggested blocks require approval before booking.","The last scan excluded newsletters and duplicate messages; existing task edits are preserved."],
  events:[{id:"preview-location",title:"Home",start:date,end:tomorrow,allDay:true,busy:false},{id:"preview-meeting",title:"Client planning review and next-quarter delivery discussion",start:instant(540),end:instant(585),allDay:false,busy:true,notesStatus:"missing",url:"https://calendar.google.com/"}],
  sources:{email:{status:"success",checkedAt:now,note:"Synthetic local scan"},meetings:{status:"success",checkedAt:now,note:"Synthetic local notes"},calendar:{status:"success",checkedAt:now,note:"Synthetic local calendar",windowStart:instant(0),windowEnd:new Date(now+7*86400000).toISOString()}}});
const seeded = await request("/api/command-centre");
for(const [i,status] of [[2,"in_progress"],[4,"done"]]) {
  const task=seeded.tasks.find(t=>t.commitmentKey===`responsive-preview:${i}`);
  await request(`/api/tasks/${task.id}`,"PATCH",{status});
}
console.log("PASS: synthetic local responsive fixture ready (all four columns, review, six briefing notes, long text and agenda)");
