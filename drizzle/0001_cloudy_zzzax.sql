CREATE TABLE `trashed_files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`model_id` integer NOT NULL,
	`model_name` text NOT NULL,
	`file_type` text NOT NULL,
	`file_id` text NOT NULL,
	`original_name` text NOT NULL,
	`original_abs_path` text NOT NULL,
	`trash_abs_path` text NOT NULL,
	`deleted_at` integer DEFAULT (unixepoch('now') * 1000) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `library_paths` ADD `scanDepth` integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE `models` ADD `printSettings` text;--> statement-breakpoint
ALTER TABLE `models` ADD `sourceUrl` text;