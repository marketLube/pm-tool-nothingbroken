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
  const { isLoggedIn, currentUser, isLoading, checkPermission } = useAuth();
  const location = useLocation();

  // Using checkPermission from AuthContext which handles Super Admin correctly

  // Show loading spinner while checking authentication state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check authentication if required
  if (requireAuth && !isLoggedIn) {
    console.log('User not authenticated, redirecting to:', redirectPath);
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  // Check permissions if resource and action are provided
  if (resource && action && !checkPermission(resource, action, resourceTeam)) {
    console.log('User lacks permission for resource:', resource, 'action:', action);
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  // User is authenticated and has permission
  return <Outlet />;
};

export default ProtectedRoute;

