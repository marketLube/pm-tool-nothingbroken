import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

// This hook synchronizes the current user in AuthContext with any updates in DataContext
export const useSyncCurrentUser = () => {
  const { currentUser, updateCurrentUser } = useAuth();
  const { users } = useData();
  
  useEffect(() => {
    if (currentUser) {
      // Find the current user in the updated users array
      const updatedUser = users.find(user => user.id === currentUser.id);
      
      // If the user exists and has been updated, update the current user in AuthContext
      if (updatedUser && JSON.stringify(updatedUser) !== JSON.stringify(currentUser)) {
        updateCurrentUser(updatedUser);
      }
    }
  }, [users, currentUser, updateCurrentUser]);
}; 