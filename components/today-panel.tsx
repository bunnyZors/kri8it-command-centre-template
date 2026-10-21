"use client";

import { CalendarDays, Check, ChevronDown, ExternalLink, NotebookText, Pin, RefreshCw } from "lucide-react";
import type { CommandState, PlanningContext, Task } from "@/lib/task-types";
import { buildWorkPlan, priorityCandidates } from "@/lib/work-plan.mjs";
import { instance, hoursLabel } from "@/lib/instance.mjs";

export function dublinDate(timestamp = Date.now()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: instance.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(timestamp);
}
const clock = (date: string) => new Intl.DateTimeFormat("en-IE", { timeZone: instance.timezone, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(date));

// Intent: The owner between calls, choosing what matters next. Preserve the existing
// graphite surfaces, Kri8it turquoise focus, amber uncertainty and quiet borders.
// Suggestion rows retain the board's Inter hierarchy and 4px spacing scale:
// time first, one outcome next, quiet provenance underneath. Surface separation
// (not extra cards/shadows) keeps a founder between calls focused on choosing work.
export function TodayPanel({ tasks, command, planning, onEdit, onUpdate, onRefresh, refreshing }: {
  tasks: Task[]; command: CommandState | null; planning: PlanningContext; onEdit: (task: Task) => void;
  onUpdate: (task: Task, changes: object) => Promise<void>; onRefresh: () => Promise<void>; refreshing: boolean;
}) {
  const today = dublinDate();
  const eligible = tasks.filter(t => ["inbox", "in_progress"].includes(t.status));
  const priorities: Task[] = priorityCandidates(tasks, Date.now(), planning.policy.clientRules).slice(0, 3);
  const plan = buildWorkPlan(tasks, command, planning.policy);
  const reviews = tasks.filter(t => t.status === "review");
  const events = (command?.events ?? []).filter(e => (e.allDay ? e.start.slice(0, 10) : dublinDate(Date.parse(e.start))) === today);
  const agendaFresh = command?.date === today && command.sources.calendar?.status === "success" && Date.now() - command.sources.calendar.checkedAt < 18 * 3600000;
  const overdue = eligible.filter(t => t.dueAt && dublinDate(t.dueAt) < today).length;

  // Intent: The owner skimming on a phone between calls. Graphite/slate surfaces and
  // quiet borders separate actions from context; turquoise marks priority numbers.
  // Keep Inter type and the 4px rhythm, with 44px touch controls.
  const highlights = command?.date === today ? command.highlights : [];
  return <section className="today-panel" id="daily-focus" aria-label="Daily briefing">
    <div className="today-heading">
      <div><p className="eyebrow">A little clarity before the next thing</p><h2>Your day, in focus</h2><p>{new Intl.DateTimeFormat("en-IE", { timeZone: instance.timezone, weekday: "long", day: "numeric", month: "long" }).format(new Date())} · {instance.timezone} · {instance.calendarId} calendar</p></div>
      <button className="quiet-button" aria-label={refreshing ? "Refreshing board" : "Refresh board"} onClick={() => void onRefresh()} disabled={refreshing}><RefreshCw aria-hidden="true" /><span>{refreshing ? "Refreshing…" : "Refresh board"}</span></button>
    </div>
    <div className="source-health" aria-label="Source freshness">
      {(["email", "meetings", "calendar"] as const).map(key => {
        const health = command?.sources[key];
        const stale = !health || Date.now() - health.checkedAt > 18 * 3600000;
        return <span key={key} className={`health ${!stale && health?.status === "success" ? "healthy" : "attention"}`} title={health?.note ?? "Not checked yet"}>
          <i />{key === "meetings" ? "Meeting notes" : key[0].toUpperCase() + key.slice(1)}: {health ? `${health.status === "success" ? stale ? "stale" : "checked" : health.status} ${new Intl.DateTimeFormat("en-IE", { timeZone: instance.timezone, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(health.checkedAt)}` : "not checked"}
        </span>;
      })}
    </div>
    <div className="today-grid">
      <div className="today-priorities">
        <div className="panel-label"><span>Start here</span><small>Up to three priorities · click to edit</small></div>
        {priorities.map((task, index) => <div className="priority-row" key={task.id}>
          <span className="priority-number">0{index + 1}</span>
          <button className="priority-copy" onClick={() => onEdit(task)}><strong>{task.title}</strong><small>{task.extra.project || task.extra.kind || "Action"}{task.extra.durationMinutes ? ` · ~${task.extra.durationMinutes} min estimate` : ""}{task.dueAt ? ` · Due ${dublinDate(task.dueAt)}` : ""}</small></button>
          <button className={`focus-pin ${task.extra.focusDate === today ? "selected" : ""}`} aria-label={`${task.extra.focusDate === today ? "Unpin" : "Pin"} ${task.title} for today`} onClick={() => void onUpdate(task, { extra: { focusDate: task.extra.focusDate === today ? null : today } })}><Pin /></button>
        </div>)}
        {!priorities.length && <p className="panel-empty">No confirmed actions waiting. Capture a task or let the next briefing bring them in.</p>}
        {overdue > 0 && <p className="briefing-note">{overdue} overdue {overdue === 1 ? "commitment needs" : "commitments need"} a decision: do it, renegotiate it, or close it.</p>}
      </div>
      <div className="today-agenda">
        <div className="panel-label"><span><CalendarDays aria-hidden="true" /> Today&apos;s agenda</span><small>Calendar is read-only</small></div>
        {!agendaFresh && <p className="briefing-note">{command ? "Calendar snapshot needs a fresh check. The next briefing will update it." : "Waiting for the first calendar briefing."}</p>}
        {events.map(event => <article className={`agenda-item ${!event.busy ? "non-blocking" : ""}`} key={event.id}>
          <div className="agenda-time">{event.allDay ? "All day" : `${clock(event.start)}–${clock(event.end)}`}{!event.busy && <small>Doesn&apos;t block time</small>}</div>
          <div><strong>{event.title}</strong>{event.preparation && <p>{event.preparation}</p>}{event.notesStatus === "missing" && <small>Recording / notes not found</small>}</div>
          {event.url && <a href={event.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${event.title} in Calendar`}><ExternalLink /></a>}
        </article>)}
        {agendaFresh && !events.length && <p className="panel-empty">No events found on your primary calendar today. That doesn&apos;t rule out unrecorded commitments.</p>}
      </div>
    </div>
    {highlights.length > 0 && <details className="briefing-digest">
      <summary>
        <span className="digest-icon"><NotebookText aria-hidden="true" /></span>
        <span className="digest-heading"><strong>Briefing notes <span className="count">{highlights.length}</span></strong><small>Wider context from email, meetings and calendar—not notes on the priorities above.</small></span>
        <ChevronDown className="disclosure-chevron" aria-hidden="true" />
      </summary>
      <ul className="digest-notes">{highlights.map((text, i) => <li key={i}>{text}</li>)}</ul>
    </details>}
    <div className="work-suggestions" aria-label="Suggested time blocks">
      <div className="panel-label"><span>Room to make progress</span><small>{hoursLabel()}</small></div>
      <p className="briefing-note">Nothing here is booked. Calendar changes always need your approval; availability must be checked again before booking.</p>
      {plan.warning && <p className="briefing-note">{plan.warning}</p>}
      {plan.blocks.map(block => <button className="work-block" key={block.taskId} onClick={() => { const task = tasks.find(t => t.id === block.taskId); if (task) onEdit(task); }}>
        <span className="block-time">{new Intl.DateTimeFormat("en-IE", { timeZone: instance.timezone, weekday: "short", day: "numeric", month: "short" }).format(new Date(block.start))}<strong>{clock(block.start)}–{clock(block.end)}</strong></span>
        <span><strong>{block.title}</strong><small>{block.reason} · ~{block.minutes} min estimate{block.remainingMinutes ? ` · first block, ~${block.remainingMinutes} min remaining` : ""}</small></span>
      </button>)}
      {plan.unplaced.length > 0 && <p className="briefing-note">{plan.unplaced.length} priorities need more space than the checked calendar gaps allow. Adjust the effort estimate or choose what to defer.</p>}
      {!plan.warning && !plan.blocks.length && !plan.unplaced.length && <p className="panel-empty">No confirmed work needs a suggested block.</p>}
      <details className="planning-context"><summary>How priorities improve over time</summary><p>Use “Why this priority?” when editing a task. Corrections and their reasons are available to future briefings. Client importance stays unranked until you confirm it; the project decision record holds standing rules.</p>
        <p>Initial priority group: {planning.policy.clientRules.map(rule => rule.client).join(" · ") || "not yet confirmed"}. This is a tie-breaker, not a strict order or permission to ignore urgent risks. Fuller agency framework pending.</p>
        {planning.priorityFeedback.slice(0, 3).map(item => <p key={item.id}>{item.project || "Task correction"}: {item.fromPriority} → {item.toPriority}{item.reason ? ` · ${item.reason}` : " · reason not supplied"}</p>)}
      </details>
    </div>
    {reviews.length > 0 && <div className="review-queue">
      <div className="panel-label"><span>Needs your confirmation <b>{reviews.length}</b></span><small>These are not confirmed commitments</small></div>
      {reviews.map(task => <article className="review-item" key={task.id}>
        <button className="priority-copy" onClick={() => onEdit(task)}><strong>{task.title}</strong><p>{task.extra.reviewReason || "Ownership needs checking."}</p></button>
        <div className="review-actions"><button className="secondary-button" onClick={() => void onUpdate(task, { status: "dismissed" })}>Not mine</button><button className="primary-button" onClick={() => void onUpdate(task, { status: "inbox", extra: { confidence: "confirmed", reviewReason: "" } })}><Check /> Mine</button></div>
      </article>)}
    </div>}
  </section>;
}
