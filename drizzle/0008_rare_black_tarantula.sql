CREATE TABLE `position_pins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`positionSlug` varchar(50) NOT NULL,
	`positionLabel` varchar(100) NOT NULL,
	`pin` varchar(10) NOT NULL,
	`isActive` enum('yes','no') NOT NULL DEFAULT 'yes',
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `position_pins_id` PRIMARY KEY(`id`),
	CONSTRAINT `position_pins_positionSlug_unique` UNIQUE(`positionSlug`)
);
