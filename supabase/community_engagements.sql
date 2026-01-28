-- Community Engagements Table Schema for MultiNav iCRM
-- Run this in your Supabase SQL editor to create the community_engagements table

-- Create Community Engagements table
CREATE TABLE IF NOT EXISTS community_engagements (
    id VARCHAR(50) PRIMARY KEY,
    date_of_meeting DATE NOT NULL,
    agency_type VARCHAR(20) DEFAULT 'external' CHECK (agency_type IN ('internal', 'external')),
    agency_name VARCHAR(255) NOT NULL,
    staff_present TEXT,
    meeting_notes TEXT,
    created_by VARCHAR(255),
    created_by_name VARCHAR(255),
    created_by_role VARCHAR(50) CHECK (created_by_role IN ('admin', 'coordinator', 'navigator')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for community engagements
CREATE INDEX IF NOT EXISTS idx_community_engagements_date ON community_engagements(date_of_meeting DESC);
CREATE INDEX IF NOT EXISTS idx_community_engagements_type ON community_engagements(agency_type);
CREATE INDEX IF NOT EXISTS idx_community_engagements_agency ON community_engagements(agency_name);
CREATE INDEX IF NOT EXISTS idx_community_engagements_created_by ON community_engagements(created_by);

-- Create trigger for updated_at column
CREATE OR REPLACE FUNCTION update_community_engagements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_community_engagements_updated_at ON community_engagements;
CREATE TRIGGER update_community_engagements_updated_at 
    BEFORE UPDATE ON community_engagements
    FOR EACH ROW EXECUTE FUNCTION update_community_engagements_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE community_engagements ENABLE ROW LEVEL SECURITY;

-- Create policies for community_engagements (adjust based on your auth requirements)
-- For development, we'll allow all operations. In production, implement proper auth policies.
DROP POLICY IF EXISTS "Enable read access for all users" ON community_engagements;
CREATE POLICY "Enable read access for all users" ON community_engagements FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON community_engagements;
CREATE POLICY "Enable insert for authenticated users" ON community_engagements FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON community_engagements;
CREATE POLICY "Enable update for authenticated users" ON community_engagements FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON community_engagements;
CREATE POLICY "Enable delete for authenticated users" ON community_engagements FOR DELETE USING (true);

-- Grant permissions
GRANT ALL ON community_engagements TO anon;
GRANT ALL ON community_engagements TO authenticated;
GRANT ALL ON community_engagements TO service_role;
