-- =====================================================
-- EMAIL QUEUE TABLE FOR 2FA OTP EMAILS
-- =====================================================
-- This table stores emails to be sent. You can either:
-- 1. Use a cron job/scheduled function to process the queue
-- 2. Use a database trigger to send immediately
-- 3. Use an external service like Supabase's built-in SMTP

-- Create email queue table
CREATE TABLE IF NOT EXISTS email_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    to_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body TEXT,
    html_body TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed
    error_message TEXT,
    attempts INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage emails
CREATE POLICY "Service role can manage email_queue" ON email_queue
    FOR ALL USING (true);

-- Create index for processing pending emails
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status, created_at);

-- =====================================================
-- ALTERNATIVE: Use Supabase Auth Email Templates
-- =====================================================
-- Instead of custom email sending, you can customize Supabase's 
-- built-in email templates in the Dashboard:
-- 
-- 1. Go to Authentication > Email Templates
-- 2. Customize the "Magic Link" or "Confirm Email" template
-- 3. Use supabase.auth.signInWithOtp({ email }) to trigger emails
--
-- This uses Supabase's built-in SMTP and is FREE!

-- =====================================================
-- SETUP INSTRUCTIONS
-- =====================================================
-- 
-- OPTION A: Use Gmail SMTP (Free, Easy)
-- =====================================
-- 1. Go to Supabase Dashboard > Project Settings > Auth
-- 2. Scroll to "SMTP Settings"
-- 3. Enable "Custom SMTP"
-- 4. Enter Gmail SMTP settings:
--    - Host: smtp.gmail.com
--    - Port: 587
--    - Username: your-email@gmail.com
--    - Password: Your App Password (not regular password)
--    
-- To get Gmail App Password:
-- 1. Go to Google Account > Security
-- 2. Enable 2-Step Verification
-- 3. Go to App Passwords
-- 4. Generate a new app password for "Mail"
--
-- OPTION B: Use SendGrid Free Tier
-- =================================
-- 1. Sign up at sendgrid.com (100 emails/day free)
-- 2. Create an API key
-- 3. Use their SMTP settings in Supabase
--
-- OPTION C: Use Mailgun Free Tier  
-- =================================
-- 1. Sign up at mailgun.com
-- 2. Verify your domain or use sandbox
-- 3. Use their SMTP settings
--
-- =====================================================

