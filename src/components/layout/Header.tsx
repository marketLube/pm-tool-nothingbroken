import React from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Avatar from '../ui/Avatar';

const Header: React.FC = () => {
  const { currentUser } = useAuth();

  return (
    <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-white border-b border-gray-200">
      <h1 className="text-xl font-semibold text-gray-900">Welcome back!</h1>
      
      <div className="flex items-center space-x-4">
        <p className="text-xs text-gray-500 mr-4">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        
          <button className="p-1 rounded-full text-gray-500 hover:text-primary-600 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500">
            <Bell className="h-5 w-5" />
          </button>
          
          <div className="flex items-center">
            <Avatar 
              src={currentUser?.avatar} 
              name={currentUser?.name} 
              size="sm" 
            />
            <span className="ml-2 text-sm font-medium text-gray-700 hidden sm:inline-block">
              {currentUser?.name}
            </span>
          </div>
        </div>
      </div>
  );
};

export default Header;