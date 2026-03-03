CREATE TABLE `report_submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`reportType` varchar(100) NOT NULL,
	`location` varchar(100) NOT NULL,
	`reportDate` varchar(20) NOT NULL,
	`data` json NOT NULL,
	`totalScore` varchar(20),
	`status` enum('draft','submitted','reviewed') NOT NULL DEFAULT 'submitted',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `report_submissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `store_pins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeCode` varchar(10) NOT NULL,
	`storeName` varchar(100) NOT NULL,
	`pin` varchar(10) NOT NULL,
	`isActive` enum('yes','no') NOT NULL DEFAULT 'yes',
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `store_pins_id` PRIMARY KEY(`id`),
	CONSTRAINT `store_pins_storeCode_unique` UNIQUE(`storeCode`)
);
