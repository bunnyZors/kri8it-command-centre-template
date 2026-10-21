import { NextResponse } from "next/server";
import { z } from "zod";

import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getD1 } from "@/db";
import { loadTaskById } from "@/lib/task-data";
import { BOARD_OWNER_ID } from "@/lib/board-scope";
import { extraSchema } from "@/lib/command-update";

const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(180),
    description: z.string().trim().max(2000),
    status: z.enum(["inbox", "in_progress", "waiting", "review", "done", "dismissed"]),
    priority: z.enum(["high", "medium", "low"]),
    dueAt: z.number().int().positive().nullable(),
    position: z.number().int().min(0),
    extra: extraSchema,
    priorityReason: z.string().trim().max(500),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "No changes supplied");

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const parsed = updateTaskSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the task details and try again." }, { status: 400 });
  }

  const { id } = await params;
  const current = await loadTaskById(BOARD_OWNER_ID, id);
  if (!current) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const next = { ...current, ...parsed.data };
  const now = Date.now();
  const completedAt =
    next.status === "done" ? current.completedAt ?? now : null;

  const db = getD1();
  const update = db
    .prepare(
      `UPDATE tasks
      SET title = ?, description = ?, status = ?, priority = ?, due_at = ?,
        position = ?, updated_at = ?, completed_at = ?, extra_json = ?
      WHERE owner_id = ? AND id = ?`,
    )
    .bind(
      next.title,
      next.description,
      next.status,
      next.priority,
      next.dueAt,
      next.position,
      now,
      completedAt,
      JSON.stringify({ ...current.extra, ...parsed.data.extra }),
      BOARD_OWNER_ID,
      id,
    );
  const statements = [update];
  if (next.priority !== current.priority || parsed.data.priorityReason) {
    statements.push(db.prepare("INSERT INTO priority_feedback (id, owner_id, task_id, project, title, from_priority, to_priority, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), BOARD_OWNER_ID, id, parsed.data.extra?.project ?? current.extra.project ?? "", next.title, current.priority, next.priority, parsed.data.priorityReason ?? "", now));
  }
  await db.batch(statements);

  return NextResponse.json({ task: await loadTaskById(BOARD_OWNER_ID, id) });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { id } = await params;
  const result = await getD1()
    .prepare("DELETE FROM tasks WHERE owner_id = ? AND id = ?")
    .bind(BOARD_OWNER_ID, id)
    .run();

  if (!result.meta.changes) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
