CREATE TABLE `priority_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`task_id` text NOT NULL,
	`project` text DEFAULT '' NOT NULL,
	`title` text NOT NULL,
	`from_priority` text NOT NULL,
	`to_priority` text NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_priority_feedback_owner_created` ON `priority_feedback` (`owner_id`,`created_at`);