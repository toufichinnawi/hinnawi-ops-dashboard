CREATE TABLE `excel_labour_data` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(10) NOT NULL,
	`store` varchar(64) NOT NULL,
	`storeId` varchar(32) NOT NULL,
	`netSales` float NOT NULL DEFAULT 0,
	`labourCost` float NOT NULL DEFAULT 0,
	`labourPercent` float NOT NULL DEFAULT 0,
	`notes` text,
	`sourceRowId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `excel_labour_data_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `excel_sync_meta` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`rowCount` int NOT NULL DEFAULT 0,
	`dateRange` varchar(64),
	`lastSyncAt` timestamp NOT NULL DEFAULT (now()),
	`syncSuccess` boolean NOT NULL DEFAULT true,
	`errorMessage` text,
	CONSTRAINT `excel_sync_meta_id` PRIMARY KEY(`id`)
);
