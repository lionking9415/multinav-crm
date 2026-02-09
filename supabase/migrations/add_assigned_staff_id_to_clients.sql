-- Add assigned_staff_id to clients (for existing databases; schema.sql already includes it for new installs)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS assigned_staff_id VARCHAR(255);
