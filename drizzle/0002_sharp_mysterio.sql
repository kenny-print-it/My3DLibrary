CREATE TABLE `trashed_models` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`model_id` integer NOT NULL,
	`model_name` text NOT NULL,
	`original_folder_path` text NOT NULL,
	`trash_folder_path` text NOT NULL,
	`category_id` integer,
	`category_name` text,
	`file_count` integer DEFAULT 0 NOT NULL,
	`image_count` integer DEFAULT 0 NOT NULL,
	`deleted_at` integer DEFAULT (unixepoch('now') * 1000) NOT NULL
);
