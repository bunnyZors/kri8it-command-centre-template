import { NextResponse } from "next/server";
import { z } from "zod";
import { getD1 } from "@/db";
import { BOARD_OWNER_ID } from "@/lib/board-scope";
import { loadBoardData } from "@/lib/task-data";
import type { CommandState, Evidence, TaskExtra } from "@/lib/task-types";
import { instance } from "@/lib/instance.mjs";

const safeUrl = z.string().url().max(1500).refine((value) => new URL(value).protocol === "https:", "Use an HTTPS source link");
export const evidenceSchema = z.object({
  type: z.enum(["email", "meeting", "calendar"]), id: z.string().min(1).max(256),
  label: z.string().min(1).max(240), url: safeUrl.optional(), excerpt: z.string().max(400).optional(),
  sender: z.string().max(240).optional(), subject: z.string().max(500).optional(), threadId: z.string().max(256).optional(),
});
export const extraSchema = z.object({
  kind: z.enum(["action", "decision", "waiting"]).optional(), project: z.string().max(120).optional(),
  confidence: z.enum(["confirmed", "needs_confirmation"]).optional(), reviewReason: z.string().max(500).optional(),
  durationMinutes: z.number().int().min(5).max(480).nullable().optional(),
  suggestedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(), waitingOn: z.string().max(240).optional(),
  focusDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  sources: z.array(evidenceSchema).max(30).optional(),
});
const healthSchema = z.object({
  status: z.enum(["success", "error", "unavailable"]), checkedAt: z.number().int().positive(),
  through: z.number().int().positive().optional(), note: z.string().max(500),
  windowStart: z.string().datetime({ offset: true }).optional(), windowEnd: z.string().datetime({ offset: true }).optional(),
});
export const commandUpdateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), timezone: z.literal(instance.timezone), calendarId: z.literal(instance.calendarId),
  highlights: z.array(z.string().max(500)).max(6).default([]),
  events: z.array(z.object({
    id: z.string().min(1).max(256), title: z.string().min(1).max(240), start: z.string().max(40).refine(v => Number.isFinite(Date.parse(v)), "Invalid event start"), end: z.string().max(40).refine(v => Number.isFinite(Date.parse(v)), "Invalid event end"),
    url: safeUrl.optional(), preparation: z.string().max(500).optional(),
    notesStatus: z.enum(["available", "missing", "not_expected"]).optional(), busy: z.boolean(), allDay: z.boolean(),
  })).max(100),
  sources: z.object({ email: healthSchema.optional(), meetings: healthSchema.optional(), calendar: healthSchema.optional() }),
  tasks: z.array(z.object({
    existingTaskId: z.string().uuid().optional(), commitmentKey: z.string().min(1).max(240),
    title: z.string().trim().min(1).max(180), description: z.string().max(2000).default(""),
    priority: z.enum(["high", "medium", "low"]).default("medium"), dueAt: z.number().int().positive().nullable().default(null),
    state: z.enum(["inbox", "review", "waiting"]).default("inbox"), extra: extraSchema,
  })).max(100),
}).superRefine((value, ctx) => {
  if (value.sources.calendar?.status === "success" && (!value.sources.calendar.windowStart || !value.sources.calendar.windowEnd)) {
    ctx.addIssue({ code: "custom", path: ["sources", "calendar"], message: "A successful calendar check requires exact RFC3339 windowStart and windowEnd. If a cached tool schema omits these fields, use the private /api/command-centre POST fallback; do not drop coverage fields." });
  }
  for (const [index, item] of value.tasks.entries()) {
    if (!item.extra.sources?.length) ctx.addIssue({ code: "custom", path: ["tasks", index], message: "A commitment needs source evidence" });
    if (item.state !== "review" && item.extra.confidence !== "confirmed") ctx.addIssue({ code: "custom", path: ["tasks", index], message: "Only confirmed commitments enter the board" });
    if (item.state === "review" && !item.extra.reviewReason) ctx.addIssue({ code: "custom", path: ["tasks", index], message: "Explain what needs confirmation" });
  }
  for (const health of Object.values(value.sources)) {
    if (health && (health.checkedAt > Date.now() + 60000 || (health.through ?? 0) > Date.now() + 60000)) ctx.addIssue({ code: "custom", message: "Source check cannot be in the future" });
    if (health && (Boolean(health.windowStart) !== Boolean(health.windowEnd) || (health.windowStart && health.windowEnd && Date.parse(health.windowEnd) <= Date.parse(health.windowStart)))) ctx.addIssue({ code: "custom", message: "Source coverage needs a valid start and end" });
  }
  for (const event of value.events) {
    if (Date.parse(event.end) <= Date.parse(event.start)) ctx.addIssue({ code: "custom", message: "Event end must follow start" });
  }
});

