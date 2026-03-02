CREATE TABLE `alert_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ruleId` int,
	`webhookId` int NOT NULL,
	`alertType` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`storeId` varchar(64),
	`severity` enum('critical','warning','info','success') NOT NULL DEFAULT 'info',
	`delivered` boolean NOT NULL DEFAULT false,
	`errorMessage` text,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `alert_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `alert_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('labour_threshold','report_overdue','sales_drop','custom') NOT NULL,
	`webhookId` int NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`threshold` float,
	`config` json,
	`lastTriggeredAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `alert_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teams_webhooks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`webhookUrl` text NOT NULL,
	`channelName` varchar(255),
	`isActive` boolean NOT NULL DEFAULT true,
	`lastTestedAt` timestamp,
	`lastTestSuccess` boolean,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teams_webhooks_id` PRIMARY KEY(`id`)
);
