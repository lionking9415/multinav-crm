-- Add referring_organisation field to clients table
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS referring_organisation TEXT;

-- Add reason_for_assistance field to health_activities table
ALTER TABLE health_activities
  ADD COLUMN IF NOT EXISTS reason_for_assistance TEXT;
