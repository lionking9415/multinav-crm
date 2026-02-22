import React, { useState, useEffect, useRef } from 'react';
import { Mail, Loader2, RefreshCw, CheckCircle, AlertCircle, ShieldCheck } from 'lucide-react';
import { initiate2FA, verify2FACode, saveTrustedDevice, generateDeviceFingerprint } from '../services/twoFactorService';

interface EmailVerificationProps {
  userId: string;
  userEmail: string;
  userName: string;
  onVerified: () => void;
  onCancel: () => void;
}

const OTP_LENGTH = 6;

const EmailVerification: React.FC<EmailVerificationProps> = ({
  userId,
  userEmail,
  userName,
  onVerified,
  onCancel
}) => {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [trustDevice, setTrustDevice] = useState(true);
  const [resendCooldown, setResendCooldown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Mask email for display
  const maskedEmail = userEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3');

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleDigitChange = (index: number, value: string) => {
    // Allow only digits
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    setError('');

    // Auto-advance to next input
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits filled
    if (digit && index === OTP_LENGTH - 1) {
      const code = [...newDigits.slice(0, OTP_LENGTH - 1), digit].join('');
      if (code.length === OTP_LENGTH) {
        handleVerify(code);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const newDigits = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((ch, i) => { newDigits[i] = ch; });
    setDigits(newDigits);
    setError('');
    const nextEmpty = pasted.length < OTP_LENGTH ? pasted.length : OTP_LENGTH - 1;
    inputRefs.current[nextEmpty]?.focus();
    if (pasted.length === OTP_LENGTH) {
      handleVerify(pasted);
    }
  };

  const handleVerify = async (code?: string) => {
    const token = code ?? digits.join('');
    if (token.length !== OTP_LENGTH) {
      setError('Please enter the full 6-digit code.');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const result = await verify2FACode(userEmail, token);

      if (result.success) {
        setSuccess('Verification successful!');

        if (trustDevice) {
          const deviceHash = generateDeviceFingerprint();
          await saveTrustedDevice(userId, userEmail, deviceHash);
        }

        setTimeout(() => {
          onVerified();
        }, 800);
      } else {
        setError(result.message);
        // Clear digits on failure so user can re-enter
        setDigits(Array(OTP_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
      setDigits(Array(OTP_LENGTH).fill(''));
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
        setSuccess('New code sent! Check your inbox.');
        setResendCooldown(60);
        setDigits(Array(OTP_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
        setTimeout(() => setSuccess(''), 5000);
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
            <div className="p-4 bg-baby-blue-500 rounded-full">
              <ShieldCheck className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Two-Factor Authentication</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            We've sent a 6-digit code to
          </p>
          <p className="text-baby-blue-600 dark:text-baby-blue-400 font-semibold text-lg mt-1">
            {maskedEmail}
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg flex items-center gap-3">
            <CheckCircle size={20} />
            <span className="font-medium">{success}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg flex items-center gap-3">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* OTP Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center">
            Enter verification code
          </label>
          <div className="flex justify-center gap-3">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                disabled={isVerifying}
                className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-lg focus:outline-none transition-colors
                  ${digit
                    ? 'border-baby-blue-500 bg-baby-blue-50 dark:bg-baby-blue-900/20 text-gray-800 dark:text-white'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white'
                  }
                  focus:border-baby-blue-500 dark:focus:border-baby-blue-400
                  disabled:opacity-50 disabled:cursor-not-allowed`}
              />
            ))}
          </div>
        </div>

        {/* Verify Button */}
        <button
          onClick={() => handleVerify()}
          disabled={isVerifying || digits.join('').length !== OTP_LENGTH}
          className="w-full py-3 px-4 bg-lime-green-500 hover:bg-lime-green-600 disabled:bg-lime-green-300 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <ShieldCheck className="w-5 h-5" />
              Verify Code
            </>
          )}
        </button>

        {/* Trust Device Checkbox */}
        <div className="mt-5">
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

        {/* Resend Code */}
        <div className="mt-5 text-center">
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
        <div className="mt-5 text-center">
          <button
            onClick={onCancel}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm"
          >
            ← Back to login
          </button>
        </div>

        {/* Info */}
        <div className="mt-5 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <p className="text-xs text-amber-700 dark:text-amber-400 text-center">
            <strong>Note:</strong> The code expires in 1 hour. Check your spam folder if you don't see the email.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;

