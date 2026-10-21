// Pure suggestion engine: no Google APIs, booking side effects or calendar writes.
const MINUTE = 60000;
import { instance } from "./instance.mjs";
export const localDate = (timestamp = Date.now(), timeZone = instance.timezone) => new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(timestamp);
export function localInstant(date, minuteOfDay, timeZone = instance.timezone) {
  const guess = Date.parse(`${date}T00:00:00Z`) + minuteOfDay * MINUTE;
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(guess);
  const p = Object.fromEntries(parts.map(v => [v.type, v.value]));
  const displayed = Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);
  return guess - (displayed - guess);
}
export function priorityCandidates(tasks, now = Date.now(), clientRules = []) {
  const today = localDate(now), rank = { high: 0, medium: 1, low: 2 };
  const clientRanks = new Map(clientRules.filter(r => r.confidence === "confirmed" && r.scope === "client" && r.sourceRef && Number.isInteger(r.rank)).flatMap(r => [r.client, ...(r.aliases ?? [])].map(name => [name.trim().toLowerCase(), r.rank])));
  const clientRank = task => clientRanks.get((task.extra?.project ?? "").trim().toLowerCase()) ?? 999;
  return tasks.filter(t => ["inbox", "in_progress"].includes(t.status) && t.extra?.confidence !== "needs_confirmation")
    .sort((a, b) => Number(b.extra?.focusDate === today) - Number(a.extra?.focusDate === today) ||
      Number(Boolean(b.dueAt && localDate(b.dueAt) <= today)) - Number(Boolean(a.dueAt && localDate(a.dueAt) <= today)) ||
      rank[a.priority] - rank[b.priority] || clientRank(a) - clientRank(b) || Number(b.status === "in_progress") - Number(a.status === "in_progress") || a.position - b.position);
}
/** @returns {{blocks: Array<{taskId:string,title:string,start:string,end:string,minutes:number,estimated:boolean,remainingMinutes:number,reason:string,calendarAction:string}>, unplaced:Array<{taskId:string,title:string,reason:string}>,generatedAt:number,calendarCheckedAt:number|null,warning:string|null}} */
export function buildWorkPlan(tasks, command, policy, now = Date.now()) {
  /** @type {ReturnType<typeof buildWorkPlan>} */
  const result = { blocks: [], unplaced: [], generatedAt: now, calendarCheckedAt: command?.sources?.calendar?.checkedAt ?? null, warning: null };
  const health = command?.sources?.calendar;
  if (!health || health.status !== "success" || now - health.checkedAt > 18 * 3600000 || health.checkedAt > now + MINUTE) {
    return { ...result, warning: "A fresh, successful primary-calendar check is needed before suggesting time blocks." };
  }
  const coverageStart = Date.parse(health.windowStart ?? ""), coverageEnd = Date.parse(health.windowEnd ?? "");
  if (!Number.isFinite(coverageStart) || !Number.isFinite(coverageEnd) || coverageEnd <= coverageStart) {
    return { ...result, warning: "Waiting for a calendar briefing with a verified scan window. No availability is assumed." };
  }
  const candidates = priorityCandidates(tasks, now, policy.clientRules).slice(0, policy.maxSuggestions);
  const reserved = [];
  for (const task of candidates) {
    const estimate = task.extra?.durationMinutes ?? policy.defaultDurationMinutes;
    const minutes = Math.min(estimate, policy.maxBlockMinutes);
    let placed = false;
    for (let offset = 0; offset < 8 && !placed; offset++) {
      const date = new Date(Date.parse(`${localDate(now)}T12:00:00Z`) + offset * 86400000).toISOString().slice(0, 10);
      if (!policy.workingDays.includes(new Date(`${date}T12:00:00Z`).getUTCDay())) continue;
      const dayStart = localInstant(date, policy.startHour * 60), dayEnd = localInstant(date, policy.endHour * 60);
      let cursor = Math.max(dayStart, Math.ceil(now / (5 * MINUTE)) * 5 * MINUTE, coverageStart);
      const end = Math.min(dayEnd, coverageEnd);
      const busy = command.events.filter(e => e.busy).map(e => {
        const start = e.allDay ? localInstant(e.start.slice(0, 10), 0) : Date.parse(e.start);
        const finish = e.allDay ? localInstant(e.end.slice(0, 10), 0) : Date.parse(e.end);
        return [start - policy.meetingBufferMinutes * MINUTE, finish + policy.meetingBufferMinutes * MINUTE];
      }).concat(reserved).filter(([start, finish]) => finish > cursor && start < end).sort((a, b) => a[0] - b[0]);
      for (const [start, finish] of [...busy, [end, end]]) {
        if (cursor + minutes * MINUTE <= Math.min(start, end)) {
          const finishAt = cursor + minutes * MINUTE;
          result.blocks.push({ taskId: task.id, title: task.title, start: new Date(cursor).toISOString(), end: new Date(finishAt).toISOString(), minutes,
            estimated: true, remainingMinutes: Math.max(0, estimate - minutes), reason: task.extra?.focusDate === localDate(now) ? "Pinned by you" : task.dueAt && localDate(task.dueAt) <= localDate(now) ? "Explicit deadline due/overdue" : `${task.priority} priority`, calendarAction: "none" });
          reserved.push([cursor, finishAt + policy.breakMinutes * MINUTE]); placed = true; break;
        }
        cursor = Math.max(cursor, finish);
      }
    }
    if (!placed) result.unplaced.push({ taskId: task.id, title: task.title, reason: "No suitable gap inside the checked window and weekday working hours." });
  }
  return result;
}
