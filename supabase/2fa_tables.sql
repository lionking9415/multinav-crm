-- 2FA Tables for MultiNav iCRM
-- Run this in your Supabase SQL Editor

-- Trusted devices table - stores devices that have been verified via OTP
CREATE TABLE IF NOT EXISTS user_trusted_devices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    device_hash VARCHAR(255) NOT NULL,
    device_name VARCHAR(100),
    browser VARCHAR(50),
    os VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
    UNIQUE(user_id, device_hash)
);

-- OTP codes table - stores temporary verification codes
CREATE TABLE IF NOT EXISTS user_otp_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
    attempts INT DEFAULT 0,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user ON user_trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_hash ON user_trusted_devices(device_hash);
CREATE INDEX IF NOT EXISTS idx_otp_codes_user ON user_otp_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON user_otp_codes(user_email);

-- Enable Row Level Security
ALTER TABLE user_trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_otp_codes ENABLE ROW LEVEL SECURITY;

-- Policies for public access (using anon key)
CREATE POLICY "Enable all access for user_trusted_devices" ON user_trusted_devices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for user_otp_codes" ON user_otp_codes FOR ALL USING (true) WITH CHECK (true);

-- Function to clean up expired OTP codes (optional - can be run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
    DELETE FROM user_otp_codes WHERE expires_at < NOW() OR used = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired trusted devices
CREATE OR REPLACE FUNCTION cleanup_expired_devices()
RETURNS void AS $$
BEGIN
    DELETE FROM user_trusted_devices WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

