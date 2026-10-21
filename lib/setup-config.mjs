export function validateSetup(value) {
  const fail = message => { throw new Error(message); };
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("Setup answers must be an object");
  const allowed = ["configured","ownerName","appName","timezone","calendarId","siteOrigin","schedule","sources","scan","workingHours"];
  if (Object.keys(value).some(k => !allowed.includes(k))) fail("Unexpected setup field; never supply credentials or tokens");
  for (const k of ["ownerName","appName","calendarId"]) if (typeof value[k] !== "string" || !value[k].trim() || value[k].length > 120) fail(`Invalid ${k}`);
  try { new Intl.DateTimeFormat("en",{timeZone:value.timezone}).format(); } catch { fail("Use a valid IANA timezone"); }
  if (!value.timezone) fail("Confirm timezone explicitly");
  if (value.siteOrigin !== null) {
    let url; try { url = new URL(value.siteOrigin); } catch { fail("Invalid Site origin"); }
    if (url.protocol !== "https:" || url.username || url.password || url.port || !url.hostname.endsWith(".chatgpt.site") || url.pathname !== "/" || url.search || url.hash) fail("Use the exact HTTPS Sites origin without a path, credentials or query");
    value.siteOrigin = url.origin;
  }
  const days = input => Array.isArray(input) && input.length > 0 && input.length <= 7 && new Set(input).size === input.length && input.every(n => Number.isInteger(n)&&n>=0&&n<=6);
  const s=value.schedule, h=value.workingHours, scan=value.scan;
  if (!s || Object.keys(s).some(k=>!["enabled","days","times"].includes(k)) || typeof s.enabled !== "boolean" || !days(s.days) || !Array.isArray(s.times) || s.times.length>4 || new Set(s.times).size!==s.times.length || s.times.some(t=>typeof t!=="string"||!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) || (s.enabled && !s.times.length)) fail("Schedule needs confirmed days and up to four HH:mm times; disabled is allowed");
  if (!h || !days(h.days) || !Number.isInteger(h.startHour) || !Number.isInteger(h.endHour) || h.startHour<0 || h.endHour>24 || h.startHour>=h.endHour) fail("Working hours need days and start/end whole hours within one day");
  if (!scan || !Number.isInteger(scan.maxLookbackHours) || scan.maxLookbackHours<1 || scan.maxLookbackHours>336 || !Number.isInteger(scan.initialLookbackHours) || scan.initialLookbackHours<1 || scan.initialLookbackHours>scan.maxLookbackHours || !Number.isInteger(scan.meetingLookbackDays) || scan.meetingLookbackDays<1 || scan.meetingLookbackDays>31 || !Number.isInteger(scan.calendarLookaheadDays) || scan.calendarLookaheadDays<1 || scan.calendarLookaheadDays>14) fail("Invalid bounded scan windows");
  if (s.enabled) {
    if(new Set(s.times.map(t=>t.slice(3))).size>1) fail("One hosted job supports times sharing the same minute; confirm an equivalent supported cadence, do not silently create extra runs");
    const points = s.days.flatMap(d=>s.times.map(t=>d*1440+Number(t.slice(0,2))*60+Number(t.slice(3)))).sort((a,b)=>a-b);
    const gap = Math.max(...points.map((n,i)=>(i===points.length-1?points[0]+10080:points[i+1])-n));
    if (scan.maxLookbackHours*60 < gap+70) fail("Scan cap must cover the longest scheduled gap plus 70 minutes for overlap/DST; increase the cap or run more often");
  }
  if (!value.sources || Object.keys(value.sources).sort().join()!=="calendar,email,meetings" || Object.values(value.sources).some(v=>typeof v!=="string"||!v.trim()||v.length>120)) fail("Explicitly describe all three sources, using unavailable when absent");
  return { ...value, configured:true };
}
