DROP INDEX "PageSpeedInsightsTable_index1";--> statement-breakpoint
DROP INDEX "PageSpeedInsightsTable_index2";--> statement-breakpoint
DROP INDEX "historicalMetrics2_index";--> statement-breakpoint
DROP INDEX "historical_Metrics_url_index";--> statement-breakpoint
ALTER TABLE `PageSpeedInsightsTable` ALTER COLUMN "data" TO "data" blob;--> statement-breakpoint
CREATE INDEX `PageSpeedInsightsTable_index1` ON `PageSpeedInsightsTable` (`url`);--> statement-breakpoint
CREATE INDEX `PageSpeedInsightsTable_index2` ON `PageSpeedInsightsTable` (`url`,`date`);--> statement-breakpoint
CREATE INDEX `historicalMetrics2_index` ON `Historical_Metrics` (`url`,`formFactor`,`origin`);--> statement-breakpoint
CREATE INDEX `historical_Metrics_url_index` ON `Historical_Metrics` (`url`);--> statement-breakpoint
ALTER TABLE `PageSpeedInsightsTable` ADD `status` text;