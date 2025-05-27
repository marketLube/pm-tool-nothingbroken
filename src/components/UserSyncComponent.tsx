import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

/**
 * UserSyncComponent
 * 
 * This is a utility component that ensures the current user data
 * is always synchronized with the latest data in the DataContext.
 * 
 * It handles cases where the user is updated in one part of the app
 * (e.g., profile picture changes, permissions changes) and ensures 
 * the changes are reflected throughout the entire application.
 */
const UserSyncComponent = () => {
  const { currentUser, updateCurrentUser } = useAuth();
  const { users } = useData();
  
  // Effect to synchronize current user data with the latest from the data context
  useEffect(() => {
    if (currentUser && users.length > 0) {
      const latestUserData = users.find(u => u.id === currentUser.id);
      
      // Check if we have the latest user data and it differs from current
      if (latestUserData) {
        // Perform deep comparison to see if any user data has changed
        const hasAvatarChanged = latestUserData.avatar !== currentUser.avatar;
        const hasNameChanged = latestUserData.name !== currentUser.name;
        const hasRoleChanged = latestUserData.role !== currentUser.role;
        const hasTeamChanged = latestUserData.team !== currentUser.team;
        
        // Check if allowedStatuses have changed
        const currentStatuses = currentUser.allowedStatuses || [];
        const latestStatuses = latestUserData.allowedStatuses || [];
        const hasStatusesChanged = 
          currentStatuses.length !== latestStatuses.length ||
          currentStatuses.some(status => !latestStatuses.includes(status));
        
        // If any important data has changed, update the current user
        if (hasAvatarChanged || hasNameChanged || hasRoleChanged || 
            hasTeamChanged || hasStatusesChanged) {
          console.log('Syncing user data:', {
            avatar: hasAvatarChanged ? 'changed' : 'unchanged',
            name: hasNameChanged ? 'changed' : 'unchanged',
            role: hasRoleChanged ? 'changed' : 'unchanged',
            team: hasTeamChanged ? 'changed' : 'unchanged',
            statuses: hasStatusesChanged ? 'changed' : 'unchanged'
          });
          
          // Update the current user in the auth context
          updateCurrentUser(latestUserData);
        }
      }
    }
  }, [currentUser, users, updateCurrentUser]);
  
  // This component doesn't render anything
  return null;
};

export default UserSyncComponent; 