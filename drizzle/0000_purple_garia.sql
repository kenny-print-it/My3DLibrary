CREATE TABLE `access_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`openId` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`preAdded` integer DEFAULT false NOT NULL,
	`requestedAt` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,
	`reviewedAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `access_requests_email_unique` ON `access_requests` (`email`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`driveId` text,
	`name` text NOT NULL,
	`customLabel` text,
	`parentDriveId` text,
	`path` text,
	`sortOrder` integer DEFAULT 0 NOT NULL,
	`createdAt` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch('now') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_driveId_unique` ON `categories` (`driveId`);--> statement-breakpoint
CREATE TABLE `library_paths` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`path` text NOT NULL,
	`label` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`sortOrder` integer DEFAULT 0 NOT NULL,
	`createdAt` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch('now') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `model_tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`modelId` integer NOT NULL,
	`tagId` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `models` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`driveId` text,
	`name` text NOT NULL,
	`categoryId` integer,
	`path` text,
	`images` text DEFAULT '[]',
	`modelFiles` text DEFAULT '[]',
	`files` text DEFAULT '[]',
	`fileCount` integer DEFAULT 0,
	`imageCount` integer DEFAULT 0,
	`thumbnailUrl` text,
	`heroImage` text,
	`heroImageSource` text,
	`driveCreatedAt` integer,
	`customNotes` text,
	`isFavorite` integer DEFAULT false,
	`tagsLockedAt` integer,
	`lastScanned` integer DEFAULT (unixepoch('now') * 1000),
	`rootPath` text,
	`createdAt` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch('now') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `models_driveId_unique` ON `models` (`driveId`);--> statement-breakpoint
CREATE TABLE `resources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`logoUrl` text,
	`description` text,
	`sortOrder` integer DEFAULT 0 NOT NULL,
	`createdAt` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch('now') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scan_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`status` text DEFAULT 'running' NOT NULL,
	`modelsFound` integer DEFAULT 0,
	`categoriesFound` integer DEFAULT 0,
	`errorMessage` text,
	`startedAt` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,
	`completedAt` integer
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`value` text,
	`updatedAt` integer DEFAULT (unixepoch('now') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `settings_key_unique` ON `settings` (`key`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#6366f1',
	`createdAt` integer DEFAULT (unixepoch('now') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text,
	`username` text,
	`passwordHash` text,
	`openId` text,
	`email` text,
	`role` text DEFAULT 'user' NOT NULL,
	`createdAt` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,
	`lastSignedIn` integer DEFAULT (unixepoch('now') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_openId_unique` ON `users` (`openId`);