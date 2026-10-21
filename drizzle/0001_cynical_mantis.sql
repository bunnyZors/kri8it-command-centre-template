CREATE TABLE `command_state` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `tasks` ADD `commitment_key` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `extra_json` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_tasks_owner_commitment` ON `tasks` (`owner_id`,`commitment_key`);