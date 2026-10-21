CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'inbox' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`due_at` integer,
	`source_type` text DEFAULT 'manual' NOT NULL,
	`source_label` text,
	`source_subject` text,
	`source_message_id` text,
	`source_thread_id` text,
	`source_dedup_key` text,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`completed_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_tasks_owner_status` ON `tasks` (`owner_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_tasks_owner_due_at` ON `tasks` (`owner_id`,`due_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_tasks_owner_source_dedup` ON `tasks` (`owner_id`,`source_dedup_key`);--> statement-breakpoint
CREATE TABLE `triage_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`scanned_at` integer NOT NULL,
	`scanned_count` integer DEFAULT 0 NOT NULL,
	`created_count` integer DEFAULT 0 NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'complete' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_triage_runs_owner_scanned_at` ON `triage_runs` (`owner_id`,`scanned_at`);--> statement-breakpoint
PRAGMA optimize;
