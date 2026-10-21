import { NextResponse } from "next/server";
import { z } from "zod";

import { BOARD_OWNER_ID } from "@/lib/board-scope";
import { getD1 } from "@/db";

export const emailTaskSchema = z.object({
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(2000).default(""),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  dueAt: z.number().int().positive().nullable().default(null),
  sender: z.string().trim().max(240),
  subject: z.string().trim().max(500),
  messageId: z.string().trim().min(1).max(256),
  threadId: z.string().trim().max(256).nullable().default(null),
});

export const triageSchema = z.object({
  tasks: z.array(emailTaskSchema).max(50),
  scannedCount: z.number().int().min(0).max(1000),
  summary: z.string().trim().max(1000).default(""),
});

function dedupKey(messageId: string, title: string) {
  return `${messageId}:${title.toLowerCase().replace(/\s+/g, " ").trim()}`;
}

export async function recordEmailTriage(data: unknown) {
  const parsed = triageSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json({ error: "The triage payload is invalid." }, { status: 400 });
  }

  const db = getD1();
  const now = Date.now();
  const items = parsed.data.tasks;
  const keys = items.map((task) => dedupKey(task.messageId, task.title));
  const checks = keys.map((key) =>
    db
      .prepare("SELECT 1 AS found FROM tasks WHERE owner_id = ? AND source_dedup_key = ? LIMIT 1")
      .bind(BOARD_OWNER_ID, key),
  );
  const existing = checks.length ? await db.batch(checks) : [];
  const newItems = items.filter((_, index) => !existing[index]?.results?.length);

  if (newItems.length) {
    const basePosition = await db
      .prepare("SELECT COALESCE(MAX(position), -1) + 1 AS next_position FROM tasks WHERE owner_id = ? AND status = 'inbox'")
      .bind(BOARD_OWNER_ID)
      .first<{ next_position: number }>();

    const inserts = newItems.map((task, index) =>
      db
        .prepare(
          `INSERT OR IGNORE INTO tasks (
            id, owner_id, title, description, status, priority, due_at,
            source_type, source_label, source_subject, source_message_id,
            source_thread_id, source_dedup_key, position, created_at, updated_at
          ) VALUES (?, ?, ?, ?, 'inbox', ?, ?, 'email', ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          crypto.randomUUID(),
          BOARD_OWNER_ID,
          task.title,
          task.description,
          task.priority,
          task.dueAt,
          task.sender,
          task.subject,
          task.messageId,
          task.threadId,
          dedupKey(task.messageId, task.title),
          (basePosition?.next_position ?? 0) + index,
          now,
          now,
        ),
    );
    await db.batch(inserts);
  }

  await db
    .prepare(
      `INSERT INTO triage_runs (
        id, owner_id, scanned_at, scanned_count, created_count, summary, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'complete')`,
    )
    .bind(
      crypto.randomUUID(),
      BOARD_OWNER_ID,
      now,
      parsed.data.scannedCount,
      newItems.length,
      parsed.data.summary,
    )
    .run();

  return NextResponse.json({
    createdCount: newItems.length,
    duplicateCount: items.length - newItems.length,
    scannedAt: now,
  });
}
