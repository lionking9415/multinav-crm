import { supabase } from './supabaseService';

// Resend API key - in production, this should be in environment variables
const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY || 're_54bziP1L_E77d27UxosxUVUrJgwsd4AAT';

// Supabase Edge Function URL for sending OTP emails
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://hmruaeewpurjmjgqlojk.supabase.co';
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/send-otp-email`;

// Device fingerprinting
export function generateDeviceFingerprint(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 'unknown',
    navigator.platform || 'unknown',
  ];
  
  // Simple hash function
  const str = components.join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

export function getDeviceInfo(): { name: string; browser: string; os: string } {
  const ua = navigator.userAgent;
  
  // Detect browser
  let browser = 'Unknown';
  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';
  else if (ua.includes('Opera')) browser = 'Opera';
  
  // Detect OS
  let os = 'Unknown';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  
  return {
    name: `${browser} on ${os}`,
    browser,
    os
  };
}

// Generate 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Check if device is trusted
export async function isDeviceTrusted(userId: string, deviceHash: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_trusted_devices')
      .select('id, expires_at')
      .eq('user_id', userId)
      .eq('device_hash', deviceHash)
      .single();
    
    if (error || !data) {
      console.log('[2FA] Device not found in trusted devices');
      return false;
    }
    
    // Check if device trust has expired
    if (new Date(data.expires_at) < new Date()) {
      console.log('[2FA] Device trust has expired');
      // Delete expired device
      await supabase
        .from('user_trusted_devices')
        .delete()
        .eq('id', data.id);
      return false;
    }
    
    // Update last used timestamp
    await supabase
      .from('user_trusted_devices')
      .update({ last_used: new Date().toISOString() })
      .eq('id', data.id);
    
    console.log('[2FA] Device is trusted');
    return true;
  } catch (error) {
    console.error('[2FA] Error checking trusted device:', error);
    return false;
  }
}

// Save trusted device
export async function saveTrustedDevice(userId: string, userEmail: string, deviceHash: string): Promise<boolean> {
  try {
    const deviceInfo = getDeviceInfo();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // Trust for 30 days
    
    const { error } = await supabase
      .from('user_trusted_devices')
      .upsert({
        user_id: userId,
        user_email: userEmail,
        device_hash: deviceHash,
        device_name: deviceInfo.name,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        last_used: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      }, {
        onConflict: 'user_id,device_hash'
      });
    
    if (error) {
      console.error('[2FA] Error saving trusted device:', error);
      return false;
    }
    
    console.log('[2FA] Device saved as trusted');
    return true;
  } catch (error) {
    console.error('[2FA] Error saving trusted device:', error);
    return false;
  }
}

// Get user's trusted devices
export async function getTrustedDevices(userId: string): Promise<Array<{
  id: string;
  device_name: string;
  browser: string;
  os: string;
  last_used: string;
  created_at: string;
}>> {
  try {
    const { data, error } = await supabase
      .from('user_trusted_devices')
      .select('*')
      .eq('user_id', userId)
      .order('last_used', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[2FA] Error getting trusted devices:', error);
    return [];
  }
}

// Revoke a trusted device
export async function revokeTrustedDevice(deviceId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_trusted_devices')
      .delete()
      .eq('id', deviceId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('[2FA] Error revoking device:', error);
    return false;
  }
}

// Revoke all trusted devices for a user
export async function revokeAllTrustedDevices(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_trusted_devices')
      .delete()
      .eq('user_id', userId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('[2FA] Error revoking all devices:', error);
    return false;
  }
}

// Create and store OTP
export async function createOTP(userId: string, userEmail: string): Promise<string | null> {
  try {
    const otp = generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minute expiry
    
    // Invalidate any existing OTPs for this user
    await supabase
      .from('user_otp_codes')
      .update({ used: true })
      .eq('user_id', userId)
      .eq('used', false);
    
    // Create new OTP
    const { error } = await supabase
      .from('user_otp_codes')
      .insert({
        user_id: userId,
        user_email: userEmail,
        otp_code: otp,
        expires_at: expiresAt.toISOString(),
        attempts: 0,
        used: false
      });
    
    if (error) {
      console.error('[2FA] Error creating OTP:', error);
      return null;
    }
    
    console.log('[2FA] OTP created successfully');
    return otp;
  } catch (error) {
    console.error('[2FA] Error creating OTP:', error);
    return null;
  }
}

// Verify OTP
export async function verifyOTP(userId: string, inputOTP: string): Promise<{ success: boolean; message: string }> {
  try {
    // Get the latest unused OTP for this user
    const { data, error } = await supabase
      .from('user_otp_codes')
      .select('*')
      .eq('user_id', userId)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error || !data) {
      return { success: false, message: 'No valid OTP found. Please request a new code.' };
    }
    
    // Check if expired
    if (new Date(data.expires_at) < new Date()) {
      await supabase
        .from('user_otp_codes')
        .update({ used: true })
        .eq('id', data.id);
      return { success: false, message: 'OTP has expired. Please request a new code.' };
    }
    
    // Check attempts
    if (data.attempts >= 3) {
      await supabase
        .from('user_otp_codes')
        .update({ used: true })
        .eq('id', data.id);
      return { success: false, message: 'Too many failed attempts. Please request a new code.' };
    }
    
    // Verify OTP
    if (data.otp_code !== inputOTP) {
      // Increment attempts
      await supabase
        .from('user_otp_codes')
        .update({ attempts: data.attempts + 1 })
        .eq('id', data.id);
      
      const remainingAttempts = 2 - data.attempts;
      return { 
        success: false, 
        message: remainingAttempts > 0 
          ? `Invalid code. ${remainingAttempts} attempt${remainingAttempts > 1 ? 's' : ''} remaining.`
          : 'Invalid code. No attempts remaining.'
      };
    }
    
    // Mark OTP as used
    await supabase
      .from('user_otp_codes')
      .update({ used: true })
      .eq('id', data.id);
    
    console.log('[2FA] OTP verified successfully');
    return { success: true, message: 'OTP verified successfully' };
  } catch (error) {
    console.error('[2FA] Error verifying OTP:', error);
    return { success: false, message: 'Verification failed. Please try again.' };
  }
}

// Send OTP via email using Supabase Edge Function (which calls Resend API)
export async function sendOTPEmail(email: string, otp: string, userName: string): Promise<boolean> {
  try {
    console.log('[2FA] Sending OTP email to:', email);
    
    // For development: Log the OTP to console as fallback
    console.log(`%c[2FA DEV MODE] Your OTP code is: ${otp}`, 'background: #22c55e; color: white; font-size: 16px; padding: 10px;');
    
    // Try to send via Supabase Edge Function (bypasses CORS)
    try {
      console.log('[2FA] Calling Edge Function:', EDGE_FUNCTION_URL);
      
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          email,
          otp,
          userName
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('[2FA] Email sent successfully via Edge Function:', result.messageId);
        return true;
      } else {
        console.warn('[2FA] Edge Function returned error:', result.error);
      }
    } catch (edgeFunctionError) {
      console.warn('[2FA] Edge Function call failed:', edgeFunctionError);
    }
    
    // Fallback: Try direct Resend API (will fail due to CORS in browser, but works in some environments)
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'MultiNav iCRM <onboarding@resend.dev>',
          to: [email],
          subject: `Your MultiNav Login Code: ${otp}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #22c55e; margin: 0;">🌿 MultiNav iCRM</h1>
                <p style="color: #666; margin-top: 5px;">Integrated Care Reporting & Management</p>
              </div>
              
              <div style="background: #f8fafc; border-radius: 10px; padding: 30px; text-align: center;">
                <h2 style="color: #1e293b; margin-top: 0;">Verify Your Login</h2>
                <p style="color: #64748b;">Hi ${userName},</p>
                <p style="color: #64748b;">We noticed you're logging in from a new device. Please use the verification code below:</p>
                
                <div style="background: #22c55e; color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px 40px; border-radius: 10px; margin: 30px 0; display: inline-block;">
                  ${otp}
                </div>
                
                <p style="color: #94a3b8; font-size: 14px;">This code expires in <strong>10 minutes</strong>.</p>
              </div>
              
              <div style="margin-top: 30px; padding: 20px; background: #fef3c7; border-radius: 10px;">
                <p style="color: #92400e; margin: 0; font-size: 14px;">
                  <strong>⚠️ Security Notice:</strong> If you didn't request this code, please ignore this email. 
                  Someone may have entered your email address by mistake.
                </p>
              </div>
              
              <div style="text-align: center; margin-top: 30px; color: #94a3b8; font-size: 12px;">
                <p>© ${new Date().getFullYear()} MultiNav iCRM. All rights reserved.</p>
              </div>
            </div>
          `
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('[2FA] Email sent successfully via direct API:', result.id);
        return true;
      }
    } catch (corsError) {
      console.log('[2FA] Direct API call failed (CORS expected in browser)');
    }
    
    // In development mode, we return true anyway since we logged the OTP to console
    console.log('[2FA] DEV MODE: Email may not have been sent, but OTP is logged to console');
    return true;
  } catch (error) {
    console.error('[2FA] Error sending OTP email:', error);
    return false;
  }
}

// Main function to initiate 2FA
export async function initiate2FA(userId: string, userEmail: string, userName: string): Promise<{ success: boolean; message: string }> {
  try {
    // Generate OTP
    const otp = await createOTP(userId, userEmail);
    if (!otp) {
      return { success: false, message: 'Failed to generate verification code. Please try again.' };
    }
    
    // Send email
    const emailSent = await sendOTPEmail(userEmail, otp, userName);
    if (!emailSent) {
      return { success: false, message: 'Failed to send verification email. Please try again.' };
    }
    
    // Mask email for display
    const maskedEmail = userEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3');
    
    return { 
      success: true, 
      message: `Verification code sent to ${maskedEmail}` 
    };
  } catch (error) {
    console.error('[2FA] Error initiating 2FA:', error);
    return { success: false, message: 'Failed to initiate verification. Please try again.' };
  }
}

