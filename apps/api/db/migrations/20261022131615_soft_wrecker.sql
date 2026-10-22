CREATE TABLE `Historical_Metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text,
	`origin` text,
	`formFactor` text,
	`date` text NOT NULL,
	`date2` integer,
	`data` blob NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `historicalMetrics_record_unique` ON `Historical_Metrics` (`url`,`formFactor`,`origin`,`date`);--> statement-breakpoint
CREATE INDEX `historical_Metrics_url_index` ON `Historical_Metrics` (`url`);--> statement-breakpoint
CREATE INDEX `historicalMetrics_scope_index` ON `Historical_Metrics` (`url`,`formFactor`,`origin`);