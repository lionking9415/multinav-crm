-- Migration: Add missing columns to health_activities table
-- These columns are required for location tracking, discharge info, and creator tracking.
-- Run this in your Supabase SQL editor.

-- Add location column
ALTER TABLE health_activities ADD COLUMN IF NOT EXISTS location VARCHAR(255) DEFAULT '';

-- Add "other" free-text fields
ALTER TABLE health_activities ADD COLUMN IF NOT EXISTS other_assistance TEXT DEFAULT '';
ALTER TABLE health_activities ADD COLUMN IF NOT EXISTS other_education TEXT DEFAULT '';

-- Add discharge information columns
ALTER TABLE health_activities ADD COLUMN IF NOT EXISTS is_discharge BOOLEAN DEFAULT FALSE;
ALTER TABLE health_activities ADD COLUMN IF NOT EXISTS discharge_date DATE;
ALTER TABLE health_activities ADD COLUMN IF NOT EXISTS discharge_reason TEXT DEFAULT '';

-- Add creator tracking columns
ALTER TABLE health_activities ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) DEFAULT '';
ALTER TABLE health_activities ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(255) DEFAULT '';
ALTER TABLE health_activities ADD COLUMN IF NOT EXISTS created_by_role VARCHAR(50) DEFAULT 'navigator';
