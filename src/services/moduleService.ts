import { supabase, isSupabaseConfigured } from '../utils/supabase';
import { Module, ModulePermission, User } from '../types';

/**
 * Service for managing system modules and permissions
 * Only Super Admins can modify module permissions
 */

// Fetch all available modules
export const getAllModules = async (): Promise<Module[]> => {
  if (!isSupabaseConfigured() || !supabase) {
    console.error('❌ Supabase not configured');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .eq('is_active', true)
      .order('display_name');

    if (error) {
      console.error('Error fetching modules:', error);
      return [];
    }

    return data.map(mapDbModuleToModule);
  } catch (error) {
    console.error('Error in getAllModules:', error);
    return [];
  }
};

// Fetch module permissions for a specific user
export const getUserModulePermissions = async (userId: string): Promise<ModulePermission[]> => {
  if (!isSupabaseConfigured() || !supabase) {
    console.error('❌ Supabase not configured');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('user_module_permissions')
      .select('*')
      .eq('user_id', userId)
      .eq('has_permission', true);

    if (error) {
      console.error('Error fetching user module permissions:', error);
      return [];
    }

    return data.map(mapDbPermissionToModulePermission);
  } catch (error) {
    console.error('Error in getUserModulePermissions:', error);
    return [];
  }
};

// Fetch all Admin users with their module permissions
export const getAdminUsersWithModulePermissions = async (): Promise<(User & { permissions: ModulePermission[] })[]> => {
  if (!isSupabaseConfigured() || !supabase) {
    console.error('❌ Supabase not configured');
    return [];
  }

  try {
    // First, get all admin users
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'admin')
      .eq('isActive', true)
      .order('name');

    if (usersError) {
      console.error('Error fetching admin users:', usersError);
      return [];
    }

    // Then, get their module permissions
    const usersWithPermissions = await Promise.all(
      usersData.map(async (user: any) => {
        const permissions = await getUserModulePermissions(user.id);
        return {
          ...mapDbUserToUser(user),
          permissions
        };
      })
    );

    return usersWithPermissions;
  } catch (error) {
    console.error('Error in getAdminUsersWithModulePermissions:', error);
    return [];
  }
};

// Grant a module permission to a user (Super Admin only)
export const grantModulePermission = async (
  targetUserId: string,
  moduleName: string,
  superAdminId: string
): Promise<{ success: boolean; message: string }> => {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, message: 'Database not configured' };
  }

  try {
    const { data, error } = await supabase.rpc('grant_module_permission', {
      target_user_id: targetUserId,
      module_name: moduleName,
      granted_by_user_id: superAdminId
    });

    if (error) {
      console.error('Error granting module permission:', error);
      return { success: false, message: error.message };
    }

    if (data && !data.success) {
      return { success: false, message: data.error };
    }

    return { success: true, message: 'Module permission granted successfully' };
  } catch (error) {
    console.error('Error in grantModulePermission:', error);
    return { success: false, message: 'Failed to grant module permission' };
  }
};

// Revoke a module permission from a user (Super Admin only)
export const revokeModulePermission = async (
  targetUserId: string,
  moduleName: string,
  superAdminId: string
): Promise<{ success: boolean; message: string }> => {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, message: 'Database not configured' };
  }

  try {
    const { data, error } = await supabase.rpc('revoke_module_permission', {
      target_user_id: targetUserId,
      module_name: moduleName,
      revoked_by_user_id: superAdminId
    });

    if (error) {
      console.error('Error revoking module permission:', error);
      return { success: false, message: error.message };
    }

    if (data && !data.success) {
      return { success: false, message: data.error };
    }

    return { success: true, message: 'Module permission revoked successfully' };
  } catch (error) {
    console.error('Error in revokeModulePermission:', error);
    return { success: false, message: 'Failed to revoke module permission' };
  }
};

// Promote a user to Super Admin (Super Admin only)
export const promoteToSuperAdmin = async (
  targetUserId: string,
  superAdminId: string
): Promise<{ success: boolean; message: string }> => {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, message: 'Database not configured' };
  }

  try {
    const { data, error } = await supabase.rpc('promote_to_super_admin', {
      target_user_id: targetUserId,
      promoted_by_user_id: superAdminId
    });

    if (error) {
      console.error('Error promoting to super admin:', error);
      return { success: false, message: error.message };
    }

    if (data && !data.success) {
      return { success: false, message: data.error };
    }

    return { success: true, message: 'User promoted to Super Admin successfully' };
  } catch (error) {
    console.error('Error in promoteToSuperAdmin:', error);
    return { success: false, message: 'Failed to promote user to Super Admin' };
  }
};

// Check if a user has a specific module permission
export const hasModulePermission = async (
  userId: string,
  moduleName: string
): Promise<boolean> => {
  if (!isSupabaseConfigured() || !supabase) {
    return false;
  }

  try {
    const { data, error } = await supabase.rpc('has_module_permission', {
      user_id: userId,
      module_name: moduleName
    });

    if (error) {
      console.error('Error checking module permission:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Error in hasModulePermission:', error);
    return false;
  }
};

// Helper functions for data mapping
const mapDbModuleToModule = (dbModule: any): Module => ({
  id: dbModule.id,
  name: dbModule.name,
  displayName: dbModule.display_name,
  description: dbModule.description,
  icon: dbModule.icon,
  isActive: dbModule.is_active,
  createdAt: dbModule.created_at,
  updatedAt: dbModule.updated_at
});

const mapDbPermissionToModulePermission = (dbPermission: any): ModulePermission => ({
  id: dbPermission.id || `${dbPermission.user_id}-${dbPermission.module_name}`,
  userId: dbPermission.user_id,
  moduleId: dbPermission.module_id,
  moduleName: dbPermission.module_name,
  moduleDisplayName: dbPermission.module_display_name,
  moduleIcon: dbPermission.module_icon,
  grantedBy: dbPermission.granted_by || '',
  grantedByName: dbPermission.granted_by_name || '',
  grantedAt: dbPermission.granted_at || new Date().toISOString(),
  revokedAt: dbPermission.revoked_at,
  isActive: dbPermission.has_permission === true,
  metadata: {}
});

const mapDbUserToUser = (dbUser: any): User => ({
  id: dbUser.id,
  name: dbUser.name,
  email: dbUser.email,
  role: dbUser.role,
  team: dbUser.team,
  joinDate: dbUser.join_date || dbUser.joinDate,
  avatar: dbUser.avatar_url || dbUser.avatar,
  isActive: dbUser.is_active !== false,
  allowedStatuses: dbUser.allowed_statuses || [],
  password: dbUser.password
});

// Get module names that a user has access to (for updating user object)
export const getUserModuleNames = async (userId: string): Promise<string[]> => {
  try {
    const permissions = await getUserModulePermissions(userId);
    return permissions.filter(p => p.isActive).map(p => p.moduleName);
  } catch (error) {
    console.error('Error getting user module names:', error);
    return [];
  }
}; 