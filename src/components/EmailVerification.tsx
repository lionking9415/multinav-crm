import React, { useState, useEffect } from 'react';
import { Mail, Loader2, RefreshCw, CheckCircle, AlertCircle, Inbox } from 'lucide-react';
import { initiate2FA, saveTrustedDevice, generateDeviceFingerprint } from '../services/twoFactorService';
import { supabase } from '../services/supabaseService';

interface EmailVerificationProps {
  userId: string;
  userEmail: string;
  userName: string;
  onVerified: () => void;
  onCancel: () => void;
}

const EmailVerification: React.FC<EmailVerificationProps> = ({
  userId,
  userEmail,
  userName,
  onVerified,
  onCancel
}) => {
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [trustDevice, setTrustDevice] = useState(true);
  const [resendCooldown, setResendCooldown] = useState(60); // Start with cooldown since email was just sent
  
  // Mask email for display
  const maskedEmail = userEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3');

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Listen for auth state changes (when user clicks the magic link)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[2FA] Auth state changed:', event);
      
      if (event === 'SIGNED_IN' && session) {
        console.log('[2FA] User verified via magic link');
        setSuccess('Verification successful!');
        
        // Save trusted device if checkbox is checked
        if (trustDevice) {
          const deviceHash = generateDeviceFingerprint();
          await saveTrustedDevice(userId, userEmail, deviceHash);
        }
        
        // Sign out from Supabase Auth (we use our own auth system)
        await supabase.auth.signOut();
        
        // Proceed to dashboard
        setTimeout(() => {
          onVerified();
        }, 1000);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, userEmail, trustDevice, onVerified]);

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    
    setIsResending(true);
    setError('');
    
    try {
      const result = await initiate2FA(userId, userEmail, userName);
      if (result.success) {
        setSuccess('New verification email sent! Check your inbox.');
        setResendCooldown(60);
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to resend email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-baby-blue-100 to-lime-green-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-baby-blue-500 rounded-full">
              <Mail className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Check Your Email</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            We've sent a verification link to
          </p>
          <p className="text-baby-blue-600 dark:text-baby-blue-400 font-semibold text-lg mt-1">
            {maskedEmail}
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg flex items-center gap-3">
            <CheckCircle size={24} />
            <span className="font-medium">{success}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg flex items-center gap-3">
            <AlertCircle size={24} />
            <span>{error}</span>
          </div>
        )}

        {/* Instructions */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
            <Inbox size={18} />
            Instructions
          </h3>
          <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-decimal list-inside">
            <li>Open your email inbox</li>
            <li>Find the email from <strong>Supabase</strong></li>
            <li>Click the <strong>"Confirm your email"</strong> link</li>
            <li>You'll be automatically logged in</li>
          </ol>
        </div>

        {/* Trust Device Checkbox */}
        <div className="mt-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={trustDevice}
              onChange={(e) => setTrustDevice(e.target.checked)}
              className="w-5 h-5 text-lime-green-500 border-gray-300 rounded focus:ring-lime-green-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Trust this device for 30 days
            </span>
          </label>
        </div>

        {/* Resend Email */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Didn't receive the email?
          </p>
          <button
            onClick={handleResend}
            disabled={isResending || resendCooldown > 0}
            className="text-baby-blue-600 dark:text-baby-blue-400 hover:underline font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
          >
            {isResending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Sending...
              </>
            ) : resendCooldown > 0 ? (
              <>
                <RefreshCw size={16} />
                Resend in {resendCooldown}s
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                Resend Email
              </>
            )}
          </button>
        </div>

        {/* Cancel */}
        <div className="mt-6 text-center">
          <button
            onClick={onCancel}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm"
          >
            ← Back to login
          </button>
        </div>

        {/* Info */}
        <div className="mt-6 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <p className="text-xs text-amber-700 dark:text-amber-400 text-center">
            <strong>Note:</strong> The link expires in 1 hour. Check your spam folder if you don't see the email.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;

