import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const SessionIndicator: React.FC = () => {
  const { isAuthenticated, currentUser } = useAuth();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      setShowIndicator(false);
      return;
    }

    const updateTimeRemaining = () => {
      try {
        const sessionExpiry = localStorage.getItem('sessionExpiry');
        if (sessionExpiry) {
          const expiryTime = parseInt(sessionExpiry);
          const currentTime = Date.now();
          const remaining = expiryTime - currentTime;
          
          if (remaining > 0) {
            setTimeRemaining(remaining);
            // Show indicator when less than 10 minutes remaining
            setShowIndicator(remaining < 10 * 60 * 1000);
          } else {
            setTimeRemaining(0);
            setShowIndicator(false);
          }
        }
      } catch (error) {
        console.error('Error updating session time:', error);
        setShowIndicator(false);
      }
    };

    // Update immediately
    updateTimeRemaining();

    // Update every 30 seconds
    const interval = setInterval(updateTimeRemaining, 30 * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, currentUser]);

  if (!showIndicator || !isAuthenticated) {
    return null;
  }

  const minutes = Math.floor(timeRemaining / (60 * 1000));
  const seconds = Math.floor((timeRemaining % (60 * 1000)) / 1000);

  const getIndicatorColor = () => {
    if (minutes <= 2) return 'bg-red-500 text-white';
    if (minutes <= 5) return 'bg-yellow-500 text-white';
    return 'bg-blue-500 text-white';
  };

  const getWarningMessage = () => {
    if (minutes <= 2) return 'Session expiring soon!';
    if (minutes <= 5) return 'Session will expire in';
    return 'Session timeout in';
  };

  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg transition-all duration-300 ${getIndicatorColor()}`}>
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 rounded-full bg-current animate-pulse"></div>
        <div className="text-sm font-medium">
          <div>{getWarningMessage()}</div>
          <div className="font-mono">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </div>
        </div>
      </div>
      {minutes <= 2 && (
        <div className="text-xs mt-1 opacity-90">
          Click anywhere to extend session
        </div>
      )}
    </div>
  );
};

export default SessionIndicator; 