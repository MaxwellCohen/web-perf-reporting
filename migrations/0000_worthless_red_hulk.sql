CREATE TABLE `Historical_Metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text,
	`origin` text,
	`formFactor` text,
	`date` text NOT NULL,
	`data` blob NOT NULL
);
--> statement-breakpoint
CREATE INDEX `historicalMetrics2_index` ON `Historical_Metrics` (`url`,`formFactor`,`origin`);--> statement-breakpoint
CREATE INDEX `historical_Metrics_url_index` ON `Historical_Metrics` (`url`);