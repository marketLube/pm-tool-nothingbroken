import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useAuth } from '../contexts/AuthContext';
import { 
  Shield, 
  Settings, 
  Users, 
  CheckCircle, 
  XCircle,
  Plus,
  Crown,
  BarChart3,
  CreditCard,
  Bell,
  Code,
  Plug,
  Database,
  Loader2,
  AlertCircle,
  User,
  Check,
  X
} from 'lucide-react';
import { Module, ModulePermission, User as UserType } from '../types';
import {
  getAllModules,
  getAdminUsersWithModulePermissions,
  grantModulePermission,
  revokeModulePermission,
  promoteToSuperAdmin
} from '../services/moduleService';

// Icon mapping for modules
const moduleIcons: Record<string, React.ComponentType> = {
  BarChart3,
  CreditCard,
  Bell,
  Plug,
  Shield,
  Code,
  Settings,
  Database
};

const SuperAdminModules: React.FC = () => {
  const { currentUser, isSuperAdmin } = useAuth();
  const [modules, setModules] = useState<Module[]>([]);
  const [adminUsers, setAdminUsers] = useState<(UserType & { permissions: ModulePermission[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Redirect if not Super Admin
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card className="text-center p-8 shadow-lg border-0 bg-white">
            <div className="animate-fadeIn">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
                <Shield className="h-8 w-8 text-red-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-3">Super Admin Access Required</h1>
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                This module management section is restricted to Super Administrators only.
              </p>
              <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
                <Crown className="h-4 w-4" />
                <span>Super Admin privileges required</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [modulesData, usersData] = await Promise.all([
        getAllModules(),
        getAdminUsersWithModulePermissions()
      ]);

      setModules(modulesData);
      setAdminUsers(usersData);
    } catch (err) {
      setError('Failed to load module data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = async (userId: string, moduleName: string, hasPermission: boolean) => {
    if (!currentUser) return;

    const operationKey = `${userId}-${moduleName}`;
    setOperationLoading(operationKey);
    setError(null);
    setSuccessMessage(null);

    try {
      let result;
      if (hasPermission) {
        result = await revokeModulePermission(userId, moduleName, currentUser.id);
      } else {
        result = await grantModulePermission(userId, moduleName, currentUser.id);
      }

      if (result.success) {
        setSuccessMessage(result.message);
        await loadData(); // Refresh data
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to update module permission');
      console.error('Error updating permission:', err);
    } finally {
      setOperationLoading(null);
    }
  };

  const handlePromoteToSuperAdmin = async (userId: string) => {
    if (!currentUser) return;
    
    if (!window.confirm('Are you sure you want to promote this user to Super Admin? This action cannot be undone.')) {
      return;
    }

    setOperationLoading(`promote-${userId}`);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await promoteToSuperAdmin(userId, currentUser.id);
      
      if (result.success) {
        setSuccessMessage(result.message);
        await loadData(); // Refresh data
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to promote user to Super Admin');
      console.error('Error promoting user:', err);
    } finally {
      setOperationLoading(null);
    }
  };

  const getUserPermissionForModule = (user: UserType & { permissions: ModulePermission[] }, moduleName: string): boolean => {
    return user.permissions.some(p => p.moduleName === moduleName && p.isActive);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-lg text-gray-600">Loading modules...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Crown className="h-8 w-8 text-yellow-600 mr-3" />
                Super Admin Modules
              </h1>
              <p className="text-gray-600 mt-2">
                Manage module permissions for Admin users
              </p>
            </div>
            <Badge className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-4 py-2">
              Super Admin Access
            </Badge>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
            <span className="text-red-800">{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
            <span className="text-green-800">{successMessage}</span>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Settings className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Total Modules</p>
                  <p className="text-2xl font-bold text-gray-900">{modules.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Admin Users</p>
                  <p className="text-2xl font-bold text-gray-900">{adminUsers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Shield className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Active Permissions</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {adminUsers.reduce((total, user) => total + user.permissions.length, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Crown className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Your Role</p>
                  <p className="text-lg font-bold text-yellow-600">Super Admin</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Module Permissions Matrix */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <Settings className="h-6 w-6 mr-3 text-blue-600" />
              Module Permissions Matrix
              <Badge className="ml-3 bg-blue-100 text-blue-800">
                {adminUsers.length} Admin{adminUsers.length !== 1 ? 's' : ''}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {adminUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Admin Users Found</h3>
                <p className="text-gray-600">
                  There are no Admin users in the system to manage module permissions for.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-4 px-6 font-semibold text-gray-900">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2" />
                          Admin User
                        </div>
                      </th>
                      {modules.map(module => {
                        const IconComponent = moduleIcons[module.icon] || Settings;
                        return (
                          <th key={module.id} className="text-center py-4 px-3 font-semibold text-gray-900">
                            <div className="flex flex-col items-center space-y-2">
                              <IconComponent className="h-5 w-5 text-gray-600" />
                              <span className="text-xs">{module.displayName}</span>
                            </div>
                          </th>
                        );
                      })}
                      <th className="text-center py-4 px-6 font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminUsers.map(user => (
                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-6">
                          <div className="flex items-center">
                            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="ml-3">
                              <p className="font-medium text-gray-900">{user.name}</p>
                              <p className="text-sm text-gray-600">{user.email}</p>
                              <Badge className="mt-1 bg-blue-100 text-blue-800 text-xs">
                                {user.team} • Admin
                              </Badge>
                            </div>
                          </div>
                        </td>
                        {modules.map(module => {
                          const hasPermission = getUserPermissionForModule(user, module.name);
                          const isLoading = operationLoading === `${user.id}-${module.name}`;
                          
                          return (
                            <td key={module.id} className="py-4 px-3 text-center">
                              <button
                                onClick={() => handleTogglePermission(user.id, module.name, hasPermission)}
                                disabled={isLoading}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                                  hasPermission
                                    ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                title={`${hasPermission ? 'Revoke' : 'Grant'} ${module.displayName} access`}
                              >
                                {isLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : hasPermission ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <X className="h-4 w-4" />
                                )}
                              </button>
                            </td>
                          );
                        })}
                        <td className="py-4 px-6 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePromoteToSuperAdmin(user.id)}
                            disabled={operationLoading === `promote-${user.id}`}
                            className="text-yellow-600 hover:bg-yellow-50"
                            icon={operationLoading === `promote-${user.id}` ? Loader2 : Crown}
                            title="Promote to Super Admin"
                          >
                            {operationLoading === `promote-${user.id}` ? 'Promoting...' : 'Promote'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Module Descriptions */}
        <div className="mt-8">
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <Settings className="h-6 w-6 mr-3 text-gray-600" />
                Available Modules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {modules.map(module => {
                  const IconComponent = moduleIcons[module.icon] || Settings;
                  return (
                    <div key={module.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center mb-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <IconComponent className="h-5 w-5 text-gray-600" />
                        </div>
                        <h3 className="ml-3 font-medium text-gray-900">{module.displayName}</h3>
                      </div>
                      <p className="text-sm text-gray-600">{module.description}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminModules; 