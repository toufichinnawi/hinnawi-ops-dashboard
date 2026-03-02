CREATE TABLE `seven_shifts_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeName` varchar(255) NOT NULL,
	`companyId` int NOT NULL,
	`companyName` varchar(255),
	`locationId` int NOT NULL,
	`locationName` varchar(255),
	`accessToken` text NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastSyncAt` timestamp,
	`lastSyncSuccess` boolean,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `seven_shifts_connections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seven_shifts_daily_sales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`connectionId` int NOT NULL,
	`locationId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`totalSales` float NOT NULL DEFAULT 0,
	`projectedSales` float NOT NULL DEFAULT 0,
	`labourCost` float NOT NULL DEFAULT 0,
	`projectedLabourCost` float NOT NULL DEFAULT 0,
	`labourMinutes` int NOT NULL DEFAULT 0,
	`overtimeMinutes` int NOT NULL DEFAULT 0,
	`labourPercent` float NOT NULL DEFAULT 0,
	`salesPerLabourHour` float NOT NULL DEFAULT 0,
	`orderCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `seven_shifts_daily_sales_id` PRIMARY KEY(`id`)
);
