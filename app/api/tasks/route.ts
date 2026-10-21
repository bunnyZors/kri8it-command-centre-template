import { NextResponse } from "next/server";
import { z } from "zod";

import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getD1 } from "@/db";
import { loadBoardData, loadTaskById } from "@/lib/task-data";
import { BOARD_OWNER_ID } from "@/lib/board-scope";
import { extraSchema } from "@/lib/command-update";

const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(2000).default(""),
  status: z.enum(["inbox", "in_progress", "waiting", "review", "done"]).default("inbox"),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  dueAt: z.number().int().positive().nullable().default(null),
  sourceType: z.enum(["manual", "email"]).default("manual"),
  sourceLabel: z.string().trim().max(240).nullable().default(null),
  sourceSubject: z.string().trim().max(500).nullable().default(null),
  sourceMessageId: z.string().trim().max(256).nullable().default(null),
  sourceThreadId: z.string().trim().max(256).nullable().default(null),
  extra: extraSchema.default({}),
});

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  return NextResponse.json(await loadBoardData(BOARD_OWNER_ID));
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const parsed = createTaskSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the task details and try again." }, { status: 400 });
  }

  const task = parsed.data;
  const now = Date.now();
  const id = crypto.randomUUID();
  const db = getD1();
  const positionRow = await db
    .prepare("SELECT COALESCE(MAX(position), -1) + 1 AS next_position FROM tasks WHERE owner_id = ? AND status = ?")
    .bind(BOARD_OWNER_ID, task.status)
    .first<{ next_position: number }>();

  await db
    .prepare(
      `INSERT INTO tasks (
        id, owner_id, title, description, status, priority, due_at,
        source_type, source_label, source_subject, source_message_id,
        source_thread_id, source_dedup_key, position, created_at, updated_at, completed_at, extra_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      BOARD_OWNER_ID,
      task.title,
      task.description,
      task.status,
      task.priority,
      task.dueAt,
      task.sourceType,
      task.sourceLabel,
      task.sourceSubject,
      task.sourceMessageId,
      task.sourceThreadId,
      task.sourceMessageId ? `${task.sourceMessageId}:${task.title.toLowerCase()}` : null,
      positionRow?.next_position ?? 0,
      now,
      now,
      task.status === "done" ? now : null,
      JSON.stringify(task.extra),
    )
    .run();

  return NextResponse.json({ task: await loadTaskById(BOARD_OWNER_ID, id) }, { status: 201 });
}
