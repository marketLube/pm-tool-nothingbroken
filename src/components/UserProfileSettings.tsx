import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/Card';
import Input from './ui/Input';
import Button from './ui/Button';
import FileUpload from './ui/FileUpload';
import { useAuth } from '../contexts/AuthContext';
import { useAvatarManager } from '../utils/avatar';
import { UserCog } from 'lucide-react';

const UserProfileSettings: React.FC = () => {
  const { currentUser } = useAuth();
  const { updateAvatar } = useAvatarManager();
  
  const [name, setName] = useState(currentUser?.name || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  const handleFileChange = (file: File | null) => {
    setSelectedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) return;
    
    setIsSaving(true);
    setSuccessMessage('');
    
    try {
      // Update avatar using the utility function to ensure synchronization
      const avatarUrl = updateAvatar(currentUser, selectedFile);
      
      // Create updated user object with new name and avatar
      const updatedUser = {
        ...currentUser,
        name,
        avatar: avatarUrl
      };
      
      // Update the user using the avatar manager (which updates both contexts)
      updateAvatar(updatedUser, null);
      
      setSuccessMessage('Profile updated successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentUser) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center">
          <UserCog className="h-5 w-5 mr-2 text-blue-600" />
          Your Profile
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <FileUpload 
              label="Profile Picture"
              onChange={handleFileChange}
              preview={currentUser.avatar}
              maxSizeInMb={2}
              compact={true}
              className="w-full max-w-sm"
            />
          </div>
          
          <Input
            label="Name"
            value={name}
            onChange={handleNameChange}
            required
            fullWidth
          />
          
          {/* Display current email (not editable) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <div className="text-gray-500 border border-gray-200 rounded-md px-3 py-2.5 bg-gray-50">
              {currentUser.email}
            </div>
          </div>
          
          {/* Display current role and team (not editable) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
              <div className="text-gray-500 border border-gray-200 rounded-md px-3 py-2.5 bg-gray-50 capitalize">
                {currentUser.role}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Team</label>
              <div className="text-gray-500 border border-gray-200 rounded-md px-3 py-2.5 bg-gray-50 capitalize">
                {currentUser.team === 'creative' ? 'Creative Team' : 'Web Team'}
              </div>
            </div>
          </div>
          
          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
              {successMessage}
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t border-gray-200 flex justify-end pt-4">
          <Button
            variant="primary"
            type="submit"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Profile'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default UserProfileSettings; 