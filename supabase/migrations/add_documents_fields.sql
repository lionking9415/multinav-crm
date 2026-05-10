-- Add documents field to clients table
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS documents TEXT;

-- Add documents field to health_activities table
ALTER TABLE health_activities
  ADD COLUMN IF NOT EXISTS documents TEXT;

-- Add comments
COMMENT ON COLUMN clients.documents IS 'JSON array of uploaded documents: [{name, url, uploadedAt}]';
COMMENT ON COLUMN health_activities.documents IS 'JSON array of uploaded documents: [{name, url, uploadedAt}]';
