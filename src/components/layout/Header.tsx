import React, { useState, useRef, useEffect } from 'react';
import { Bell, Settings as SettingsIcon, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Avatar from '../ui/Avatar';
import { useNavigate } from 'react-router-dom';
import { getIndiaDateTime } from '../../utils/timezone';

const Header: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };
  
  const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setDropdownOpen(false);
    }
  };
  
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate('/');
  };
  
  const handleSettings = () => {
    navigate('/settings');
    setDropdownOpen(false);
  };

  return (
    <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-white border-b border-gray-200">
      <h1 className="text-xl font-semibold text-gray-900">Welcome back!</h1>
      
      <div className="flex items-center space-x-4">
        <p className="text-xs text-gray-500 mr-4">
          {getIndiaDateTime().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            timeZone: 'Asia/Kolkata'
          })}
        </p>
        
          <button className="p-1 rounded-full text-gray-500 hover:text-primary-600 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500">
            <Bell className="h-5 w-5" />
          </button>
          
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={toggleDropdown}
            className="flex items-center space-x-1 hover:bg-gray-50 rounded-full py-1 pl-1 pr-2 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <Avatar 
              src={currentUser?.avatar} 
              name={currentUser?.name} 
              size="sm" 
            />
            <span className="ml-2 text-sm font-medium text-gray-700 hidden sm:inline-block">
              {currentUser?.name}
            </span>
            <ChevronDown className="h-4 w-4 text-gray-500" />
          </button>
          
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 py-1 border border-gray-200">
              <button
                className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={handleSettings}
              >
                <SettingsIcon className="h-4 w-4 mr-2 text-gray-500" />
                Settings
              </button>
              <button
                className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2 text-red-500" />
                Logout
              </button>
            </div>
          )}
          </div>
        </div>
      </div>
  );
};

export default Header;