export function mergeEvidence(existing: Evidence[] = [], incoming: Evidence[] = []) {
  return [...new Map([...existing, ...incoming].map((source) => [`${source.type}:${source.id}`, source])).values()].slice(-30);
}

export async function recordCommandUpdate(data: unknown) {
  const parsed = commandUpdateSchema.safeParse(data);
  if (!parsed.success) return NextResponse.json({ error: "Invalid command-centre update", details: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;
  const db = getD1();
  const board = await loadBoardData(BOARD_OWNER_ID);
  const now = Date.now();
  const statements = [];
  let createdCount = 0;
  let linkedCount = 0;
  const known = new Map(board.tasks.filter(t => t.commitmentKey).map(t => [t.commitmentKey!, t]));
  for (const item of input.tasks) {
    const existing = item.existingTaskId ? board.tasks.find(t => t.id === item.existingTaskId) : known.get(item.commitmentKey);
    if (item.existingTaskId && !existing) return NextResponse.json({ error: "Referenced task was not found; refresh the board and retry." }, { status: 409 });
    // Attach evidence without overwriting manual edits, changing status or reopening completed/dismissed work.
    if (existing) {
      const extra: TaskExtra = { ...item.extra, ...existing.extra, sources: mergeEvidence(existing.extra.sources, item.extra.sources) };
      statements.push(db.prepare("UPDATE tasks SET extra_json = ?, commitment_key = COALESCE(commitment_key, ?), updated_at = ? WHERE owner_id = ? AND id = ?")
        .bind(JSON.stringify(extra), item.commitmentKey, now, BOARD_OWNER_ID, existing.id));
      existing.extra = extra;
      existing.commitmentKey ??= item.commitmentKey;
      known.set(item.commitmentKey, existing);
      linkedCount++;
      continue;
    }
    const id = crypto.randomUUID();
    const first = item.extra.sources![0];
    statements.push(db.prepare(`INSERT INTO tasks (id, owner_id, title, description, status, priority, due_at, source_type,
      source_label, source_subject, source_message_id, source_thread_id, source_dedup_key, position, created_at, updated_at, commitment_key, extra_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, BOARD_OWNER_ID, item.title, item.description, item.state, item.priority, item.dueAt,
        first.type === "meeting" ? "meeting" : "email", first.sender ?? first.label, first.subject ?? first.label, first.id, first.threadId ?? null,
        first.type === "email" ? `${first.id}:${item.title.toLowerCase().replace(/\s+/g, " ").trim()}` : null,
        board.tasks.length + createdCount, now, now, item.commitmentKey, JSON.stringify(item.extra)));
    known.set(item.commitmentKey, { id, commitmentKey: item.commitmentKey, extra: item.extra } as typeof board.tasks[number]);
    createdCount++;
  }
  const sources = { ...board.command?.sources };
  for (const [key, value] of Object.entries(input.sources)) {
    const sourceKey = key as keyof typeof sources;
    sources[sourceKey] = { ...value, through: value.status === "success" ? Math.max(value.through ?? 0, sources[sourceKey]?.through ?? 0) || undefined : sources[sourceKey]?.through };
  }
  const state: CommandState = {
    date: input.date, timezone: instance.timezone, calendarId: instance.calendarId, highlights: input.highlights,
    events: input.sources.calendar?.status === "success" ? input.events.map(event => ({
      ...event,
      // Google working locations can arrive as floating midnight-to-midnight
      // strings rather than date-only values. Do not display them as 00:00 calls.
      allDay: event.allDay || (/^\d{4}-\d{2}-\d{2}(T00:00(:00)?)?$/.test(event.start) &&
        /^\d{4}-\d{2}-\d{2}(T00:00(:00)?)?$/.test(event.end)),
    })) : board.command?.events ?? [],
    sources, updatedAt: now,
  };
  statements.push(db.prepare("INSERT INTO command_state (owner_id, payload_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(owner_id) DO UPDATE SET payload_json = excluded.payload_json, updated_at = excluded.updated_at")
    .bind(BOARD_OWNER_ID, JSON.stringify(state), now));
  // D1 batch is atomic: a failed record must not advance any source cursor.
  await db.batch(statements);
  return NextResponse.json({ createdCount, linkedCount, updatedAt: now });
}
