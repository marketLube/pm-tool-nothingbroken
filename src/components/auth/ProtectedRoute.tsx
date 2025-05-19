import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ActionType, ResourceType } from '../../utils/auth/permissions';
import { TeamType } from '../../types';

interface ProtectedRouteProps {
  resource?: ResourceType;
  action?: ActionType;
  resourceTeam?: TeamType;
  requireAuth?: boolean;
  redirectPath?: string;
}

/**
 * A component that protects routes based on authentication and permissions
 * 
 * @example
 * // Only allow authenticated users
 * <Route element={<ProtectedRoute requireAuth />}>
 *   <Route path="/dashboard" element={<Dashboard />} />
 * </Route>
 * 
 * @example
 * // Only allow users with specific permissions
 * <Route 
 *   element={
 *     <ProtectedRoute 
 *       resource="user" 
 *       action="view" 
 *       redirectPath="/unauthorized" 
 *     />
 *   }
 * >
 *   <Route path="/users" element={<Users />} />
 * </Route>
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  resource,
  action,
  resourceTeam,
  requireAuth = true,
  redirectPath = '/'
}) => {
  const { isAuthenticated, checkPermission } = useAuth();
  const location = useLocation();

  // Check authentication if required
  if (requireAuth && !isAuthenticated) {
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  // Check permissions if resource and action are provided
  if (resource && action && !checkPermission(resource, action, resourceTeam)) {
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  // User is authenticated and has permission
  return <Outlet />;
};

export default ProtectedRoute;

