import React, { useState, useEffect } from 'react';
import type { User, UserRole } from '../types';
import Card from './Card';
import { UserPlus, Edit2, Trash2, Shield, Users, Navigation, Mail, Lock, MapPin, Phone, Check, X } from 'lucide-react';
import { userService } from '../services/supabaseService';

const LOCATIONS = ['Canning', 'Gosnells', 'Mandurah', 'Stirling', 'Swan', 'Wanneroo'];

interface UserManagementProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, setUsers }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'navigator' as UserRole,
    assignedLocations: [] as string[],
    phoneNumber: '',
    twoFactorEnabled: false
  });

  const loadUsers = async () => {
    try {
      setLoading(true);
      const allUsers = await userService.getAll();
      setUsers(allUsers);
    } catch (err) {
      console.error('Failed to load users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.fullName || !formData.email || (!editingUser && !formData.password)) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.assignedLocations.length === 0) {
      setError('Please assign at least one location');
      return;
    }

    try {
      if (editingUser) {
        // Update existing user
        const updates: Partial<User> & { password?: string } = {
          fullName: formData.fullName,
          email: formData.email,
          role: formData.role,
          assignedLocations: formData.assignedLocations,
          phoneNumber: formData.phoneNumber || undefined,
          twoFactorEnabled: formData.twoFactorEnabled
        };
        
        // Include password if provided (for password reset by admin)
        if (formData.password && formData.password.length >= 8) {
          updates.password = formData.password;
        }
        
        await userService.update(editingUser.id, updates);
        setSuccess(formData.password ? 'User updated and password reset successfully' : 'User updated successfully');
      } else {
        // Create new user
        const newUser = {
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          assignedLocations: formData.assignedLocations,
          phoneNumber: formData.phoneNumber || undefined,
          twoFactorEnabled: formData.twoFactorEnabled,
          isActive: true
        };
        
        await userService.create(newUser);
        setSuccess('User created successfully');
      }

      // Reload users and reset form
      await loadUsers();
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Failed to save user');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await userService.delete(userId);
      setSuccess('User deleted successfully');
      await loadUsers();
    } catch (err) {
      setError('Failed to delete user');
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      email: '',
      password: '',
      role: 'navigator',
      assignedLocations: [],
      phoneNumber: '',
      twoFactorEnabled: false
    });
    setShowAddForm(false);
    setEditingUser(null);
  };

  const startEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      fullName: user.fullName,
      email: user.email,
      password: '', // Don't populate password for security
      role: user.role,
      assignedLocations: user.assignedLocations,
      phoneNumber: user.phoneNumber || '',
      twoFactorEnabled: user.twoFactorEnabled || false
    });
    setShowAddForm(false);
  };

  const toggleLocation = (location: string) => {
    setFormData(prev => ({
      ...prev,
      assignedLocations: prev.assignedLocations.includes(location)
        ? prev.assignedLocations.filter(l => l !== location)
        : [...prev.assignedLocations, location]
    }));
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin': return <Shield className="w-4 h-4" />;
      case 'coordinator': return <Users className="w-4 h-4" />;
      case 'navigator': return <Navigation className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'text-red-600 bg-red-100';
      case 'coordinator': return 'text-blue-600 bg-blue-100';
      case 'navigator': return 'text-green-600 bg-green-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-green-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">User Management</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage staff accounts and permissions
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-lime-green-500 text-white rounded-lg hover:bg-lime-green-600 transition-colors"
          >
            <UserPlus className="w-5 h-5" />
            <span>Add User</span>
          </button>
        </div>
      </Card>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4">
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {/* Add New User Form */}
      {showAddForm && !editingUser && (
        <Card>
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">
            Add New User
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-lime-green-500 dark:bg-gray-800 dark:border-gray-600"
                  placeholder="John Smith"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-lime-green-500 dark:bg-gray-800 dark:border-gray-600"
                    placeholder="john.smith@archehealthwa.org.au"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {editingUser ? 'New Password (leave blank to keep current)' : 'Temporary Password *'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-lime-green-500 dark:bg-gray-800 dark:border-gray-600"
                    placeholder={editingUser ? 'Enter new password to change' : 'Minimum 8 characters'}
                    required={!editingUser}
                    minLength={formData.password ? 8 : 0}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {editingUser 
                    ? 'Only fill this if you want to reset the user\'s password' 
                    : 'User will be prompted to change on first login'}
                </p>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-lime-green-500 dark:bg-gray-800 dark:border-gray-600"
                >
                  <option value="navigator">Navigator (Basic Access)</option>
                  <option value="coordinator">Coordinator (Extended Access)</option>
                  <option value="admin">Administrator (Full Access)</option>
                </select>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number (for 2FA)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-lime-green-500 dark:bg-gray-800 dark:border-gray-600"
                    placeholder="+61 400 000 000"
                  />
                </div>
              </div>

              {/* 2FA Toggle */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="twoFactor"
                  checked={formData.twoFactorEnabled}
                  onChange={(e) => setFormData({ ...formData, twoFactorEnabled: e.target.checked })}
                  className="w-4 h-4 text-lime-green-600 border-gray-300 rounded focus:ring-lime-green-500"
                />
                <label htmlFor="twoFactor" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enable Two-Factor Authentication
                </label>
              </div>
            </div>

            {/* Location Assignment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Assigned Locations * (Select one or more)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {LOCATIONS.map(location => (
                  <button
                    key={location}
                    type="button"
                    onClick={() => toggleLocation(location)}
                    className={`px-3 py-2 rounded-lg border-2 transition-all ${
                      formData.assignedLocations.includes(location)
                        ? 'border-lime-green-500 bg-lime-green-50 text-lime-green-700 dark:bg-lime-green-900 dark:text-lime-green-300'
                        : 'border-gray-300 hover:border-gray-400 dark:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <MapPin className="w-4 h-4" />
                      <span className="ml-2">{location}</span>
                      {formData.assignedLocations.includes(location) && (
                        <Check className="w-4 h-4 ml-2" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-lime-green-500 text-white rounded-lg hover:bg-lime-green-600 transition-colors"
              >
                {editingUser ? 'Update User' : 'Create User'}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Users Table */}
      <Card>
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">
          Registered Users ({users.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Email</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Role</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Locations</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">2FA</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <React.Fragment key={user.id}>
                  <tr className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 ${editingUser?.id === user.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{user.fullName}</div>
                      <div className="text-xs text-gray-500">ID: {user.id}</div>
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{user.email}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                        {getRoleIcon(user.role)}
                        <span className="capitalize">{user.role}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {user.assignedLocations.map(loc => (
                          <span key={loc} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                            {loc}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {user.twoFactorEnabled ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <X className="w-5 h-5 text-gray-400" />
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => editingUser?.id === user.id ? resetForm() : startEdit(user)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          title={editingUser?.id === user.id ? 'Cancel edit' : 'Edit user'}
                        >
                          <Edit2 className={`w-4 h-4 ${editingUser?.id === user.id ? 'text-gray-400' : 'text-blue-600'}`} />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          title="Delete user"
                          disabled={user.email === 'admin@multinav.com'}
                        >
                          <Trash2 className={`w-4 h-4 ${user.email === 'admin@multinav.com' ? 'text-gray-400' : 'text-red-600'}`} />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Inline edit form row */}
                  {editingUser?.id === user.id && (
                    <tr className="border-b dark:border-gray-700 bg-blue-50 dark:bg-blue-900/10">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="border border-blue-200 dark:border-blue-700 rounded-xl p-5 bg-white dark:bg-gray-800 shadow-sm">
                          <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                            <Edit2 className="w-4 h-4 text-blue-600" />
                            Edit User — {user.fullName}
                          </h3>
                          <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Full Name */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Full Name *
                                </label>
                                <input
                                  type="text"
                                  value={formData.fullName}
                                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-lime-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                  placeholder="John Smith"
                                  required
                                />
                              </div>

                              {/* Email */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Email Address *
                                </label>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                  <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-lime-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    required
                                  />
                                </div>
                              </div>

                              {/* Password */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  New Password (leave blank to keep current)
                                </label>
                                <div className="relative">
                                  <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                  <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-lime-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    placeholder="Enter new password to change"
                                    minLength={formData.password ? 8 : 0}
                                  />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Only fill this if you want to reset the user's password</p>
                              </div>

                              {/* Role */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Role *
                                </label>
                                <select
                                  value={formData.role}
                                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-lime-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                >
                                  <option value="navigator">Navigator (Basic Access)</option>
                                  <option value="coordinator">Coordinator (Extended Access)</option>
                                  <option value="admin">Administrator (Full Access)</option>
                                </select>
                              </div>

                              {/* Phone Number */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Phone Number (for 2FA)
                                </label>
                                <div className="relative">
                                  <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                  <input
                                    type="tel"
                                    value={formData.phoneNumber}
                                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-lime-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    placeholder="+61 400 000 000"
                                  />
                                </div>
                              </div>

                              {/* 2FA Toggle */}
                              <div className="flex items-center space-x-2 pt-6">
                                <input
                                  type="checkbox"
                                  id={`twoFactor-${user.id}`}
                                  checked={formData.twoFactorEnabled}
                                  onChange={(e) => setFormData({ ...formData, twoFactorEnabled: e.target.checked })}
                                  className="w-4 h-4 text-lime-green-600 border-gray-300 rounded focus:ring-lime-green-500"
                                />
                                <label htmlFor={`twoFactor-${user.id}`} className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Enable Two-Factor Authentication
                                </label>
                              </div>
                            </div>

                            {/* Location Assignment */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Assigned Locations * (Select one or more)
                              </label>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {LOCATIONS.map(location => (
                                  <button
                                    key={location}
                                    type="button"
                                    onClick={() => toggleLocation(location)}
                                    className={`px-3 py-2 rounded-lg border-2 transition-all ${
                                      formData.assignedLocations.includes(location)
                                        ? 'border-lime-green-500 bg-lime-green-50 text-lime-green-700 dark:bg-lime-green-900 dark:text-lime-green-300'
                                        : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:text-gray-300'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <MapPin className="w-4 h-4" />
                                      <span className="ml-2">{location}</span>
                                      {formData.assignedLocations.includes(location) && (
                                        <Check className="w-4 h-4 ml-2" />
                                      )}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Form Actions */}
                            <div className="flex justify-end space-x-3 pt-3 border-t dark:border-gray-700">
                              <button
                                type="button"
                                onClick={resetForm}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-300"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="px-4 py-2 bg-lime-green-500 text-white rounded-lg hover:bg-lime-green-600 transition-colors"
                              >
                                Update User
                              </button>
                            </div>
                          </form>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Role Permissions Info */}
      <Card>
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Role Permissions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Navigation className="w-5 h-5 text-green-600" />
              <h4 className="font-semibold text-green-800 dark:text-green-200">Navigator</h4>
            </div>
            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <li>✓ Client Management</li>
              <li>✓ Health Navigation</li>
              <li>✓ Local Demographics</li>
              <li>✓ GP Engagement</li>
              <li>✓ Program Resources</li>
              <li className="text-red-600 dark:text-red-400">✗ No Reporting Access</li>
            </ul>
          </div>
          
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Users className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold text-blue-800 dark:text-blue-200">Coordinator</h4>
            </div>
            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <li>✓ All Navigator Features</li>
              <li>✓ Dashboard</li>
              <li>✓ Program Reporting</li>
              <li>✓ Workforce Tracking</li>
              <li>✓ AI Insights</li>
              <li className="text-red-600 dark:text-red-400">✗ No Unified Reporting</li>
            </ul>
          </div>
          
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="w-5 h-5 text-red-600" />
              <h4 className="font-semibold text-red-800 dark:text-red-200">Administrator</h4>
            </div>
            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <li>✓ All Features</li>
              <li>✓ Unified Reporting</li>
              <li>✓ User Management</li>
              <li>✓ Activity Logs</li>
              <li>✓ System Settings</li>
              <li>✓ Full Control</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default UserManagement;