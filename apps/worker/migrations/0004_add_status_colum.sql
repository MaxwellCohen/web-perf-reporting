ALTER TABLE PageSpeedInsightsTable
ADD COLUMN status TEXT
CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
DEFAULT 'pending' NOT NULL;