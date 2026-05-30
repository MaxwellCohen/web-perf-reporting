CREATE TABLE IF NOT EXISTS `PageSpeedInsightsTable` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`url` text NOT NULL,
    `formFactor` text NOT NULL,
	`date` integer,
	`data` blob NOT NULL
);