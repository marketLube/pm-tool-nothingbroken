import { Role, TeamType } from '../../types';

export type ResourceType = 'task' | 'user' | 'client' | 'report' | 'team' | 'status';
export type ActionType = 'view' | 'create' | 'edit' | 'delete' | 'manage' | 'update' | 'approve';

export interface Permission {
  resource: ResourceType;
  action: ActionType;
  team?: TeamType | 'all';
}

/**
 * Get all permissions for a user based on their role and team
 * @param role The user's role (admin, manager, employee)
 * @param userTeam The user's team (creative, web)
 * @returns Array of permissions the user has
 */
export const getPermissions = (role: Role, userTeam: TeamType): Permission[] => {
  // Admin has full access to everything
  if (role === 'admin') {
    return [
      // Task permissions
      { resource: 'task', action: 'view', team: 'all' },
      { resource: 'task', action: 'create', team: 'all' },
      { resource: 'task', action: 'edit', team: 'all' },
      { resource: 'task', action: 'delete', team: 'all' },
      { resource: 'task', action: 'approve', team: 'all' },
      
      // User permissions
      { resource: 'user', action: 'view', team: 'all' },
      { resource: 'user', action: 'create', team: 'all' },
      { resource: 'user', action: 'edit', team: 'all' },
      { resource: 'user', action: 'delete', team: 'all' },
      { resource: 'user', action: 'manage', team: 'all' },
      
      // Client permissions
      { resource: 'client', action: 'view', team: 'all' },
      { resource: 'client', action: 'create', team: 'all' },
      { resource: 'client', action: 'edit', team: 'all' },
      { resource: 'client', action: 'delete', team: 'all' },
      
      // Report permissions
      { resource: 'report', action: 'view', team: 'all' },
      { resource: 'report', action: 'create', team: 'all' },
      { resource: 'report', action: 'edit', team: 'all' },
      { resource: 'report', action: 'approve', team: 'all' },
      
      // Team permissions
      { resource: 'team', action: 'view', team: 'all' },
      { resource: 'team', action: 'manage', team: 'all' },
      
      // Status permissions
      { resource: 'status', action: 'view', team: 'all' },
      { resource: 'status', action: 'create', team: 'all' },
      { resource: 'status', action: 'edit', team: 'all' },
      { resource: 'status', action: 'delete', team: 'all' },
      { resource: 'status', action: 'manage', team: 'all' },
    ];
  }
  
  // Manager has permissions for their team only
  if (role === 'manager') {
    return [
      // Task permissions
      { resource: 'task', action: 'view', team: 'all' },
      { resource: 'task', action: 'create', team: userTeam },
      { resource: 'task', action: 'edit', team: userTeam },
      { resource: 'task', action: 'delete', team: userTeam },
      { resource: 'task', action: 'approve', team: userTeam },
      
      // User permissions
      { resource: 'user', action: 'view', team: 'all' },
      { resource: 'user', action: 'edit', team: userTeam },
      
      // Client permissions
      { resource: 'client', action: 'view', team: 'all' },
      { resource: 'client', action: 'create', team: 'all' },
      { resource: 'client', action: 'edit', team: 'all' },
      
      // Report permissions
      { resource: 'report', action: 'view', team: 'all' },
      { resource: 'report', action: 'create', team: userTeam },
      { resource: 'report', action: 'edit', team: userTeam },
      { resource: 'report', action: 'approve', team: userTeam },
      
      // Team permissions
      { resource: 'team', action: 'view', team: 'all' },
      { resource: 'team', action: 'manage', team: userTeam },
      
      // Status permissions
      { resource: 'status', action: 'view', team: 'all' },
      { resource: 'status', action: 'edit', team: userTeam },
    ];
  }
  
  // Employee has limited permissions
  return [
    // Task permissions
    { resource: 'task', action: 'view', team: userTeam },
    { resource: 'task', action: 'create', team: userTeam },
    { resource: 'task', action: 'edit', team: userTeam },
    
    // User permissions
    { resource: 'user', action: 'view', team: userTeam },
    
    // Client permissions
    { resource: 'client', action: 'view', team: 'all' },
    
    // Report permissions
    { resource: 'report', action: 'view', team: userTeam },
    { resource: 'report', action: 'create', team: userTeam },
    
    // Team permissions
    { resource: 'team', action: 'view', team: userTeam },
    
    // Status permissions - limited based on admin config
    { resource: 'status', action: 'view', team: userTeam },
  ];
};

/**
 * Check if a user has a specific permission
 * @param userPermissions The user's permissions
 * @param resource The resource to check access for
 * @param action The action to check access for
 * @param resourceTeam Optional team to check access for
 * @returns boolean whether the user has permission
 */
export const hasPermission = (
  userPermissions: Permission[],
  resource: ResourceType,
  action: ActionType,
  resourceTeam?: TeamType
): boolean => {
  return userPermissions.some(permission => {
    // Check if resource and action match
    const resourceMatch = permission.resource === resource;
    const actionMatch = permission.action === action;
    
    // Check team access
    const teamMatch = !resourceTeam || 
                     !permission.team || 
                     permission.team === 'all' || 
                     permission.team === resourceTeam;
    
    return resourceMatch && actionMatch && teamMatch;
  });
};

