CREATE TABLE `clover_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeName` varchar(255) NOT NULL,
	`merchantId` varchar(64) NOT NULL,
	`accessToken` text NOT NULL,
	`refreshToken` text,
	`tokenExpiresAt` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastSyncAt` timestamp,
	`lastSyncSuccess` boolean,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clover_connections_id` PRIMARY KEY(`id`),
	CONSTRAINT `clover_connections_merchantId_unique` UNIQUE(`merchantId`)
);
--> statement-breakpoint
CREATE TABLE `clover_daily_sales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`connectionId` int NOT NULL,
	`merchantId` varchar(64) NOT NULL,
	`date` varchar(10) NOT NULL,
	`totalSales` float NOT NULL DEFAULT 0,
	`totalTips` float NOT NULL DEFAULT 0,
	`totalTax` float NOT NULL DEFAULT 0,
	`orderCount` int NOT NULL DEFAULT 0,
	`refundAmount` float NOT NULL DEFAULT 0,
	`netSales` float NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clover_daily_sales_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clover_shifts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`connectionId` int NOT NULL,
	`merchantId` varchar(64) NOT NULL,
	`employeeId` varchar(64) NOT NULL,
	`employeeName` varchar(255),
	`shiftId` varchar(64) NOT NULL,
	`inTime` timestamp NOT NULL,
	`outTime` timestamp,
	`hoursWorked` float,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `clover_shifts_id` PRIMARY KEY(`id`)
);
