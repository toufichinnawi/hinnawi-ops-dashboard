CREATE TABLE `scheduled_summary` (
	`id` int AUTO_INCREMENT NOT NULL,
	`webhookId` int NOT NULL,
	`isEnabled` boolean NOT NULL DEFAULT false,
	`scheduleHour` int NOT NULL DEFAULT 21,
	`scheduleMinute` int NOT NULL DEFAULT 0,
	`timezone` varchar(64) NOT NULL DEFAULT 'America/Toronto',
	`lastRunAt` timestamp,
	`lastRunSuccess` boolean,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scheduled_summary_id` PRIMARY KEY(`id`)
);
