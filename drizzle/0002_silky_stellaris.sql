CREATE TABLE `access_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` text,
	`openId` varchar(64),
	`status` enum('pending','approved','denied') NOT NULL DEFAULT 'pending',
	`preAdded` boolean NOT NULL DEFAULT false,
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedAt` timestamp,
	CONSTRAINT `access_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `access_requests_email_unique` UNIQUE(`email`)
);
