import React, { useState, useRef, useEffect } from 'react';
import { Leaf, Mail, KeyRound, User, Loader2, ArrowLeft, CheckCircle, Lock } from 'lucide-react';
import type { Client } from '../types';
import { userService, clientService } from '../services/supabaseService';
import { isDeviceTrusted, initiate2FA, generateDeviceFingerprint } from '../services/twoFactorService';
import { supabase } from '../services/supabaseService';
import EmailVerification from './EmailVerification';

interface SimpleAuthPageProps {
  onStaffLogin: (userRole?: 'admin' | 'coordinator' | 'navigator', userEmail?: string) => void;
  onPatientLogin: (client: Client) => void;
  clients: Client[];
}

// Pending user info for 2FA
interface PendingUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'coordinator' | 'navigator';
  twoFactorEnabled: boolean;
}

const SimpleAuthPage: React.FC<SimpleAuthPageProps> = ({ onStaffLogin, onPatientLogin, clients }) => {
  const [authMode, setAuthMode] = useState<'staff' | 'patient'>('staff');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientPassword, setClientPassword] = useState('');
  const [error, setError] = useState('');
  const [isStaffLoading, setIsStaffLoading] = useState(false);
  
  // 2FA state
  const [show2FA, setShow2FA] = useState(false);
  const [pendingUser, setPendingUser] = useState<PendingUser | null>(null);
  
  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const forgotEmailRef = useRef<HTMLInputElement>(null);
  
  // Password reset state (after clicking magic link)
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetUserId, setResetUserId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');
  
  // Check URL for password reset redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isPasswordReset = urlParams.get('reset_password') === 'true';
    const userId = urlParams.get('user_id');
    
    if (isPasswordReset && userId) {
      console.log('[PasswordReset] Detected password reset redirect for user:', userId);
      
      // Listen for auth state change (password recovery event)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('[PasswordReset] Auth state changed:', event);
        
        // PASSWORD_RECOVERY is triggered when user clicks reset password link
        if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
          console.log('[PasswordReset] User verified via reset password link');
          setShowResetPassword(true);
          setResetUserId(userId);
          
          // Sign out from Supabase Auth (we only used it for verification)
          await supabase.auth.signOut();
          
          // Clear URL params
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      });
      
      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);
  
  // Handle password reset submission
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    
    if (newPassword.length < 8) {
      setResetError('Password must be at least 8 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match');
      return;
    }
    
    setResetLoading(true);
    
    try {
      // Update password in our custom users table
      const { error } = await supabase
        .from('users')
        .update({ password_hash: newPassword })
        .eq('id', resetUserId);
      
      if (error) {
        console.error('[PasswordReset] Error updating password:', error);
        setResetError('Failed to update password. Please try again.');
      } else {
        console.log('[PasswordReset] Password updated successfully');
        setResetSuccess(true);
      }
    } catch (err) {
      console.error('[PasswordReset] Exception:', err);
      setResetError('Failed to update password. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  // Handle forgot password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    
    // Get email from ref as fallback (handles browser autofill that doesn't trigger onChange)
    const emailFromRef = forgotEmailRef.current?.value || '';
    const emailToReset = (forgotEmail || emailFromRef).trim();
    console.log('[ForgotPassword] Email from state:', forgotEmail);
    console.log('[ForgotPassword] Email from ref:', emailFromRef);
    console.log('[ForgotPassword] Email to reset:', emailToReset);
    
    // Update state if we got email from ref
    if (!forgotEmail && emailFromRef) {
      setForgotEmail(emailFromRef);
    }
    
    if (!emailToReset) {
      setForgotError('Please enter your email address');
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToReset)) {
      setForgotError('Please enter a valid email address');
      return;
    }
    
    setForgotLoading(true);
    
    try {
      // First check if user exists in our custom users table
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('email', emailToReset)
        .single();
      
      if (userError || !existingUser) {
        console.log('[ForgotPassword] User not found in database');
        // Don't reveal if user exists or not for security
        setForgotSuccess(true);
        return;
      }
      
      console.log('[ForgotPassword] User found, sending reset password email to:', emailToReset);
      
      // Use Supabase Auth reset password email
      const { error } = await supabase.auth.resetPasswordForEmail(emailToReset, {
        redirectTo: `${window.location.origin}?reset_password=true&user_id=${existingUser.id}`
      });
      
      if (error) {
        console.error('[ForgotPassword] Error:', error);
        setForgotError(error.message);
      } else {
        console.log('[ForgotPassword] Reset email sent successfully');
        setForgotSuccess(true);
      }
    } catch (err) {
      console.error('[ForgotPassword] Exception:', err);
      setForgotError('Failed to send reset email. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Reset forgot password state
  const resetForgotPassword = () => {
    setShowForgotPassword(false);
    setForgotEmail('');
    setForgotSuccess(false);
    setForgotError('');
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsStaffLoading(true);
    
    try {
      // First try to authenticate against the database
      const result = await userService.authenticate(staffEmail, staffPassword);
      
      let authenticatedUser: PendingUser | null = null;
      
      if (result.success && result.user) {
        authenticatedUser = {
          id: result.user.id || staffEmail,
          email: result.user.email,
          name: result.user.fullName || staffEmail.split('@')[0],
          role: result.user.role,
          twoFactorEnabled: result.user.twoFactorEnabled || false
        };
      } else {
        // Fallback to demo accounts for backward compatibility
        const validAccounts = [
          { email: 'admin@multinav.com', password: 'password123', role: 'admin' as const, name: 'Admin User', twoFactorEnabled: false },
          { email: 'coordinator@multinav.com', password: 'password123', role: 'coordinator' as const, name: 'Coordinator User', twoFactorEnabled: false },
          { email: 'navigator@multinav.com', password: 'password123', role: 'navigator' as const, name: 'Navigator User', twoFactorEnabled: false }
        ];
        
        const account = validAccounts.find(
          acc => acc.email === staffEmail && acc.password === staffPassword
        );
        
        if (account) {
          authenticatedUser = {
            id: account.email,
            email: account.email,
            name: account.name,
            role: account.role,
            twoFactorEnabled: account.twoFactorEnabled
          };
        } else {
          setError(result.message || 'Invalid email or password');
          setIsStaffLoading(false);
          return;
        }
      }
      
      // User authenticated - check if 2FA is enabled for this user
      if (authenticatedUser) {
        // If 2FA is NOT enabled for this user, proceed directly to login
        if (!authenticatedUser.twoFactorEnabled) {
          console.log('[2FA] 2FA not enabled for user, proceeding to login');
          onStaffLogin(authenticatedUser.role, authenticatedUser.email);
          return;
        }
        
        // 2FA is enabled - check if device is trusted
        const deviceHash = generateDeviceFingerprint();
        console.log('[2FA] 2FA enabled, checking if device is trusted:', deviceHash);
        
        const trusted = await isDeviceTrusted(authenticatedUser.id, deviceHash);
        
        if (trusted) {
          // Device is trusted - proceed to login
          console.log('[2FA] Device is trusted, proceeding to login');
          onStaffLogin(authenticatedUser.role, authenticatedUser.email);
        } else {
          // Device not trusted - initiate 2FA
          console.log('[2FA] Device not trusted, initiating 2FA');
          const otpResult = await initiate2FA(
            authenticatedUser.id,
            authenticatedUser.email,
            authenticatedUser.name
          );
          
          if (otpResult.success) {
            setPendingUser(authenticatedUser);
            setShow2FA(true);
          } else {
            setError(otpResult.message);
          }
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please try again.');
    } finally {
      setIsStaffLoading(false);
    }
  };
  
  // Handle successful 2FA verification
  const handle2FAVerified = () => {
    if (pendingUser) {
      onStaffLogin(pendingUser.role, pendingUser.email);
    }
  };
  
  // Handle 2FA cancellation
  const handle2FACancel = () => {
    setShow2FA(false);
    setPendingUser(null);
  };

  const [isLoading, setIsLoading] = useState(false);

  const handlePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    // Normalize client ID - trim whitespace
    const normalizedClientId = clientId.trim();
    
      console.log('[PatientLogin] Attempting login with client ID:', normalizedClientId);
      console.log('[PatientLogin] Password length:', clientPassword.length);
    
    try {
      // First try to authenticate against the database
      const authenticatedClient = await clientService.authenticate(normalizedClientId, clientPassword);
      
      if (authenticatedClient) {
        console.log('[PatientLogin] Database authentication successful');
        onPatientLogin(authenticatedClient);
        return;
      }
      
      console.log('[PatientLogin] Database authentication failed, trying mock clients...');
      
      // Fallback: Check mock clients (for demo purposes when database is empty)
      // Use case-insensitive comparison for client ID
      const mockClient = clients.find(c => 
        c.id.toUpperCase() === normalizedClientId.toUpperCase() && c.password === clientPassword
      );
      
      if (mockClient) {
        console.log('[PatientLogin] Mock client authentication successful');
        onPatientLogin(mockClient);
      } else {
        console.log('[PatientLogin] All authentication methods failed');
        setError('Invalid Client ID or password. Please check your credentials and try again.');
      }
    } catch (error) {
      console.error('[PatientLogin] Error during authentication:', error);
      // If database authentication fails, try mock clients
      const mockClient = clients.find(c => 
        c.id.toUpperCase() === normalizedClientId.toUpperCase() && c.password === clientPassword
      );
      
      if (mockClient) {
        onPatientLogin(mockClient);
      } else {
        setError('Login failed. Please try again or contact your healthcare navigator.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Show email verification screen if needed
  if (show2FA && pendingUser) {
    return (
      <EmailVerification
        userId={pendingUser.id}
        userEmail={pendingUser.email}
        userName={pendingUser.name}
        onVerified={handle2FAVerified}
        onCancel={handle2FACancel}
      />
    );
  }

  // Show password reset form (after clicking magic link)
  if (showResetPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-baby-blue-100 to-lime-green-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-lime-green-500 rounded-full">
                <Lock className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Set New Password</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Enter your new password below
            </p>
          </div>

          {resetSuccess ? (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <CheckCircle className="w-12 h-12 text-green-500" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Password Updated!</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Your password has been successfully changed. You can now log in with your new password.
              </p>
              <button
                onClick={() => {
                  setShowResetPassword(false);
                  setResetSuccess(false);
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="w-full py-3 px-4 bg-lime-green-500 hover:bg-lime-green-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
              >
                Go to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {resetError && (
                <div className="p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
                  {resetError}
                </div>
              )}
              
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-green-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter new password"
                    required
                    minLength={8}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-green-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Confirm new password"
                    required
                    minLength={8}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={resetLoading}
                className="w-full py-3 px-4 bg-lime-green-500 hover:bg-lime-green-600 disabled:bg-lime-green-300 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {resetLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowResetPassword(false);
                  setNewPassword('');
                  setConfirmPassword('');
                  setResetError('');
                }}
                className="w-full py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm flex items-center justify-center gap-2"
              >
                <ArrowLeft size={16} />
                Cancel
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Show forgot password screen
  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-baby-blue-100 to-lime-green-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-baby-blue-500 rounded-full">
                <Mail className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Reset Password</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Enter your email to receive a password reset link
            </p>
          </div>

          {forgotSuccess ? (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <CheckCircle className="w-12 h-12 text-green-500" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Check Your Email</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                We've sent a password reset link to <strong>{forgotEmail}</strong>
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Click the link in the email to reset your password. The link expires in 1 hour.
              </p>
              <button
                onClick={resetForgotPassword}
                className="w-full py-3 px-4 bg-lime-green-500 hover:bg-lime-green-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
              >
                Back to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              {forgotError && (
                <div className="p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
                  {forgotError}
                </div>
              )}
              
              <div>
                <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    ref={forgotEmailRef}
                    id="forgot-email"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-baby-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full py-3 px-4 bg-baby-blue-500 hover:bg-baby-blue-600 disabled:bg-baby-blue-300 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {forgotLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>

              <button
                type="button"
                onClick={resetForgotPassword}
                className="w-full py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm flex items-center justify-center gap-2"
              >
                <ArrowLeft size={16} />
                Back to Login
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-baby-blue-100 to-lime-green-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-lime-green-500 rounded-full">
              <Leaf className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">MultiNav iCRM</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Integrated Care Reporting & Management</p>
        </div>

        {/* Tab Selector */}
        <div className="flex mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setAuthMode('staff')}
            className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
              authMode === 'staff'
                ? 'bg-white dark:bg-gray-800 text-lime-green-600 shadow-sm'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Staff Login
          </button>
          <button
            type="button"
            onClick={() => setAuthMode('patient')}
            className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
              authMode === 'patient'
                ? 'bg-white dark:bg-gray-800 text-lime-green-600 shadow-sm'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Patient Portal
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Staff Login Form */}
        {authMode === 'staff' ? (
          <form onSubmit={handleStaffSubmit} className="space-y-4">
            <div>
              <label htmlFor="staff-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  id="staff-email"
                  type="email"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-green-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="staff-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  id="staff-password"
                  type="password"
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-green-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(true);
                  setForgotEmail(staffEmail);
                }}
                className="text-sm text-baby-blue-600 dark:text-baby-blue-400 hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isStaffLoading}
              className="w-full py-3 px-4 bg-lime-green-500 hover:bg-lime-green-600 disabled:bg-lime-green-300 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              {isStaffLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Sign In as Staff'
              )}
            </button>
            
            <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
              Demo accounts:<br/>
              Admin: admin@multinav.com / password123<br/>
              Coordinator: coordinator@multinav.com / password123<br/>
              Navigator: navigator@multinav.com / password123
            </div>
          </form>
        ) : (
          /* Patient Login Form */
          <form onSubmit={handlePatientSubmit} className="space-y-4">
            <div>
              <label htmlFor="patient-id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Client ID
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  id="patient-id"
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-green-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter your Client ID"
                  required
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="patient-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  id="patient-password"
                  type="password"
                  value={clientPassword}
                  onChange={(e) => setClientPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-green-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-baby-blue-500 hover:bg-baby-blue-600 disabled:bg-baby-blue-300 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Access Patient Portal'
              )}
            </button>
            
            <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4 space-y-2">
              <p>Use your Client ID and password provided by your healthcare navigator</p>
              <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                <p className="font-medium text-gray-600 dark:text-gray-300">Demo accounts (if database is empty):</p>
                <p>Client ID: C4F2A1 / Password: pass123</p>
                <p>Client ID: C8B9D3 / Password: pass123</p>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SimpleAuthPage;