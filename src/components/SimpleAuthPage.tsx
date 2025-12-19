import React, { useState } from 'react';
import { Leaf, Mail, KeyRound, User, Loader2 } from 'lucide-react';
import type { Client } from '../types';
import { userService, clientService } from '../services/supabaseService';

interface SimpleAuthPageProps {
  onStaffLogin: (userRole?: 'admin' | 'coordinator' | 'navigator', userEmail?: string) => void;
  onPatientLogin: (client: Client) => void;
  clients: Client[];
}

const SimpleAuthPage: React.FC<SimpleAuthPageProps> = ({ onStaffLogin, onPatientLogin, clients }) => {
  const [authMode, setAuthMode] = useState<'staff' | 'patient'>('staff');
  const [staffEmail, setStaffEmail] = useState('admin@multinav.com');
  const [staffPassword, setStaffPassword] = useState('password123');
  const [clientId, setClientId] = useState('');
  const [clientPassword, setClientPassword] = useState('');
  const [error, setError] = useState('');

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      // First try to authenticate against the database
      const result = await userService.authenticate(staffEmail, staffPassword);
      
      if (result.success && result.user) {
        onStaffLogin(result.user.role, result.user.email);
      } else {
        // Fallback to demo accounts for backward compatibility
        const validAccounts = [
          { email: 'admin@multinav.com', password: 'password123', role: 'admin' as const },
          { email: 'coordinator@multinav.com', password: 'password123', role: 'coordinator' as const },
          { email: 'navigator@multinav.com', password: 'password123', role: 'navigator' as const }
        ];
        
        const account = validAccounts.find(
          acc => acc.email === staffEmail && acc.password === staffPassword
        );
        
        if (account) {
          onStaffLogin(account.role, account.email);
        } else {
          setError(result.message || 'Invalid email or password');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please try again.');
    }
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

            <button
              type="submit"
              className="w-full py-3 px-4 bg-lime-green-500 hover:bg-lime-green-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
            >
              Sign In as Staff
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