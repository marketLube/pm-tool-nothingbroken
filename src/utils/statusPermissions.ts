import { User, Status } from '../types';

/**
 * Check if a user has permission to access a specific status
 * @param user The user to check permissions for
 * @param statusId The status ID to check access for
 * @returns boolean whether the user has permission to the status
 */
export const canUserAccessStatus = (user: User, statusId: string): boolean => {
  // Admins and Super Admins can access all statuses
  if (user.role === 'admin' || user.role === 'super_admin') return true;
  
  // Check if user has specific status permissions
  if (user.allowedStatuses && user.allowedStatuses.includes(statusId)) {
    return true;
  }
  
  return false;
};

/**
 * Get filtered statuses that a user has access to
 * @param user The user to check permissions for
 * @param allStatuses Array of all available statuses
 * @returns Array of statuses the user can access
 */
export const getAccessibleStatuses = (user: User, allStatuses: Status[]): Status[] => {
  // Admins and Super Admins can access all statuses
  if (user.role === 'admin' || user.role === 'super_admin') return allStatuses;
  
  // Filter statuses based on user permissions
  if (user.allowedStatuses) {
    return allStatuses.filter(status => user.allowedStatuses?.includes(status.id));
  }
  
  return [];
};

/**
 * Validate if a task assignment is valid based on status permissions
 * @param assigneeId The ID of the user being assigned the task
 * @param statusId The status of the task
 * @param users Array of all users
 * @returns Object with validation result and error message
 */
export const validateTaskAssignment = (
  assigneeId: string,
  statusId: string,
  users: User[]
): { isValid: boolean; error?: string } => {
  // If no assignee, it's valid (unassigned task)
  if (!assigneeId) {
    return { isValid: true };
  }
  
  // Find the assignee
  const assignee = users.find(user => user.id === assigneeId);
  if (!assignee) {
    return { isValid: false, error: 'Selected user not found' };
  }
  
  // Check if assignee is active
  if (!assignee.isActive) {
    return { isValid: false, error: 'Cannot assign task to inactive user' };
  }
  
  // Check if assignee has access to the status
  if (!canUserAccessStatus(assignee, statusId)) {
    return { 
      isValid: false, 
      error: `${assignee.name} does not have permission to access this status. Please select a different status or assignee.` 
    };
  }
  
  return { isValid: true };
};

/**
 * Get users who have access to a specific status
 * @param statusId The status ID to check
 * @param users Array of all users
 * @param teamFilter Optional team filter to narrow down users
 * @returns Array of users who can access the status
 */
export const getUsersWithStatusAccess = (
  statusId: string,
  users: User[],
  teamFilter?: string
): User[] => {
  let filteredUsers = users.filter(user => user.isActive);
  
  // Apply team filter if provided
  if (teamFilter && teamFilter !== 'all') {
    filteredUsers = filteredUsers.filter(user => 
      user.team === teamFilter || user.role === 'admin' || user.role === 'super_admin'
    );
  }
  
  // Filter by status access
  return filteredUsers.filter(user => canUserAccessStatus(user, statusId));
}; 