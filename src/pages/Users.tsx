import React, { useState, useMemo } from 'react';
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
import { useData } from '../contexts/DataContext';
import { useStatus } from '../contexts/StatusContext';
import { User, Role, TeamType } from '../types';
import { Plus, Edit, Users, Search, Palette, Code } from 'lucide-react';
import { format } from 'date-fns';

const UserModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  user?: User;
}> = ({ isOpen, onClose, user }) => {
  const { addUser, updateUser } = useData();
  const { statuses, getStatusesByTeam } = useStatus();
  
  const [formData, setFormData] = useState<Partial<User>>(
    user || {
      name: '',
      email: '',
      role: 'employee',
      team: 'creative',
      isActive: true,
      allowedStatuses: [],
      joinDate: format(new Date(), 'yyyy-MM-dd')
    }
  );
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Reset form data when the user prop changes (for editing different users)
  React.useEffect(() => {
    if (user) {
      setFormData(user);
    } else {
      setFormData({
        name: '',
        email: '',
        role: 'employee',
        team: 'creative',
        isActive: true,
        allowedStatuses: [],
        joinDate: format(new Date(), 'yyyy-MM-dd')
      });
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
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.joinDate) {
      newErrors.joinDate = 'Join date is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    if (user) {
      // Update existing user
      updateUser({
        ...user,
        ...formData
      } as User);
    } else {
      // Add new user
      addUser({
        ...formData
      } as Omit<User, 'id'>);
    }
    
    onClose();
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
          max={format(new Date(), 'yyyy-MM-dd')} // Limit to today or earlier
        />
        
        {/* Status Permissions - only show for non-admin users */}
        {showStatusPermissions && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {formData.role === 'manager' ? 'Manager Status Permissions' : 'Employee Status Permissions'}
            </label>
            <div className="border border-gray-200 rounded-md p-3 max-h-60 overflow-y-auto bg-gray-50">
              <p className="text-xs text-gray-500 mb-2">
                Select which statuses this user can access and modify:
              </p>
              {teamStatuses.length > 0 ? (
                <div className="space-y-2">
                  {teamStatuses.map(status => (
                    <div key={status.id} className="flex items-center">
                      <Checkbox
                        id={`status-${status.id}`}
                        checked={(formData.allowedStatuses || []).includes(status.id)}
                        onChange={() => handleStatusToggle(status.id)}
                      />
                      <label 
                        htmlFor={`status-${status.id}`}
                        className="ml-2 flex items-center text-sm"
                      >
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: status.color }}
                        />
                        {status.name}
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No statuses found for the selected team.</p>
              )}
            </div>
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
  const { users, toggleUserStatus } = useData();
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState<'all' | TeamType>('all');
  
  const handleAddUser = () => {
    setSelectedUser(undefined);
    setUserModalOpen(true);
  };
  
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setUserModalOpen(true);
  };
  
  // Apply filters
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Apply search filter
      const matchesSearch = 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());
        
      // Apply team filter - always include admin users regardless of their team
      const matchesTeam = teamFilter === 'all' || 
                         user.team === teamFilter || 
                         user.role === 'admin';
      
      return matchesSearch && matchesTeam;
    });
  }, [users, searchQuery, teamFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">User Management</h1>
        </div>
        
        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={handleAddUser}
        >
          Add User
        </Button>
      </div>
      
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex flex-col space-y-4">
              <CardTitle className="text-lg flex items-center">
                <Users className="h-5 w-5 mr-2 text-blue-600" />
                <span>
                  {teamFilter === 'all' ? 'All Users' : 
                   teamFilter === 'creative' ? 'Creative Team Users' : 
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
                  value={teamFilter}
                  onChange={(value) => setTeamFilter(value as 'all' | TeamType)}
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
                        {user.team === 'creative' ? (
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
                        {user.role !== 'admin' && (
                          <Button
                            variant="ghost"
                            size="xs"
                            icon={Edit}
                            onClick={() => handleEditUser(user)}
                          >
                            Edit
                          </Button>
                        )}
                        <Button
                          variant={user.isActive ? 'danger' : 'primary'}
                          size="xs"
                          onClick={() => toggleUserStatus(user.id)}
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