CREATE TABLE `koomi_daily_sales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` varchar(32) NOT NULL,
	`storeName` varchar(255) NOT NULL,
	`koomiLocationId` varchar(20) NOT NULL,
	`date` varchar(10) NOT NULL,
	`grossSales` float NOT NULL DEFAULT 0,
	`netSales` float NOT NULL DEFAULT 0,
	`netSalaries` float NOT NULL DEFAULT 0,
	`labourPercent` float NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `koomi_daily_sales_id` PRIMARY KEY(`id`)
);
