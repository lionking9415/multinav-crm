-- Add additional_input field to clients table
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS additional_input TEXT;
