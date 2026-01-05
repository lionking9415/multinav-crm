import React, { useState, useRef, useEffect } from 'react';
import { Shield, Mail, Loader2, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { verifyOTP, initiate2FA, saveTrustedDevice, generateDeviceFingerprint } from '../services/twoFactorService';

interface OTPVerificationProps {
  userId: string;
  userEmail: string;
  userName: string;
  onVerified: () => void;
  onCancel: () => void;
}

const OTPVerification: React.FC<OTPVerificationProps> = ({
  userId,
  userEmail,
  userName,
  onVerified,
  onCancel
}) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [trustDevice, setTrustDevice] = useState(true);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  // Mask email for display
  const maskedEmail = userEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3');

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');
    
    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // Auto-submit when all digits entered
    if (value && index === 5 && newOtp.every(digit => digit !== '')) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    // Handle paste
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard.readText().then(text => {
        const digits = text.replace(/\D/g, '').slice(0, 6).split('');
        const newOtp = [...otp];
        digits.forEach((digit, i) => {
          if (i < 6) newOtp[i] = digit;
        });
        setOtp(newOtp);
        if (digits.length === 6) {
          handleVerify(newOtp.join(''));
        } else {
          inputRefs.current[digits.length]?.focus();
        }
      });
    }
  };

  const handleVerify = async (otpCode?: string) => {
    const code = otpCode || otp.join('');
    if (code.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const result = await verifyOTP(userId, code);
      
      if (result.success) {
        setSuccess('Verification successful!');
        
        // Save trusted device if checkbox is checked
        if (trustDevice) {
          const deviceHash = generateDeviceFingerprint();
          await saveTrustedDevice(userId, userEmail, deviceHash);
        }
        
        // Wait a moment to show success, then proceed
        setTimeout(() => {
          onVerified();
        }, 1000);
      } else {
        setError(result.message);
        // Clear OTP on error
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    
    setIsResending(true);
    setError('');
    
    try {
      const result = await initiate2FA(userId, userEmail, userName);
      if (result.success) {
        setSuccess('New code sent! Check your email.');
        setResendCooldown(60); // 60 second cooldown
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to resend code. Please try again.');
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
            <div className="p-3 bg-baby-blue-500 rounded-full">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Verify Your Identity</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            We've sent a verification code to
          </p>
          <p className="text-baby-blue-600 dark:text-baby-blue-400 font-medium flex items-center justify-center gap-2 mt-1">
            <Mail size={16} />
            {maskedEmail}
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-3 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg flex items-center gap-2">
            <CheckCircle size={18} />
            {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg flex items-center gap-2">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* OTP Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center">
            Enter 6-digit code
          </label>
          <div className="flex justify-center gap-2">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={el => inputRefs.current[index] = el}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={isVerifying}
                className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-lg 
                  focus:outline-none focus:ring-2 focus:ring-baby-blue-500 focus:border-baby-blue-500
                  dark:bg-gray-700 dark:text-white dark:border-gray-600
                  ${digit ? 'border-lime-green-500 bg-lime-green-50 dark:bg-lime-green-900/20' : 'border-gray-300'}
                  ${isVerifying ? 'opacity-50 cursor-not-allowed' : ''}
                  transition-all duration-200`}
              />
            ))}
          </div>
        </div>

        {/* Trust Device Checkbox */}
        <div className="mb-6">
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

        {/* Verify Button */}
        <button
          onClick={() => handleVerify()}
          disabled={isVerifying || otp.some(d => !d)}
          className="w-full py-3 px-4 bg-lime-green-500 hover:bg-lime-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify & Continue'
          )}
        </button>

        {/* Resend Code */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Didn't receive the code?
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
                Resend Code
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
            <strong>Note:</strong> The code expires in 10 minutes. Check your spam folder if you don't see the email.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;




