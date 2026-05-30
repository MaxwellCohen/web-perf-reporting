CREATE TABLE `PageSpeedInsightsTable` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`url` text NOT NULL,
	`date` integer,
	`data` blob NOT NULL
);
--> statement-breakpoint
CREATE INDEX `PageSpeedInsightsTable_index1` ON `PageSpeedInsightsTable` (`url`);--> statement-breakpoint
CREATE INDEX `PageSpeedInsightsTable_index2` ON `PageSpeedInsightsTable` (`url`,`date`);--> statement-breakpoint
CREATE TABLE `Historical_Metrics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`url` text,
	`origin` text,
	`formFactor` text,
	`date` text NOT NULL,
	`date2` integer,
	`data` blob NOT NULL
);
--> statement-breakpoint
CREATE INDEX `historicalMetrics2_index` ON `Historical_Metrics` (`url`,`formFactor`,`origin`);--> statement-breakpoint
CREATE INDEX `historical_Metrics_url_index` ON `Historical_Metrics` (`url`);