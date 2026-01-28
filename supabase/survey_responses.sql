-- Survey Responses Table Schema for MultiNav iCRM
-- Run this in your Supabase SQL editor to create the survey_responses table

-- Create Survey Responses table
CREATE TABLE IF NOT EXISTS survey_responses (
    id VARCHAR(50) PRIMARY KEY,
    client_id VARCHAR(10) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    q1_rating INTEGER NOT NULL CHECK (q1_rating >= 1 AND q1_rating <= 5),
    q2_rating INTEGER NOT NULL CHECK (q2_rating >= 1 AND q2_rating <= 5),
    q3_rating INTEGER NOT NULL CHECK (q3_rating >= 1 AND q3_rating <= 5),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add comments for documentation
COMMENT ON TABLE survey_responses IS 'Patient satisfaction survey responses';
COMMENT ON COLUMN survey_responses.q1_rating IS 'Staff showed respect for how you were feeling (1-5)';
COMMENT ON COLUMN survey_responses.q2_rating IS 'Opportunities to discuss support or care needs (1-5)';
COMMENT ON COLUMN survey_responses.q3_rating IS 'Culture, beliefs and values were respected (1-5)';

-- Create indexes for survey_responses
CREATE INDEX IF NOT EXISTS idx_survey_responses_client ON survey_responses(client_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_date ON survey_responses(submitted_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

-- Create policies for survey_responses
DROP POLICY IF EXISTS "Enable read access for all users" ON survey_responses;
CREATE POLICY "Enable read access for all users" ON survey_responses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON survey_responses;
CREATE POLICY "Enable insert for authenticated users" ON survey_responses FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON survey_responses;
CREATE POLICY "Enable update for authenticated users" ON survey_responses FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON survey_responses;
CREATE POLICY "Enable delete for authenticated users" ON survey_responses FOR DELETE USING (true);

-- Grant permissions
GRANT ALL ON survey_responses TO anon;
GRANT ALL ON survey_responses TO authenticated;
GRANT ALL ON survey_responses TO service_role;
