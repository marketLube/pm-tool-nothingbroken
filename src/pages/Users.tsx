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
import { Plus, Edit, Users, Search, Palette, Code, UserPlus, Check, X, UserCog, Key, Copy, RefreshCw, Eye, EyeOff, UserCheck, UserX, Calendar, Mail, Phone, MapPin, Building, Shield, ChevronDown, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { isValidEmail } from '../utils/validation';
import { generateUserFriendlyPassword, copyToClipboard } from '../utils/passwordGenerator';
import { getIndiaDate } from '../utils/timezone';
import PermissionGuard from '../components/auth/PermissionGuard';
import { useDebounce } from '../hooks/useDebounce';

const UserModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  user?: User;
}> = ({ isOpen, onClose, user }) => {
  const { addUser, updateUser } = useData();
  const { statuses, getStatusesByTeam } = useStatus();
  const { updateAvatar } = useAvatarManager();
  
  const [formData, setFormData] = useState<Partial<User>>(
    user || {
      name: '',
      email: '',
      role: 'employee',
      team: 'creative',
      isActive: true,
      allowedStatuses: [],
      joinDate: getIndiaDate(),
      password: ''
    }
  );
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [passwordGenerated, setPasswordGenerated] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Reset form data when the user prop changes (for editing different users)
  useEffect(() => {
    if (user) {
      setFormData(user);
      setSelectedFile(null);
    } else {
      setFormData({
        name: '',
        email: '',
        role: 'employee',
        team: 'creative',
        isActive: true,
        allowedStatuses: [],
        joinDate: getIndiaDate(),
        password: ''
      });
      setSelectedFile(null);
    }
  }, [user]);
  
  // Get statuses for the selected team
  const teamStatuses = useMemo(() => {
    if (!formData.team) return [];
    return getStatusesByTeam(formData.team as TeamType);
  }, [formData.team, getStatusesByTeam]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // If team changes, reset the allowed statuses
    if (name === 'team') {
      setFormData(prev => ({ 
        ...prev, 
        [name]: value as TeamType, 
        allowedStatuses: [] 
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
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

  const handleGeneratePassword = () => {
    const newPassword = generateUserFriendlyPassword(10);
    setFormData(prev => ({ ...prev, password: newPassword }));
    setPasswordGenerated(true);
    setShowPassword(true);
  };

  const handleCopyPassword = async () => {
    if (formData.password) {
      const success = await copyToClipboard(formData.password);
      if (success) {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }
    }
  };
  
  const handleStatusToggle = (statusId: string) => {
    setFormData(prev => {
      const currentStatuses = prev.allowedStatuses || [];
      
      if (currentStatuses.includes(statusId)) {
        // Remove status if already selected
        return {
          ...prev,
          allowedStatuses: currentStatuses.filter(id => id !== statusId)
        };
      } else {
        // Add status if not already selected
        return {
          ...prev,
          allowedStatuses: [...currentStatuses, statusId]
        };
      }
    });
  };
  
  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.joinDate) {
      newErrors.joinDate = 'Join date is required';
    }
    
    // Only validate password when creating a new user
    if (!user && (!formData.password || formData.password.length < 6)) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    // Check if at least one status is selected for non-admin users
    if (formData.role !== 'admin' && (!formData.allowedStatuses || formData.allowedStatuses.length === 0)) {
      newErrors.allowedStatuses = 'At least one status must be selected';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      console.error('Validation failed with errors:', errors);
      return;
    }
    
    try {
      // Process avatar file if available
      let avatarUrl = formData.avatar || '';
      if (selectedFile) {
        avatarUrl = URL.createObjectURL(selectedFile);
      }
      
      if (user) {
        // Updating existing user
        const updatedUser: User = {
          ...user,
          ...formData,
          avatar: avatarUrl,
          allowedStatuses: formData.allowedStatuses || []
        } as User;
        
        await updateUser(updatedUser);
        console.log('User updated successfully');
      } else {
        // Creating new user
        const newUser: Omit<User, 'id'> = {
          name: formData.name || '',
          email: formData.email || '',
          role: formData.role as Role,
          team: formData.team as TeamType,
          joinDate: formData.joinDate || getIndiaDate(),
          avatar: avatarUrl,
          isActive: true,
          allowedStatuses: formData.allowedStatuses || [],
          password: formData.password || ''
        };
        
        console.log('Attempting to create user:', {
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          team: newUser.team,
          hasAllowedStatuses: (newUser.allowedStatuses || []).length > 0
        });
        
        try {
          await addUser(newUser);
          console.log('User created successfully');
        } catch (err) {
          console.error('Failed to create user:', err);
          // Set a generic error message
          setErrors(prev => ({
            ...prev,
            form: 'Failed to create user. Please check the console for details.'
          }));
          return; // Don't close the modal if there's an error
        }
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving user:', error);
    }
  };
  
  const roleOptions = [
    { value: 'admin', label: 'Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'employee', label: 'Employee' }
  ];
  
  const teamOptions = [
    { value: 'creative', label: 'Creative Team' },
    { value: 'web', label: 'Web Team' }
  ];

  // Determine if we need to show status permissions (not needed for admins)
  const showStatusPermissions = formData.role !== 'admin';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={user ? 'Edit User' : 'Add New User'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col items-center mb-4">
          <FileUpload 
            label="Profile Picture"
            onChange={handleFileChange}
            preview={formData.avatar}
            maxSizeInMb={2}
          />
        </div>
        
        <Input
          label="Name"
          name="name"
          value={formData.name || ''}
          onChange={handleChange}
          error={errors.name}
          fullWidth
          required
        />
        
        <Input
          label="Email"
          name="email"
          type="email"
          value={formData.email || ''}
          onChange={handleChange}
          error={errors.email}
          fullWidth
          required
        />
        
        {/* Password field - show for new users or when editing with reset option */}
        {(!user || passwordGenerated) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
                } bg-white focus:outline-none focus:ring-2 focus:shadow-sm text-sm`}
                placeholder="Minimum 6 characters"
                required={!user}
              />
              <div className="absolute inset-y-0 right-0 flex items-center space-x-1 pr-3">
                {formData.password && (
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className={`p-1 rounded transition-colors ${
                      copySuccess 
                        ? 'text-green-600 hover:text-green-800' 
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                    title="Copy password"
                  >
                    {copySuccess ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
            {passwordGenerated && (
              <p className="mt-1 text-sm text-green-600">
                New password generated! Make sure to copy it before saving.
              </p>
            )}
          </div>
        )}

        {/* Password reset section for existing users */}
        {user && !passwordGenerated && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900 flex items-center">
                  <Key className="h-4 w-4 mr-2 text-gray-600" />
                  Password Management
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  Generate a new password for this user
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={RefreshCw}
                onClick={handleGeneratePassword}
                className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
              >
                Generate New Password
              </Button>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Role"
            name="role"
            options={roleOptions}
            value={formData.role as string || ''}
            onChange={handleChange}
            fullWidth
            required
          />
          
          <Select
            label="Team"
            name="team"
            options={teamOptions}
            value={formData.team as string || ''}
            onChange={handleChange}
            fullWidth
            required
          />
        </div>
        
        <DatePicker
          label="Join Date"
          name="joinDate"
          value={formData.joinDate || ''}
          onChange={handleChange}
          error={errors.joinDate}
          fullWidth
          required
          max={getIndiaDate()} // Limit to today or earlier
        />
        
        {/* Status Permissions - only show for non-admin users */}
        {showStatusPermissions && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <UserCog className="h-4 w-4 inline mr-2" />
              Status View Permissions
            </label>
            <div className="border border-gray-200 rounded-lg p-4 bg-gradient-to-br from-gray-50 to-white">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-600">
                  Select which statuses this {formData.role} can view and modify:
                </p>
                <div className="text-xs text-gray-500">
                  {(formData.allowedStatuses || []).length} of {teamStatuses.length} selected
                </div>
              </div>
              
              {teamStatuses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                  {teamStatuses.map(status => (
                    <div 
                      key={status.id} 
                      className={`flex items-center p-3 rounded-md border transition-all duration-200 cursor-pointer ${
                        (formData.allowedStatuses || []).includes(status.id)
                          ? 'border-blue-200 bg-blue-50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => handleStatusToggle(status.id)}
                    >
                      <Checkbox
                        id={`status-${status.id}`}
                        checked={(formData.allowedStatuses || []).includes(status.id)}
                        onChange={() => handleStatusToggle(status.id)}
                      />
                      <label 
                        htmlFor={`status-${status.id}`}
                        className="ml-3 flex items-center text-sm font-medium cursor-pointer flex-grow"
                      >
                        <div 
                          className="w-4 h-4 rounded-full mr-3 border-2 border-white shadow-sm" 
                          style={{ backgroundColor: status.color }}
                        />
                        <span className="text-gray-700">{status.name}</span>
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <UserCog className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No statuses found for the selected team.</p>
                  <p className="text-xs text-gray-400 mt-1">Please select a team first.</p>
                </div>
              )}
              
              {/* Quick select buttons */}
              {teamStatuses.length > 0 && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ 
                        ...prev, 
                        allowedStatuses: teamStatuses.map(s => s.id) 
                      }))}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Select All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ 
                        ...prev, 
                        allowedStatuses: [] 
                      }))}
                      className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="text-xs text-gray-500">
                    {formData.role === 'manager' ? 'Managers can modify these statuses' : 'Employees can view these statuses'}
                  </div>
                </div>
              )}
            </div>
            {errors.allowedStatuses && (
              <p className="mt-2 text-sm text-red-600 flex items-center">
                <X className="h-4 w-4 mr-1" />
                {errors.allowedStatuses}
              </p>
            )}
          </div>
        )}
        
        {/* General form error */}
        {errors.form && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{errors.form}</p>
          </div>
        )}
        
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            variant="secondary"
            onClick={onClose}
            type="button"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
          >
            {user ? 'Update User' : 'Add User'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const UsersPage: React.FC = () => {
  const { users, toggleUserStatus, searchUsers, addUser } = useData();
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<TeamType | 'all'>('all');
  const [selectedRole, setSelectedRole] = useState<Role | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  
  // Database search state
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Debounced search query to optimize database calls
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  
  // Database search effect - replaces all client-side filtering
  useEffect(() => {
    const performSearch = async () => {
      setIsSearching(true);
      try {
        // Build search filters based on current state
        const filters = {
          team: selectedTeam !== 'all' ? selectedTeam : undefined,
          role: selectedRole !== 'all' ? selectedRole : undefined,
          isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
          searchQuery: debouncedSearchQuery || undefined
        };

        const searchResults = await searchUsers(filters);
        setFilteredUsers(searchResults);
        
        console.log(`[Users Database Search] Found ${searchResults.length} users`);
      } catch (error) {
        console.error('Error performing database search:', error);
        setFilteredUsers([]);
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [
    debouncedSearchQuery,
    selectedTeam,
    selectedRole,
    statusFilter,
    searchUsers
  ]);

  // Handle team filter change
  const handleTeamFilterChange = (team: TeamType | 'all') => {
    setSelectedTeam(team);
    setTeamDropdownOpen(false);
  };

  // Handle role filter change  
  const handleRoleFilterChange = (role: Role | 'all') => {
    setSelectedRole(role);
    setRoleDropdownOpen(false);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTeam('all');
    setSelectedRole('all');
    setStatusFilter('all');
  };

  // Calculate team statistics
  const teamStats = {
    creative: filteredUsers.filter(user => user.team === 'creative').length,
    web: filteredUsers.filter(user => user.team === 'web').length,
    admin: filteredUsers.filter(user => user.role === 'admin').length,
    active: filteredUsers.filter(user => user.isActive).length,
    inactive: filteredUsers.filter(user => !user.isActive).length
  };

  const getRoleBadgeColor = (role: Role) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'employee': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTeamBadgeColor = (team: TeamType) => {
    switch (team) {
      case 'creative': return 'bg-purple-100 text-purple-800';
      case 'web': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAddUser = () => {
    setSelectedUser(undefined);
    setUserModalOpen(true);
  };
  
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setUserModalOpen(true);
  };
  
  const handleToggleUserStatus = async (userId: string) => {
    try {
      await toggleUserStatus(userId);
      // Success! No need to do anything else as the state is updated in DataContext
    } catch (error) {
      console.error('Failed to toggle user status:', error);
      // You can add a toast notification here if you have a toast system
      alert('Failed to toggle user status. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">User Management</h1>
        </div>
        
        <PermissionGuard
          resource="user"
          action="create"
        >
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
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex flex-col space-y-4">
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
              </CardTitle>
              
              {/* Team filter tabs */}
              <div className="flex space-x-2">
                <ButtonGroup
                  options={[
                    { value: 'all', label: 'All Users' },
                    { value: 'creative', label: 'Creative Team', icon: Palette },
                    { value: 'web', label: 'Web Team', icon: Code }
                  ]}
                  value={selectedTeam}
                  onChange={(value) => handleTeamFilterChange(value as TeamType | 'all')}
                />
              </div>
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
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team
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
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className={!user.isActive ? 'bg-gray-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Avatar 
                          src={user.avatar} 
                          name={user.name} 
                          size="sm" 
                        />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant={
                          user.role === 'admin' ? 'primary' :
                          user.role === 'manager' ? 'info' : 'default'
                        }
                      >
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 flex items-center">
                        {user.role === 'admin' ? (
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
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{user.joinDate}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant={user.isActive ? 'success' : 'danger'}
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {user.role === 'admin' ? (
                          <span className="text-primary-600">Full Access</span>
                        ) : user.allowedStatuses && user.allowedStatuses.length > 0 ? (
                          <span>{user.allowedStatuses.length} Status{user.allowedStatuses.length !== 1 ? 'es' : ''}</span>
                        ) : (
                          <span className="text-gray-400">None Set</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="xs"
                          icon={Edit}
                          onClick={() => handleEditUser(user)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant={user.isActive ? 'danger' : 'primary'}
                          size="xs"
                          onClick={() => handleToggleUserStatus(user.id)}
                        >
                          {user.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                      No users found
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
      />
    </div>
  );
};

export default UsersPage;