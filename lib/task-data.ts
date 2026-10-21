import "server-only";

import { getD1 } from "@/db";
import planningPolicy from "@/config/planning-policy.json";
import { briefingPlaybook } from "@/lib/briefing-playbook";
import { buildWorkPlan } from "@/lib/work-plan.mjs";
import type { PriorityFeedback } from "@/lib/task-types";
import type { BoardData, CommandState, Task, TaskExtra, TaskPriority, TaskStatus, TriageRun } from "@/lib/task-types";

type TaskRow = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_at: number | null;
  source_type: "manual" | "email" | "meeting";
  source_label: string | null;
  source_subject: string | null;
  source_message_id: string | null;
  source_thread_id: string | null;
  position: number;
  created_at: number;
  updated_at: number;
  completed_at: number | null;
  commitment_key: string | null;
  extra_json: string;
};

type TriageRow = {
  scanned_at: number;
  scanned_count: number;
  created_count: number;
  summary: string;
  status: string;
};

export function mapTask(row: TaskRow): Task {
  let extra: TaskExtra = {};
  try { extra = JSON.parse(row.extra_json || "{}"); } catch { /* Preserve readable legacy tasks. */ }
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueAt: row.due_at,
    sourceType: row.source_type,
    sourceLabel: row.source_label,
    sourceSubject: row.source_subject,
    sourceMessageId: row.source_message_id,
    sourceThreadId: row.source_thread_id,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    commitmentKey: row.commitment_key,
    extra,
  };
}

export async function loadTaskById(ownerId: string, id: string): Promise<Task | null> {
  const row = await getD1()
    .prepare(
      `SELECT id, title, description, status, priority, due_at, source_type,
        source_label, source_subject, source_message_id, source_thread_id,
        position, created_at, updated_at, completed_at, commitment_key, extra_json
      FROM tasks
      WHERE owner_id = ? AND id = ?
      LIMIT 1`,
    )
    .bind(ownerId, id)
    .first<TaskRow>();

  return row ? mapTask(row) : null;
}

function mapTriage(row: TriageRow): TriageRun {
  return {
    scannedAt: row.scanned_at,
    scannedCount: row.scanned_count,
    createdCount: row.created_count,
    summary: row.summary,
    status: row.status,
  };
}

export async function loadBoardData(ownerId: string): Promise<BoardData> {
  const db = getD1();
  const [taskResult, triageResult, commandResult, feedbackResult] = await Promise.all([
    db
      .prepare(
        `SELECT id, title, description, status, priority, due_at, source_type,
          source_label, source_subject, source_message_id, source_thread_id,
          position, created_at, updated_at, completed_at, commitment_key, extra_json
        FROM tasks
        WHERE owner_id = ?
        ORDER BY CASE status WHEN 'inbox' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
          position ASC, updated_at DESC`,
      )
      .bind(ownerId)
      .all<TaskRow>(),
    db
      .prepare(
        `SELECT scanned_at, scanned_count, created_count, summary, status
        FROM triage_runs
        WHERE owner_id = ?
        ORDER BY scanned_at DESC
        LIMIT 1`,
      )
      .bind(ownerId)
      .first<TriageRow>(),
    db.prepare("SELECT payload_json FROM command_state WHERE owner_id = ?").bind(ownerId).first<{ payload_json: string }>(),
    db.prepare("SELECT id, task_id AS taskId, project, title, from_priority AS fromPriority, to_priority AS toPriority, reason, created_at AS createdAt FROM priority_feedback WHERE owner_id = ? ORDER BY created_at DESC LIMIT 50").bind(ownerId).all<PriorityFeedback>(),
  ]);
  const tasks = taskResult.results.map(mapTask);
  const command = commandResult ? JSON.parse(commandResult.payload_json) as CommandState : null;
  return {
    tasks,
    lastTriageRun: triageResult ? mapTriage(triageResult) : null,
    command,
    planning: { policy: planningPolicy, playbook: briefingPlaybook, priorityFeedback: feedbackResult.results, plan: buildWorkPlan(tasks, command, planningPolicy) },
  };
}
