CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`driveId` varchar(128) NOT NULL,
	`name` varchar(255) NOT NULL,
	`customLabel` varchar(255),
	`parentDriveId` varchar(128),
	`path` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_driveId_unique` UNIQUE(`driveId`)
);
--> statement-breakpoint
CREATE TABLE `model_tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`modelId` int NOT NULL,
	`tagId` int NOT NULL,
	CONSTRAINT `model_tags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `models` (
	`id` int AUTO_INCREMENT NOT NULL,
	`driveId` varchar(128) NOT NULL,
	`name` varchar(512) NOT NULL,
	`categoryId` int,
	`path` text,
	`images` json DEFAULT ('[]'),
	`modelFiles` json DEFAULT ('[]'),
	`fileCount` int DEFAULT 0,
	`imageCount` int DEFAULT 0,
	`thumbnailUrl` text,
	`customNotes` text,
	`isFavorite` boolean DEFAULT false,
	`lastScanned` timestamp DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `models_id` PRIMARY KEY(`id`),
	CONSTRAINT `models_driveId_unique` UNIQUE(`driveId`)
);
--> statement-breakpoint
CREATE TABLE `scan_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`status` enum('running','completed','failed') NOT NULL DEFAULT 'running',
	`modelsFound` int DEFAULT 0,
	`categoriesFound` int DEFAULT 0,
	`errorMessage` text,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `scan_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(128) NOT NULL,
	`value` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `settings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`color` varchar(32) DEFAULT '#6366f1',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `tags_name_unique` UNIQUE(`name`)
);
