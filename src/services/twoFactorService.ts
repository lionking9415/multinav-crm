import { supabase } from './supabaseService';

// 2FA Service using Supabase Auth built-in OTP
// Last updated: 2025-01-05 - Using signInWithOtp for email delivery

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
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
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

// ==========================================
// SUPABASE AUTH OTP FUNCTIONS
// ==========================================

/**
 * Initiate 2FA using Supabase Auth's built-in OTP
 * This sends an OTP email using Supabase's email service
 */
export async function initiate2FA(userId: string, userEmail: string, userName: string): Promise<{ success: boolean; message: string }> {
  try {
    console.log('[2FA] Initiating Supabase Auth OTP for:', userEmail);
    
    // Use Supabase Auth's signInWithOtp which sends an email with OTP
    const { error } = await supabase.auth.signInWithOtp({
      email: userEmail,
      options: {
        shouldCreateUser: false, // Don't create a new auth user, just send OTP
        data: {
          userId: userId,
          userName: userName,
          purpose: '2fa_verification'
        }
      }
    });

    if (error) {
      console.error('[2FA] Supabase Auth OTP error:', error);
      
      // Handle specific errors
      if (error.message.includes('rate limit')) {
        return { success: false, message: 'Too many requests. Please wait a moment before trying again.' };
      }
      if (error.message.includes('not allowed')) {
        return { success: false, message: 'Email OTP is not enabled. Please contact support.' };
      }
      
      return { success: false, message: error.message };
    }

    // Mask email for display
    const maskedEmail = userEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3');
    
    console.log('[2FA] OTP email sent successfully via Supabase Auth');
    return { 
      success: true, 
      message: `Verification code sent to ${maskedEmail}` 
    };
  } catch (error) {
    console.error('[2FA] Error initiating 2FA:', error);
    return { success: false, message: 'Failed to send verification code. Please try again.' };
  }
}

/**
 * Verify OTP using Supabase Auth
 */
export async function verifyOTP(userId: string, userEmail: string, otpCode: string): Promise<{ success: boolean; message: string }> {
  try {
    console.log('[2FA] Verifying OTP for:', userEmail);
    
    const { data, error } = await supabase.auth.verifyOtp({
      email: userEmail,
      token: otpCode,
      type: 'email' // Use 'email' type for email OTP
    });

    if (error) {
      console.error('[2FA] OTP verification error:', error);
      
      // Handle specific errors
      if (error.message.includes('expired')) {
        return { success: false, message: 'Code has expired. Please request a new one.' };
      }
      if (error.message.includes('invalid')) {
        return { success: false, message: 'Invalid code. Please check and try again.' };
      }
      
      return { success: false, message: error.message };
    }

    if (data?.user || data?.session) {
      console.log('[2FA] OTP verified successfully');
      
      // Sign out from Supabase Auth since we're using our own auth system
      // This prevents the Supabase session from interfering
      await supabase.auth.signOut();
      
      return { success: true, message: 'Verification successful!' };
    }

    return { success: false, message: 'Verification failed. Please try again.' };
  } catch (error) {
    console.error('[2FA] Error verifying OTP:', error);
    return { success: false, message: 'Verification failed. Please try again.' };
  }
}

/**
 * Resend OTP - just calls initiate2FA again
 */
export async function resendOTP(userId: string, userEmail: string, userName: string): Promise<{ success: boolean; message: string }> {
  return initiate2FA(userId, userEmail, userName);
}
