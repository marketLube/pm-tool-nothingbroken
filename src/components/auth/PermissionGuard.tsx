import React, { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ActionType, ResourceType } from '../../utils/auth/permissions';
import { TeamType } from '../../types';

interface PermissionGuardProps {
  resource: ResourceType;
  action: ActionType;
  resourceTeam?: TeamType;
  children: ReactNode | ((hasPermission: boolean) => ReactNode);
  fallback?: ReactNode;
}

/**
 * A component that conditionally renders content based on user permissions
 * 
 * @example
 * // Render content only if user has permission
 * <PermissionGuard
 *   resource="task"
 *   action="create"
 *   fallback={<p>You don't have permission</p>}
 * >
 *   <CreateTaskButton />
 * </PermissionGuard>
 *
 * @example
 * // Disable button if user doesn't have permission
 * <PermissionGuard resource="task" action="delete">
 *   {(hasPermission) => (
 *     <button 
 *       onClick={handleDelete} 
 *       disabled={!hasPermission}
 *     >
 *       Delete
 *     </button>
 *   )}
 * </PermissionGuard>
 */
const PermissionGuard: React.FC<PermissionGuardProps> = ({
  resource,
  action,
  resourceTeam,
  children,
  fallback = null
}) => {
  const { checkPermission } = useAuth();
  const hasPermission = checkPermission(resource, action, resourceTeam);

  // Render children as function with permission status
  if (typeof children === 'function') {
    return <>{children(hasPermission)}</>;
  }

  // Render children or fallback based on permission
  return hasPermission ? <>{children}</> : <>{fallback}</>;
};

export default PermissionGuard;

