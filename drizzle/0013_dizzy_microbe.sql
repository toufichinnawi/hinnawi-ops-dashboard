CREATE TABLE `report_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportId` int NOT NULL,
	`note` text NOT NULL,
	`flagType` enum('none','needs-review','follow-up','resolved') NOT NULL DEFAULT 'none',
	`createdBy` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `report_notes_id` PRIMARY KEY(`id`)
);
