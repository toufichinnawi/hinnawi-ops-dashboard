ALTER TABLE `invoices` ADD `photoUrls` json;--> statement-breakpoint
ALTER TABLE `invoices` ADD `category` varchar(50) DEFAULT 'cogs' NOT NULL;