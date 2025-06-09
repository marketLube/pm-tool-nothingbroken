import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import ButtonGroup from '../components/ui/ButtonGroup';
import Checkbox from '../components/ui/Checkbox';
import DatePicker from '../components/ui/DatePicker';
import FileUpload from '../components/ui/FileUpload';
import { useData } from '../contexts/DataContext';
import { useStatus } from '../contexts/StatusContext';
import { useAuth } from '../contexts/AuthContext';
import { useAvatarManager } from '../utils/avatar';
import { User, Role, TeamType } from '../types';
import { Plus, Edit, Users, Search, Palette, Code, UserPlus, Check, X, UserCog, Key, Copy, RefreshCw, Eye, EyeOff, UserCheck, UserX, Calendar, Mail, Phone, MapPin, Building, Shield, ChevronDown, Loader2, AlertCircle, CheckCircle, User as UserIcon, Trash2, AlertTriangle, BarChart3, CreditCard, Bell, Plug, Database, Settings, Package } from 'lucide-react';
import { format } from 'date-fns';
import { isValidEmail } from '../utils/validation';
import { generateUserFriendlyPassword, copyToClipboard } from '../utils/passwordGenerator';
import { getIndiaDate } from '../utils/timezone';
import PermissionGuard from '../components/auth/PermissionGuard';
import { useDebounce } from '../hooks/useDebounce';
import { updateUser, createUser, getUsersByTeam, toggleUserStatus, updateUserPassword, deleteUser } from '../services/userService';
import { getTasksByUser } from '../services/taskService';

