CREATE TABLE `qbo_cogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`realmId` varchar(64) NOT NULL,
	`storeId` varchar(32) NOT NULL,
	`storeName` varchar(255) NOT NULL,
	`qboLocationId` varchar(64),
	`qboLocationName` varchar(255),
	`periodStart` varchar(10) NOT NULL,
	`periodEnd` varchar(10) NOT NULL,
	`cogsAmount` float NOT NULL DEFAULT 0,
	`revenue` float NOT NULL DEFAULT 0,
	`grossProfit` float NOT NULL DEFAULT 0,
	`cogsPercent` float NOT NULL DEFAULT 0,
	`cogsBreakdown` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `qbo_cogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `qbo_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`realmId` varchar(64) NOT NULL,
	`companyName` varchar(255),
	`accessToken` text NOT NULL,
	`refreshToken` text NOT NULL,
	`accessTokenExpiresAt` timestamp NOT NULL,
	`refreshTokenExpiresAt` timestamp NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastSyncAt` timestamp,
	`lastSyncSuccess` boolean,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `qbo_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `qbo_tokens_realmId_unique` UNIQUE(`realmId`)
);
