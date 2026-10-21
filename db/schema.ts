import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    status: text("status").notNull().default("inbox"),
    priority: text("priority").notNull().default("medium"),
    dueAt: integer("due_at"),
    sourceType: text("source_type").notNull().default("manual"),
    sourceLabel: text("source_label"),
    sourceSubject: text("source_subject"),
    sourceMessageId: text("source_message_id"),
    sourceThreadId: text("source_thread_id"),
    sourceDedupKey: text("source_dedup_key"),
    position: integer("position").notNull().default(0),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    completedAt: integer("completed_at"),
    commitmentKey: text("commitment_key"),
    extraJson: text("extra_json").notNull().default("{}"),
  },
  (table) => [
    index("idx_tasks_owner_status").on(table.ownerId, table.status),
    index("idx_tasks_owner_due_at").on(table.ownerId, table.dueAt),
    uniqueIndex("idx_tasks_owner_source_dedup").on(table.ownerId, table.sourceDedupKey),
    uniqueIndex("idx_tasks_owner_commitment").on(table.ownerId, table.commitmentKey),
  ],
);

export const commandState = sqliteTable("command_state", {
  ownerId: text("owner_id").primaryKey(),
  payloadJson: text("payload_json").notNull().default("{}"),
  updatedAt: integer("updated_at").notNull(),
});

export const priorityFeedback = sqliteTable("priority_feedback", {
  id: text("id").primaryKey(), ownerId: text("owner_id").notNull(), taskId: text("task_id").notNull(),
  project: text("project").notNull().default(""), title: text("title").notNull(),
  fromPriority: text("from_priority").notNull(), toPriority: text("to_priority").notNull(),
  reason: text("reason").notNull().default(""), createdAt: integer("created_at").notNull(),
}, table => [index("idx_priority_feedback_owner_created").on(table.ownerId, table.createdAt)]);

export const triageRuns = sqliteTable(
  "triage_runs",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    scannedAt: integer("scanned_at").notNull(),
    scannedCount: integer("scanned_count").notNull().default(0),
    createdCount: integer("created_count").notNull().default(0),
    summary: text("summary").notNull().default(""),
    status: text("status").notNull().default("complete"),
  },
  (table) => [index("idx_triage_runs_owner_scanned_at").on(table.ownerId, table.scannedAt)],
);
