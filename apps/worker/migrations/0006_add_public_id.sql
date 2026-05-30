-- Add publicId column to existing table
ALTER TABLE PageSpeedInsightsTable
ADD COLUMN publicId TEXT;

-- Create index on publicId for faster lookups
CREATE INDEX IF NOT EXISTS idx_publicId ON PageSpeedInsightsTable(publicId);

-- Update existing records to have a UUID (if any exist)
-- Note: This will be handled by the application code when records are accessed
