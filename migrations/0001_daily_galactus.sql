PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_Historical_Metrics` (
	`id` integer PRIMARY KEY NOT NULL,
	`url` text,
	`origin` text,
	`formFactor` text,
	`date` text NOT NULL,
	`date2` integer,
	`data` blob NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_Historical_Metrics`("id", "url", "origin", "formFactor", "date", "date2", "data") SELECT "id", "url", "origin", "formFactor", "date", "date2", "data" FROM `Historical_Metrics`;--> statement-breakpoint
DROP TABLE `Historical_Metrics`;--> statement-breakpoint
ALTER TABLE `__new_Historical_Metrics` RENAME TO `Historical_Metrics`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `historicalMetrics2_index` ON `Historical_Metrics` (`url`,`formFactor`,`origin`);--> statement-breakpoint
CREATE INDEX `historical_Metrics_url_index` ON `Historical_Metrics` (`url`);