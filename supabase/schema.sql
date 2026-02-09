-- Supabase Database Schema for MultiNav iCRM
-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS health_activities CASCADE;
DROP TABLE IF EXISTS patient_messages CASCADE;
DROP TABLE IF EXISTS patient_experiences CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS workforce CASCADE;
DROP TABLE IF EXISTS program_resources CASCADE;
DROP TABLE IF EXISTS gp_practices CASCADE;

-- Create Clients table
CREATE TABLE clients (
    id VARCHAR(10) PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    sex VARCHAR(50),
    date_of_birth DATE,
    age INTEGER,
    ethnicity VARCHAR(100),
    country_of_birth VARCHAR(100),
    languages TEXT[], -- Array of languages
    referral_source VARCHAR(100),
    referral_date DATE,
    address VARCHAR(255), -- Street address/suburb
    postcode VARCHAR(10), -- Postcode
    region VARCHAR(50), -- Perth North or Perth South
    password_hash VARCHAR(255), -- Store hashed password
    assigned_staff_id VARCHAR(255), -- User ID of assigned staff member
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX idx_clients_ethnicity ON clients(ethnicity);
CREATE INDEX idx_clients_referral_date ON clients(referral_date);
CREATE INDEX idx_clients_region ON clients(region);

-- Create Health Activities table
CREATE TABLE health_activities (
    id SERIAL PRIMARY KEY,
    activity_id VARCHAR(50) UNIQUE NOT NULL,
    client_id VARCHAR(10) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    navigation_assistance TEXT[], -- Array of assistance types
    services_accessed TEXT[], -- Array of services
    referrals_made TEXT,
    follow_up_actions TEXT,
    educational_resources TEXT[], -- Array of resources
    preventive_services TEXT[], -- Array of preventive services
    maternal_child_health TEXT[], -- Array of MCH services
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for activities
CREATE INDEX idx_activities_client_id ON health_activities(client_id);
CREATE INDEX idx_activities_date ON health_activities(activity_date);

-- Create Workforce table
CREATE TABLE workforce (
    id SERIAL PRIMARY KEY,
    region VARCHAR(50) NOT NULL, -- 'north' or 'south'
    fte DECIMAL(3,2) NOT NULL,
    role VARCHAR(100) NOT NULL,
    ethnicity VARCHAR(100),
    languages TEXT[], -- Array of languages
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for workforce
CREATE INDEX idx_workforce_region ON workforce(region);

-- Create Program Resources table
CREATE TABLE program_resources (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    date_added TIMESTAMP WITH TIME ZONE NOT NULL,
    category VARCHAR(255) NOT NULL,
    file_url TEXT, -- URL to the actual file if stored in Supabase Storage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create GP Practices table
CREATE TABLE gp_practices (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(50),
    website TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Patient Experiences table
CREATE TABLE patient_experiences (
    id SERIAL PRIMARY KEY,
    experience_id VARCHAR(50) UNIQUE NOT NULL,
    client_id VARCHAR(10) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    experience_date DATE NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    attachments JSONB, -- Store attachment metadata as JSON
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for patient experiences
CREATE INDEX idx_experiences_client_id ON patient_experiences(client_id);
CREATE INDEX idx_experiences_is_read ON patient_experiences(is_read);

-- Create Patient Messages table
CREATE TABLE patient_messages (
    id SERIAL PRIMARY KEY,
    message_id VARCHAR(50) UNIQUE NOT NULL,
    client_id VARCHAR(10) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    sender VARCHAR(20) NOT NULL CHECK (sender IN ('patient', 'navigator')),
    text TEXT NOT NULL,
    language VARCHAR(50) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for messages
CREATE INDEX idx_messages_client_id ON patient_messages(client_id);
CREATE INDEX idx_messages_is_read ON patient_messages(is_read);
CREATE INDEX idx_messages_timestamp ON patient_messages(timestamp DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_health_activities_updated_at BEFORE UPDATE ON health_activities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workforce_updated_at BEFORE UPDATE ON workforce
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_program_resources_updated_at BEFORE UPDATE ON program_resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gp_practices_updated_at BEFORE UPDATE ON gp_practices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patient_experiences_updated_at BEFORE UPDATE ON patient_experiences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE workforce ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE gp_practices ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust based on your auth requirements)
-- For development, we'll allow all operations. In production, implement proper auth policies.

-- Clients policies
CREATE POLICY "Enable read access for all users" ON clients FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON clients FOR UPDATE USING (true);
CREATE POLICY "Enable delete for authenticated users" ON clients FOR DELETE USING (true);

-- Health Activities policies
CREATE POLICY "Enable read access for all users" ON health_activities FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON health_activities FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON health_activities FOR UPDATE USING (true);
CREATE POLICY "Enable delete for authenticated users" ON health_activities FOR DELETE USING (true);

-- Workforce policies
CREATE POLICY "Enable read access for all users" ON workforce FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON workforce FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON workforce FOR UPDATE USING (true);
CREATE POLICY "Enable delete for authenticated users" ON workforce FOR DELETE USING (true);

-- Program Resources policies
CREATE POLICY "Enable read access for all users" ON program_resources FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON program_resources FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON program_resources FOR UPDATE USING (true);
CREATE POLICY "Enable delete for authenticated users" ON program_resources FOR DELETE USING (true);

-- GP Practices policies
CREATE POLICY "Enable read access for all users" ON gp_practices FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON gp_practices FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON gp_practices FOR UPDATE USING (true);
CREATE POLICY "Enable delete for authenticated users" ON gp_practices FOR DELETE USING (true);

-- Patient Experiences policies
CREATE POLICY "Enable read access for all users" ON patient_experiences FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON patient_experiences FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON patient_experiences FOR UPDATE USING (true);
CREATE POLICY "Enable delete for authenticated users" ON patient_experiences FOR DELETE USING (true);

-- Patient Messages policies
CREATE POLICY "Enable read access for all users" ON patient_messages FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON patient_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON patient_messages FOR UPDATE USING (true);
CREATE POLICY "Enable delete for authenticated users" ON patient_messages FOR DELETE USING (true);







