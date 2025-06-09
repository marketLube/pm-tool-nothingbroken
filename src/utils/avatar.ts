import { User } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

/**
 * Helper function to process user updates and ensure changes are synchronized
 * across the app by updating both the Data context and Auth context
 */
export function useAvatarManager() {
  const { currentUser, updateCurrentUser } = useAuth();
  const { updateUser } = useData();

  /**
   * Updates a user's data (including avatar) and ensures it's synchronized across contexts
   * 
   * @param user The user to update
   * @param file Optional file to use for the avatar
   * @returns The updated avatar URL
   */
  const updateAvatar = (user: User, file: File | null): string => {
    // Get current avatar URL or empty string
    let avatarUrl = user.avatar || '';

    // If there's a new file, create an object URL
    // In a real app, you would upload to a server and get a URL back
    if (file) {
      try {
        avatarUrl = URL.createObjectURL(file);
      } catch (error) {
        console.warn('Failed to create object URL for avatar:', error);
        // Fallback: use a default avatar or the existing one
        avatarUrl = user.avatar || '';
      }
    }

    // Create the updated user object with all properties
    const updatedUser = {
      ...user,
      avatar: avatarUrl,
      // Ensure allowedStatuses are preserved
      allowedStatuses: user.allowedStatuses || []
    };

    // Console log for debugging
    console.log('Updating user with data:', {
      id: updatedUser.id,
      name: updatedUser.name,
      avatar: updatedUser.avatar ? 'has avatar' : 'no avatar',
      allowedStatuses: updatedUser.allowedStatuses
    });

    // Update in the Data context
    updateUser(updatedUser);

    // If this is the current user, also update in Auth context
    if (currentUser && currentUser.id === user.id) {
      updateCurrentUser(updatedUser);
    }

    return avatarUrl;
  };

  return { updateAvatar };
} 