// Toast notification component for better user feedback
const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-50 border-green-200' : type === 'error' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200';
  const textColor = type === 'success' ? 'text-green-700' : type === 'error' ? 'text-red-700' : 'text-blue-700';
  const icon = type === 'success' ? <CheckCircle className="h-4 w-4" /> : type === 'error' ? <AlertCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />;

  return (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded-md border ${bgColor} ${textColor} flex items-center space-x-2 shadow-lg`}>
      {icon}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

// Delete confirmation modal component
const DeleteUserModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onConfirm: () => void;
  isLoading: boolean;
  hasActiveTasks: boolean;
  activeTaskCount: number;
}> = ({ isOpen, onClose, user, onConfirm, isLoading, hasActiveTasks, activeTaskCount }) => {
  if (!user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete User"
      size="md"
    >
      <div className="space-y-4">
        <div className="flex items-start space-x-3">
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${hasActiveTasks ? 'bg-red-100' : 'bg-amber-100'}`}>
            {hasActiveTasks ? (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-600" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900">
              {hasActiveTasks ? 'Cannot Delete User' : 'Confirm User Deletion'}
            </h3>
            {hasActiveTasks ? (
              <div className="mt-2 space-y-2">
                <p className="text-sm text-gray-600">
                  <strong>{user.name}</strong> cannot be deleted because they have <strong>{activeTaskCount} active task{activeTaskCount !== 1 ? 's' : ''}</strong> assigned.
                </p>
                <p className="text-sm text-red-600 font-medium">
                  To delete this user, first reassign or complete their active tasks.
                </p>
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                <p className="text-sm text-gray-600">
                  Are you sure you want to delete <strong>{user.name}</strong>? This action cannot be undone.
                </p>
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="flex items-center">
                    <Avatar src={user.avatar} name={user.name} size="sm" />
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                      <div className="text-xs text-gray-400">{user.role} • {user.team} team</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            {hasActiveTasks ? 'Close' : 'Cancel'}
          </Button>
          {!hasActiveTasks && (
            <Button
              variant="danger"
              onClick={onConfirm}
              disabled={isLoading}
              icon={isLoading ? Loader2 : Trash2}
              className={isLoading ? 'animate-spin' : ''}
            >
              {isLoading ? 'Deleting...' : 'Delete User'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

const UserModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  user?: User | null;
  onSuccess: (user: User, action: 'created' | 'updated') => void;
}> = ({ isOpen, onClose, user, onSuccess }) => {
  const { statuses, getStatusesByTeam } = useStatus();
  const { updateAvatar } = useAvatarManager();
  
  // Form state
  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    email: '',
    role: 'employee' as Role,
    team: 'creative' as TeamType,
    isActive: true,
    allowedStatuses: [],
    joinDate: getIndiaDate(),
    password: ''
  });
  
  // UI state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'password' | 'permissions' | 'modules'>('basic');
  
  // Module permissions state
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  
  // Enhanced password generation state with persistent display
  const [passwordState, setPasswordState] = useState({
    generated: false,
    saved: false,
    saving: false,
    generating: false,
    copied: false,
    autoSaveTimer: null as NodeJS.Timeout | null,
    displayTimer: null as NodeJS.Timeout | null,
    persistentDisplay: false
  });

  // Define available modules
  const availableModules = [
    { name: 'insights', displayName: 'Insights', description: 'Access to dashboards, analytics, and reports', icon: BarChart3 },
    { name: 'accounts', displayName: 'Accounts', description: 'Financial settings, billing, and invoicing', icon: CreditCard },
    { name: 'notifications', displayName: 'Notifications', description: 'Notification management and settings', icon: Bell },
    { name: 'integrations', displayName: 'Integrations', description: 'Third-party integrations and API access', icon: Plug },
    { name: 'audit_logs', displayName: 'Audit Logs', description: 'System audit logs and security monitoring', icon: Shield },
    { name: 'api_access', displayName: 'API Access', description: 'API keys and programmatic access', icon: Code },
    { name: 'system_settings', displayName: 'System Settings', description: 'Advanced system configuration', icon: Settings },
    { name: 'backup_restore', displayName: 'Backup & Restore', description: 'Database backup and restore operations', icon: Database }
  ];

  // Reset form when user changes or modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (user) {
        // Editing existing user
        const userData = { ...user };
        
        // If editing an admin user, ensure they have all status permissions
        if (userData.role === 'admin') {
          const creativeStatuses = getStatusesByTeam('creative');
          const webStatuses = getStatusesByTeam('web');
          const allStatuses = [...creativeStatuses, ...webStatuses].map(s => s.id);
          userData.allowedStatuses = allStatuses;
          // Keep the existing team value for admin users
        }
        
        setFormData(userData);
        setSelectedModules(userData.modulePermissions || []);
        setShowPassword(false);
        setActiveTab('basic');
      } else {
        // Creating new user
        setFormData({
          name: '',
          email: '',
          role: 'employee' as Role,
          team: 'creative' as TeamType,
          isActive: true,
          allowedStatuses: [],
          joinDate: getIndiaDate(),
          password: ''
        });
        setSelectedModules([]);
        setShowPassword(false);
        setActiveTab('basic');
      }
      
      // Reset all other states
      setSelectedFile(null);
      setErrors({});
      setIsSubmitting(false);
      
      // Clear any existing timers
      if (passwordState.autoSaveTimer) {
        clearTimeout(passwordState.autoSaveTimer);
      }
      if (passwordState.displayTimer) {
        clearTimeout(passwordState.displayTimer);
      }
      
      setPasswordState({
        generated: false,
        saved: false,
        saving: false,
        generating: false,
        copied: false,
        autoSaveTimer: null,
        displayTimer: null,
        persistentDisplay: false
      });
    }
  }, [user, isOpen, getStatusesByTeam]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (passwordState.autoSaveTimer) {
        clearTimeout(passwordState.autoSaveTimer);
      }
      if (passwordState.displayTimer) {
        clearTimeout(passwordState.displayTimer);
      }
    };
  }, [passwordState.autoSaveTimer, passwordState.displayTimer]);
  
  // Get statuses for the selected team or all statuses for admin
  const teamStatuses = useMemo(() => {
    // Handle admin users - they get all statuses regardless of team
    if (formData.role === 'admin') {
      const creativeStatuses = getStatusesByTeam('creative');
      const webStatuses = getStatusesByTeam('web');
      return [...creativeStatuses, ...webStatuses];
    }
    
    // Handle specific team selections for non-admin users
    if (formData.team === 'creative' || formData.team === 'web') {
      return getStatusesByTeam(formData.team);
    }
    
    // Default fallback
    return [];
  }, [formData.team, formData.role, getStatusesByTeam]);

  // Determine when to show modules tab (only for admin users)
  const showModulesTab = formData.role === 'admin';
  
  // Determine when to show status permissions (non-admin users)
  const showStatusPermissions = formData.role !== 'admin' && formData.role !== 'super_admin';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      // Special handling for team selection
      if (name === 'team' && value === 'all') {
        // Don't store 'all' in the database, keep the current team or default to 'creative'
        updated.team = prev.team || 'creative';
        return updated; // Exit early to avoid other team logic
      }
      
      // Special handling for admin role
      if (name === 'role' && value === 'admin') {
        // Admins automatically get access to both teams and all statuses
        const creativeStatuses = getStatusesByTeam('creative');
        const webStatuses = getStatusesByTeam('web');
        const allStatuses = [...creativeStatuses, ...webStatuses].map(s => s.id);
        
        updated.team = prev.team || 'creative'; // Keep existing team or default to creative
        updated.allowedStatuses = allStatuses;
      } else if (name === 'role' && value !== 'admin') {
        // Non-admin users: reset to current team's statuses only
        if (prev.role === 'admin') {
          const currentTeamStatuses = getStatusesByTeam(updated.team as TeamType);
          updated.allowedStatuses = currentTeamStatuses.map(s => s.id);
        }
      } else if (name === 'team' && updated.role !== 'admin') {
        // For new users, auto-assign common statuses based on team
        if (!user) {
          const teamStatuses = getStatusesByTeam(value as TeamType);
          // Auto-assign the most common statuses for new users
          const defaultStatuses = teamStatuses
            .filter(status => 
              ['in-progress', 'pending-review', 'completed', 'ready-to-start'].includes(status.name.toLowerCase().replace(/\s/g, '-'))
            )
            .map(s => s.id);
          
          updated.allowedStatuses = defaultStatuses.length > 0 ? defaultStatuses : teamStatuses.slice(0, 3).map(s => s.id);
        } else {
          // For existing users, only reset statuses for non-admin users when team changes
          updated.allowedStatuses = [];
        }
      }
      
      return updated;
    });
    
    // Clear error for the field being changed
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleFileChange = (file: File | null) => {
    setSelectedFile(file);
  };

  // Enhanced password generation with better UX
  const handleGeneratePassword = async () => {
    if (passwordState.generating || passwordState.saving) return;
    
    setPasswordState(prev => ({ 
      ...prev, 
      generating: true, 
      copied: false,
      persistentDisplay: false
    }));
    
    try {
      const newPassword = generateUserFriendlyPassword(12);
      setFormData(prev => ({ ...prev, password: newPassword }));
      setShowPassword(true);
      
      setPasswordState(prev => ({
        ...prev,
        generated: true,
        saved: false,
        generating: false,
        persistentDisplay: true
      }));
      
      // For existing users, set up auto-save with 3 second delay to allow user to see the password
      if (user) {
        const autoSaveTimer = setTimeout(async () => {
          await handleSavePassword(newPassword);
        }, 3000);
        
        setPasswordState(prev => ({ ...prev, autoSaveTimer }));
      }
      
      // For new users, show password persistently until they manually close or copy
      if (!user) {
        setPasswordState(prev => ({ ...prev, persistentDisplay: true }));
      }
      
    } catch (error) {
      console.error('Error generating password:', error);
      setErrors(prev => ({
        ...prev,
        password: 'Failed to generate password. Please try again.'
      }));
      setPasswordState(prev => ({ 
        ...prev, 
        generating: false,
        persistentDisplay: false
      }));
    }
  };

  const handleSavePassword = async (passwordToSave?: string) => {
    const password = passwordToSave || formData.password;
    if (!user || !password || passwordState.saving) return;
    
    // Clear auto-save timer if exists
    if (passwordState.autoSaveTimer) {
      clearTimeout(passwordState.autoSaveTimer);
    }
    
    setPasswordState(prev => ({ 
      ...prev, 
      saving: true,
      autoSaveTimer: null
    }));
    setErrors(prev => ({ ...prev, password: '' }));
    
    try {
      await updateUserPassword(user.id, password);
      setPasswordState(prev => ({
        ...prev,
        saved: true,
        saving: false,
        generated: false,
        persistentDisplay: true // Keep showing success message
      }));
      
      // Auto-hide success message after 5 seconds
      const displayTimer = setTimeout(() => {
        setPasswordState(prev => ({ 
          ...prev, 
          persistentDisplay: false,
          saved: false
        }));
      }, 5000);
      
      setPasswordState(prev => ({ ...prev, displayTimer }));
      
    } catch (error) {
      console.error('Error saving password:', error);
      setErrors(prev => ({
        ...prev,
        password: 'Failed to save password. Please try again.'
      }));
      setPasswordState(prev => ({ 
        ...prev, 
        saving: false,
        persistentDisplay: true
      }));
    }
  };

  const handleCopyPassword = async () => {
    if (!formData.password) return;
    
    try {
      await copyToClipboard(formData.password);
      setPasswordState(prev => ({ ...prev, copied: true }));
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setPasswordState(prev => ({ ...prev, copied: false }));
      }, 2000);
    } catch (error) {
      console.error('Failed to copy password:', error);
    }
  };

  const handleStatusToggle = (statusId: string) => {
    setFormData(prev => {
      const allowedStatuses = prev.allowedStatuses || [];
      const isSelected = allowedStatuses.includes(statusId);
      
      return {
        ...prev,
        allowedStatuses: isSelected
          ? allowedStatuses.filter(id => id !== statusId)
          : [...allowedStatuses, statusId]
      };
    });
  };

  const handleModuleToggle = (moduleName: string) => {
    const currentModules = [...selectedModules];
    const index = currentModules.indexOf(moduleName);
    
    if (index > -1) {
      currentModules.splice(index, 1);
    } else {
      currentModules.push(moduleName);
    }
    
    setSelectedModules(currentModules);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.role) {
      newErrors.role = 'Role is required';
    }
    
    if (!formData.team) {
      newErrors.team = 'Team is required';
    }
    
    // Password validation for new users
    if (!user && !formData.password) {
      newErrors.password = 'Password is required for new users';
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }
    
    if (!formData.joinDate) {
      newErrors.joinDate = 'Join date is required';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setIsSubmitting(true);
    setErrors({});
    
    try {
      let updatedUser: User;
      
      if (user) {
        // Update existing user
        const updateData = { ...formData };
        delete updateData.password; // Don't include password in user update
        
        updatedUser = await updateUser({ ...user, ...updateData } as User);
      } else {
        // Create new user
        updatedUser = await createUser(formData as Omit<User, 'id'>);
      }
      
      // Handle avatar upload if file is selected
      if (selectedFile && updatedUser.id) {
        try {
          const avatarUrl = updateAvatar(updatedUser, selectedFile);
          updatedUser.avatar = avatarUrl;
        } catch (error) {
          console.error('Error uploading avatar:', error);
          // Don't fail the entire operation for avatar upload issues
        }
      }
      
      onSuccess(updatedUser, user ? 'updated' : 'created');
      onClose();
    } catch (error) {
      console.error('Error saving user:', error);
      if (error instanceof Error) {
        setErrors({ form: error.message });
      } else {
        setErrors({ form: 'An unexpected error occurred. Please try again.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Enhanced password clearing with timer cleanup
  const clearPassword = () => {
    // Clear any existing timers
    if (passwordState.autoSaveTimer) {
      clearTimeout(passwordState.autoSaveTimer);
    }
    if (passwordState.displayTimer) {
      clearTimeout(passwordState.displayTimer);
    }
    
    setFormData(prev => ({ ...prev, password: '' }));
    setPasswordState({
      generated: false,
      saved: false,
      saving: false,
      generating: false,
      copied: false,
      autoSaveTimer: null,
      displayTimer: null,
      persistentDisplay: false
    });
    setShowPassword(false);
  };

  const roleOptions = [
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'admin', label: 'Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'employee', label: 'Employee' }
  ];
  
  // For admin users, show "All Teams" but store 'creative' as the value
  const getTeamDisplayValue = () => {
    if (formData.role === 'admin') {
      return 'all'; // Display "All Teams" for admin users
    }
    return formData.team || 'creative';
  };

  const teamOptions = [
    ...(formData.role === 'admin' ? [{ value: 'all', label: 'All Teams' }] : []),
    { value: 'creative', label: 'Creative Team' },
    { value: 'web', label: 'Web Team' }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={user ? 'Edit User' : 'Add New User'}
      size="md" // Changed from "lg" to "md" for more compact design
    >
      <form onSubmit={handleSubmit} className="space-y-4"> {/* Reduced spacing from space-y-6 */}
        
        {/* Compact Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              type="button"
              onClick={() => setActiveTab('basic')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'basic'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <UserIcon className="h-4 w-4 inline mr-1" />
              Basic Info
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('password')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'password'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Key className="h-4 w-4 inline mr-1" />
              Password
            </button>
            {showStatusPermissions && (
              <button
                type="button"
                onClick={() => setActiveTab('permissions')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'permissions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Shield className="h-4 w-4 inline mr-1" />
                Permissions
              </button>
            )}
            {showModulesTab && (
              <button
                type="button"
                onClick={() => setActiveTab('modules')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'modules'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Package className="h-4 w-4 inline mr-1" />
                Modules
              </button>
            )}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'basic' && (
          <div className="space-y-6">
            {/* Profile Picture Section - Improved Layout */}
            <div className="flex justify-center">
              <FileUpload 
                label="Profile Picture"
                onChange={handleFileChange}
                preview={formData.avatar}
                maxSizeInMb={2}
                compact={true}
                className="w-full max-w-xs"
              />
            </div>
            
            {/* Basic Information - Optimized Layout */}
            <div className="space-y-4">
              <div>
                <Input
                  label="Full Name"
                  name="name"
                  value={formData.name || ''}
                  onChange={handleChange}
                  error={errors.name}
                  required
                  fullWidth
                />
              </div>
              
              <div>
                <Input
                  label="Email Address"
                  name="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={handleChange}
                  error={errors.email}
                  required
                  fullWidth
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Select
                    label="Role"
                    name="role"
                    options={roleOptions}
                    value={formData.role as string || ''}
                    onChange={handleChange}
                    required
                    fullWidth
                  />
                </div>
                
                <div>
                  <Select
                    label="Team"
                    name="team"
                    options={teamOptions}
                    value={getTeamDisplayValue()}
                    onChange={handleChange}
                    required
                    fullWidth
                  />
                </div>
              </div>
              
              {/* Admin notice spanning full width across both fields */}
              {formData.role === 'admin' && (
                <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2 -mt-2">
                  <div className="flex items-center justify-center">
                    <Shield className="h-4 w-4 text-blue-600 mr-2" />
                    <span className="text-xs text-blue-700 font-medium">
                      Admins have full access to both Creative and Web teams
                    </span>
                  </div>
                </div>
              )}
              
              <div>
                <DatePicker
                  label="Join Date"
                  name="joinDate"
                  value={formData.joinDate || ''}
                  onChange={handleChange}
                  error={errors.joinDate}
                  required
                  fullWidth
                  max={getIndiaDate()}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'password' && (
          <div className="space-y-4">
            {/* Enhanced Password Section with Better UX */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900 flex items-center">
                  <Key className="h-4 w-4 mr-2 text-gray-600" />
                  {user ? 'Change Password' : 'Set Password'}
                </h3>
                {!user && (
                  <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-full">Required</span>
                )}
              </div>
              
              {/* Password Generation for Existing Users */}
              {user && !passwordState.generated && !passwordState.saved && !passwordState.persistentDisplay && (
                <div className="bg-white border border-gray-200 rounded-md p-3 mb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Generate New Password</p>
                      <p className="text-xs text-gray-600">Creates a secure 12-character password</p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      icon={passwordState.generating ? Loader2 : RefreshCw}
                      onClick={handleGeneratePassword}
                      disabled={passwordState.generating || passwordState.saving}
                      className={passwordState.generating ? 'animate-spin' : ''}
                    >
                      {passwordState.generating ? 'Generating...' : 'Generate'}
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Password Input Field - Enhanced with Persistent Display */}
              {(!user || passwordState.generated || passwordState.persistentDisplay) && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Password {user ? '(New Password)' : ''}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password || ''}
                      onChange={handleChange}
                      className={`block w-full pr-20 py-2.5 px-3 border rounded-md transition-all duration-200 ${
                        errors.password 
                          ? 'border-red-300 focus:ring-red-400 focus:border-red-500' 
                          : 'border-gray-300 hover:border-gray-400 focus:ring-blue-200 focus:border-blue-500'
                      } bg-white focus:outline-none focus:ring-2 focus:shadow-sm text-sm font-mono`}
                      placeholder={!user ? "Minimum 6 characters" : "Enter new password"}
                      required={!user}
                      readOnly={passwordState.generating || passwordState.saving}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center space-x-1 pr-2">
                      {formData.password && (
                        <button
                          type="button"
                          onClick={handleCopyPassword}
                          className={`p-1.5 rounded transition-colors ${
                            passwordState.copied 
                              ? 'text-green-600 hover:text-green-800 bg-green-100' 
                              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                          }`}
                          title="Copy password"
                        >
                          {passwordState.copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                  
                  {errors.password && (
                    <p className="text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.password}
                    </p>
                  )}
                  
                  {/* Generate Password Button for New Users */}
                  {!user && (
                    <div className="flex items-center justify-between">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        icon={passwordState.generating ? Loader2 : RefreshCw}
                        onClick={handleGeneratePassword}
                        disabled={passwordState.generating}
                        className={passwordState.generating ? 'animate-spin' : ''}
                      >
                        {passwordState.generating ? 'Generating...' : 'Generate Secure Password'}
                      </Button>
                      {formData.password && (
                        <button
                          type="button"
                          onClick={clearPassword}
                          className="text-sm text-gray-500 hover:text-gray-700"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {/* Enhanced Password Status Messages */}
              {passwordState.saving && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-3">
                  <div className="flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600 mr-2" />
                    <span className="text-sm text-blue-700">Saving password...</span>
                  </div>
                </div>
              )}
              
              {passwordState.saved && passwordState.persistentDisplay && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3 mt-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <span className="text-sm text-green-700">Password saved successfully! User can now login.</span>
                    </div>
                    <button
                      type="button"
                      onClick={clearPassword}
                      className="text-green-600 hover:text-green-800 text-sm font-medium"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
              
              {user && passwordState.generated && !passwordState.saved && !passwordState.saving && passwordState.persistentDisplay && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mt-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <AlertCircle className="h-4 w-4 text-amber-600 mr-2" />
                      <span className="text-sm text-amber-700">
                        Password generated! Auto-save in {passwordState.autoSaveTimer ? '3' : '0'} seconds
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        icon={Check}
                        onClick={() => handleSavePassword()}
                        disabled={!formData.password}
                      >
                        Save Now
                      </Button>
                      <button
                        type="button"
                        onClick={clearPassword}
                        className="text-amber-600 hover:text-amber-800 text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'permissions' && showStatusPermissions && (
          <div className="space-y-4">
            {/* Admin Full Access Notice */}
            {formData.role === 'admin' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <Shield className="h-5 w-5 text-blue-600 mr-2" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Administrator Access</h4>
                    <p className="text-xs text-blue-700 mt-1">
                      Admins have full access to both Creative and Web teams with all status permissions automatically granted.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Compact Status Permissions */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900 flex items-center">
                  <UserCog className="h-4 w-4 mr-2" />
                  {formData.role === 'admin' ? 'All Status Permissions (Both Teams)' : 'Status Permissions'}
                </h3>
                <div className="text-xs text-gray-500">
                  {(formData.allowedStatuses || []).length} of {teamStatuses.length} selected
                </div>
              </div>
              
              {teamStatuses.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs text-gray-600">
                    {formData.role === 'admin' 
                      ? 'Admin users have access to all statuses from both teams:'
                      : `Select which statuses this ${formData.role} can ${formData.role === 'manager' ? 'view and modify' : 'view'}:`
                    }
                  </p>
                  
                  <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                    {teamStatuses.map(status => {
                      const isFromCreativeTeam = getStatusesByTeam('creative').some(s => s.id === status.id);
                      const teamLabel = isFromCreativeTeam ? 'Creative' : 'Web';
                      
                      return (
                        <label 
                          key={status.id} 
                          className={`flex items-center p-2 rounded border transition-all ${
                            formData.role === 'admin' 
                              ? 'border-blue-200 bg-blue-50 cursor-default' 
                              : `cursor-pointer ${
                                  (formData.allowedStatuses || []).includes(status.id)
                                    ? 'border-blue-200 bg-blue-50'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                }`
                          }`}
                        >
                          <Checkbox
                            id={`status-${status.id}`}
                            checked={(formData.allowedStatuses || []).includes(status.id)}
                            onChange={() => formData.role !== 'admin' && handleStatusToggle(status.id)}
                            disabled={formData.role === 'admin'}
                          />
                          <div 
                            className="w-3 h-3 rounded-full mx-2 border border-white shadow-sm" 
                            style={{ backgroundColor: status.color }}
                          />
                          <span className="text-sm text-gray-700 flex-1">{status.name}</span>
                          {formData.role === 'admin' && (
                            <span className="text-xs text-blue-600 font-medium">
                              {teamLabel} Team
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  
                  {/* Quick Actions - Only for non-admin users */}
                  {formData.role !== 'admin' && (
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                      <div className="flex space-x-3">
                        <button
                          type="button"
                          onClick={() => {
                            const allStatuses = teamStatuses.map(s => s.id);
                            setFormData(prev => ({ ...prev, allowedStatuses: allStatuses }));
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, allowedStatuses: [] }))}
                          className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <UserCog className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No statuses found for the selected team.</p>
                </div>
              )}
            </div>
            
            {errors.allowedStatuses && (
              <p className="text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.allowedStatuses}
              </p>
            )}
          </div>
        )}

        {activeTab === 'modules' && showModulesTab && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900 flex items-center">
                  <Package className="h-4 w-4 mr-2" />
                  Module Permissions
                </h3>
                <div className="text-xs text-gray-500">
                  {selectedModules.length} of {availableModules.length} selected
                </div>
              </div>
              
              <p className="text-xs text-gray-600 mb-4">
                Select which modules this Admin can access. Admins have full team access by default.
              </p>
              
              <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto">
                {availableModules.map(module => {
                  const IconComponent = module.icon;
                  return (
                    <label 
                      key={module.name} 
                      className={`flex items-center p-3 rounded-lg border transition-all cursor-pointer ${
                        selectedModules.includes(module.name)
                          ? 'border-blue-200 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <Checkbox
                        id={`module-${module.name}`}
                        checked={selectedModules.includes(module.name)}
                        onChange={() => handleModuleToggle(module.name)}
                      />
                      <div className="flex items-start ml-3 flex-1">
                        <IconComponent className="h-5 w-5 text-gray-600 mr-3 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-900 block">{module.displayName}</span>
                          <span className="text-xs text-gray-500 mt-1 block">{module.description}</span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
              
              <div className="flex items-center justify-between pt-3 border-t border-gray-200 mt-4">
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setSelectedModules(availableModules.map(m => m.name))}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedModules([])}
                    className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                  >
                    Clear All
                  </button>
                </div>
                <div className="text-xs text-gray-500">
                  Super Admins have access to all modules automatically
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Form Error */}
        {errors.form && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
              <span className="text-sm text-red-600">{errors.form}</span>
            </div>
          </div>
        )}
        
        {/* Compact Form Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button
            variant="secondary"
            onClick={onClose}
            type="button"
            disabled={isSubmitting || passwordState.saving}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={isSubmitting || passwordState.saving}
            icon={isSubmitting ? Loader2 : undefined}
            className={isSubmitting ? 'animate-spin' : ''}
          >
            {isSubmitting 
              ? (user ? 'Updating...' : 'Creating...') 
              : (user ? 'Update User' : 'Create User')
            }
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const UsersPage: React.FC = () => {
  const { users, toggleUserStatus, searchUsers, addUser } = useData();
  const { currentUser } = useAuth();
  
  // State
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<TeamType | 'all'>('all');
  const [selectedRole, setSelectedRole] = useState<Role | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [userActiveTasks, setUserActiveTasks] = useState<number>(0);
  
  // Debounce search query
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  
  // Database search effect
  useEffect(() => {
    const performSearch = async () => {
      setIsSearching(true);
      try {
        const filters = {
          team: selectedTeam !== 'all' ? selectedTeam : undefined,
          role: selectedRole !== 'all' ? selectedRole : undefined,
          isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
          searchQuery: debouncedSearchQuery || undefined
        };

        const searchResults = await searchUsers(filters);
        setFilteredUsers(searchResults);
      } catch (error) {
        console.error('Error searching users:', error);
        setFilteredUsers([]);
        showToast('Error searching users', 'error');
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [debouncedSearchQuery, selectedTeam, selectedRole, statusFilter, searchUsers]);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
  };

  const handleUserSuccess = (user: User, action: 'created' | 'updated') => {
    // Refresh the user list
    const refreshSearch = async () => {
      try {
        const filters = {
          team: selectedTeam !== 'all' ? selectedTeam : undefined,
          role: selectedRole !== 'all' ? selectedRole : undefined,
          isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
          searchQuery: debouncedSearchQuery || undefined
        };
        const searchResults = await searchUsers(filters);
        setFilteredUsers(searchResults);
        
        showToast(
          `User ${action === 'created' ? 'created' : 'updated'} successfully!`,
          'success'
        );
      } catch (error) {
        console.error('Error refreshing users:', error);
      }
    };
    
    refreshSearch();
  };
  
  const handleAddUser = () => {
    setSelectedUser(null);
    setUserModalOpen(true);
  };
  
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setUserModalOpen(true);
  };
  
  const handleToggleUserStatus = async (userId: string) => {
    try {
      await toggleUserStatus(userId);
      // Refresh user list
      const filters = {
        team: selectedTeam !== 'all' ? selectedTeam : undefined,
        role: selectedRole !== 'all' ? selectedRole : undefined,
        isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
        searchQuery: debouncedSearchQuery || undefined
      };
      const searchResults = await searchUsers(filters);
      setFilteredUsers(searchResults);
      
      showToast('User status updated successfully!', 'success');
    } catch (error) {
      console.error('Failed to toggle user status:', error);
      showToast('Failed to update user status', 'error');
    }
  };

  const handleDeleteUser = async (user: User) => {
    try {
      setUserToDelete(user);
      
      // Check if user has active tasks
      console.log(`🔍 Checking active tasks for user: ${user.name}`);
      const userTasks = await getTasksByUser(user.id);
      
      // Filter for active tasks (not completed)
      const completedStatuses = [
        'done', 
        'approved', 
        'creative_approved',
        'completed',
        'web_completed',
        'handed_over',
        'web_handed_over'
      ];
      
      const activeTasks = userTasks.filter(task => !completedStatuses.includes(task.status));
      setUserActiveTasks(activeTasks.length);
      
      console.log(`📊 User ${user.name} has ${activeTasks.length} active tasks out of ${userTasks.length} total tasks`);
      
      setDeleteModalOpen(true);
    } catch (error) {
      console.error('Error checking user tasks:', error);
      showToast('Error checking user tasks', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete || !currentUser) return;
    
    try {
      setIsDeletingUser(true);
      console.log(`🗑️ Deleting user: ${userToDelete.name}`);
      
      await deleteUser(userToDelete.id, currentUser.id);
      
      // Refresh user list
      const filters = {
        team: selectedTeam !== 'all' ? selectedTeam : undefined,
        role: selectedRole !== 'all' ? selectedRole : undefined,
        isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
        searchQuery: debouncedSearchQuery || undefined
      };
      const searchResults = await searchUsers(filters);
      setFilteredUsers(searchResults);
      
      showToast(`User ${userToDelete.name} deleted successfully!`, 'success');
      
      // Close modal and reset state
      setDeleteModalOpen(false);
      setUserToDelete(null);
      setUserActiveTasks(0);
    } catch (error) {
      console.error('Failed to delete user:', error);
      showToast(error instanceof Error ? error.message : 'Failed to delete user', 'error');
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    setUserToDelete(null);
    setUserActiveTasks(0);
  };

  // Check if current user can delete the target user
  const canDeleteUser = (targetUser: User): boolean => {
    if (!currentUser) return false;
    
    const currentUserRole = currentUser.role;
    const targetUserRole = targetUser.role;
    
    // Super Admin can delete anyone except other Super Admins (to prevent accidental self-lock)
    if (currentUserRole === 'super_admin') {
      return true; // Allow Super Admin to delete anyone for now
    }
    
    // Admin can delete anyone except Super Admins
    if (currentUserRole === 'admin') {
      return targetUserRole !== 'super_admin';
    }
    
    // Other roles cannot delete users
    return false;
  };

  return (
    <div className="space-y-6">
      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      {/* Users Needing Attention Alert */}
      {(() => {
        const usersWithoutPermissions = filteredUsers.filter(user => 
          user.role !== 'admin' && (!user.allowedStatuses || user.allowedStatuses.length === 0) && user.isActive
        );
        
        return usersWithoutPermissions.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-amber-800">
                  Users Need Status Permissions
                </h3>
                <div className="mt-2 text-sm text-amber-700">
                  <p>
                    <strong>{usersWithoutPermissions.length} active user{usersWithoutPermissions.length !== 1 ? 's' : ''}</strong> don't have status permissions assigned and won't be able to log in:
                  </p>
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    {usersWithoutPermissions.slice(0, 3).map(user => (
                      <li key={user.id} className="flex items-center justify-between">
                        <span>{user.name} ({user.email})</span>
                        <Button
                          variant="warning"
                          size="xs"
                          icon={Edit}
                          onClick={() => handleEditUser(user)}
                          className="ml-2 bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          Assign Permissions
                        </Button>
                      </li>
                    ))}
                    {usersWithoutPermissions.length > 3 && (
                      <li className="text-amber-600 font-medium">
                        ...and {usersWithoutPermissions.length - 3} more
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
          <p className="text-gray-600 mt-1">Manage team members, roles, and permissions</p>
        </div>
        
        <PermissionGuard resource="user" action="create">
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={handleAddUser}
          >
            Add User
          </Button>
        </PermissionGuard>
      </div>
      
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <CardTitle className="text-lg flex items-center">
                  <Users className="h-5 w-5 mr-2 text-blue-600" />
                  <span>
                    {selectedTeam === 'all' ? 'All Users' : 
                     selectedTeam === 'creative' ? 'Creative Team Users' : 
                     'Web Team Users'}
                  </span>
                  <span className="ml-2 text-sm text-gray-500">
                    ({filteredUsers.length})
                  </span>
                  {isSearching && (
                    <Loader2 className="h-4 w-4 ml-2 animate-spin text-blue-600" />
                  )}
                </CardTitle>
              </div>
              
              <div className="relative max-w-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search users..."
                  className="block w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            {/* Filters */}
            <div className="flex flex-wrap gap-4">
              <ButtonGroup
                options={[
                  { value: 'all', label: 'All Teams' },
                  { value: 'creative', label: 'Creative', icon: Palette },
                  { value: 'web', label: 'Web', icon: Code }
                ]}
                value={selectedTeam}
                onChange={(value) => setSelectedTeam(value as TeamType | 'all')}
              />
              
              <ButtonGroup
                options={[
                  { value: 'all', label: 'All Roles' },
                  { value: 'admin', label: 'Admin' },
                  { value: 'manager', label: 'Manager' },
                  { value: 'employee', label: 'Employee' }
                ]}
                value={selectedRole}
                onChange={(value) => setSelectedRole(value as Role | 'all')}
              />
              
              <ButtonGroup
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' }
                ]}
                value={statusFilter}
                onChange={(value) => setStatusFilter(value as 'all' | 'active' | 'inactive')}
              />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role & Team
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Join Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Permissions
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className={`hover:bg-gray-50 transition-colors ${!user.isActive ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Avatar 
                          src={user.avatar} 
                          name={user.name} 
                          size="md" 
                        />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.name}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <Badge
                          variant={
                            user.role === 'super_admin' ? 'warning' :
                            user.role === 'admin' ? 'primary' :
                            user.role === 'manager' ? 'info' : 'default'
                          }
                        >
                          {user.role === 'super_admin' ? 'Super Admin' : 
                           user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </Badge>
                        <div className="text-sm text-gray-500 flex items-center">
                          {user.role === 'super_admin' ? (
                            <>
                              <Palette className="h-3.5 w-3.5 mr-1 text-purple-500" />
                              <Code className="h-3.5 w-3.5 mr-1 text-blue-500" />
                              Universal Access
                            </>
                          ) : user.role === 'admin' ? (
                            <>
                              <Palette className="h-3.5 w-3.5 mr-1 text-purple-500" />
                              <Code className="h-3.5 w-3.5 mr-1 text-blue-500" />
                              Both Teams
                            </>
                          ) : user.team === 'creative' ? (
                            <>
                              <Palette className="h-3.5 w-3.5 mr-1 text-purple-500" />
                              Creative Team
                            </>
                          ) : (
                            <>
                              <Code className="h-3.5 w-3.5 mr-1 text-blue-500" />
                              Web Team
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.joinDate}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant={user.isActive ? 'success' : 'danger'}
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {user.role === 'super_admin' ? (
                          <span className="text-yellow-600 font-medium">Super Admin Access</span>
                        ) : user.role === 'admin' ? (
                          <span className="text-blue-600 font-medium">Full Access</span>
                        ) : user.allowedStatuses && user.allowedStatuses.length > 0 ? (
                          <span>{user.allowedStatuses.length} Status{user.allowedStatuses.length !== 1 ? 'es' : ''}</span>
                        ) : (
                          <span className="text-gray-400">None Set</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex justify-center space-x-2">
                        <PermissionGuard resource="user" action="update">
                          <Button
                            variant="primary"
                            size="xs"
                            icon={Edit}
                            onClick={() => handleEditUser(user)}
                            className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700"
                            title="Edit user details, permissions, and password"
                          >
                            Edit User
                          </Button>
                        </PermissionGuard>
                        
                        <PermissionGuard resource="user" action="update">
                          <Button
                            variant={user.isActive ? 'warning' : 'success'}
                            size="xs"
                            icon={user.isActive ? UserX : UserCheck}
                            onClick={() => handleToggleUserStatus(user.id)}
                            title={user.isActive ? 'Deactivate this user' : 'Activate this user'}
                          >
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                        </PermissionGuard>
                        
                        <PermissionGuard resource="user" action="delete">
                          {canDeleteUser(user) ? (
                            <Button
                              variant="danger"
                              size="xs"
                              icon={Trash2}
                              onClick={() => handleDeleteUser(user)}
                              className="bg-red-600 hover:bg-red-700 text-white"
                              title="Delete this user permanently"
                            >
                              Delete
                            </Button>
                          ) : (
                            <Button
                              variant="danger"
                              size="xs"
                              icon={Trash2}
                              disabled
                              className="bg-gray-300 cursor-not-allowed"
                              title={`Cannot delete ${user.role === 'super_admin' ? 'Super Admin' : 'this'} user`}
                            >
                              Delete
                            </Button>
                          )}
                        </PermissionGuard>
                      </div>
                    </td>
                  </tr>
                ))}
                
                {filteredUsers.length === 0 && !isSearching && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">No users found</p>
                      <p className="text-gray-400 text-sm">Try adjusting your search or filters</p>
                    </td>
                  </tr>
                )}
                
                {isSearching && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Loader2 className="h-8 w-8 text-blue-600 mx-auto mb-2 animate-spin" />
                      <p className="text-gray-500">Searching users...</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      <UserModal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        user={selectedUser}
        onSuccess={handleUserSuccess}
      />
      
      <DeleteUserModal
        isOpen={deleteModalOpen}
        onClose={handleCloseDeleteModal}
        user={userToDelete}
        onConfirm={handleConfirmDelete}
        isLoading={isDeletingUser}
        hasActiveTasks={userActiveTasks > 0}
        activeTaskCount={userActiveTasks}
      />
    </div>
  );
};

export default UsersPage;