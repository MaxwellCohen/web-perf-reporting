DROP INDEX `historicalMetrics2_index`;--> statement-breakpoint
CREATE UNIQUE INDEX `historicalMetrics_record_unique` ON `Historical_Metrics` (`url`,`formFactor`,`origin`,`date`);--> statement-breakpoint
CREATE INDEX `historicalMetrics_scope_index` ON `Historical_Metrics` (`url`,`formFactor`,`origin`);
