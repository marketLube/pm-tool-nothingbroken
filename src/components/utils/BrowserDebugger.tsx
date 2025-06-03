import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useSimpleRealtime, useTaskRefresh } from '../../contexts/SimpleRealtimeContext';
import { Monitor, Wifi, WifiOff, User, Database, RefreshCw } from 'lucide-react';

const BrowserDebugger: React.FC = () => {
  const { currentUser, isLoggedIn, isLoading } = useAuth();
  const { refreshTasks, isConnected } = useSimpleRealtime();
  const { tasks, isLoading: tasksLoading } = useTaskRefresh();
  
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [refreshCount, setRefreshCount] = useState(0);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Collect debug information
  useEffect(() => {
    const collectDebugInfo = () => {
      setDebugInfo({
        // Browser Info
        userAgent: navigator.userAgent,
        browser: getBrowserName(),
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        
        // Security Context
        isSecureContext: window.isSecureContext,
        location: window.location.href,
        protocol: window.location.protocol,
        
        // Storage
        localStorageAvailable: isStorageAvailable('localStorage'),
        sessionStorageAvailable: isStorageAvailable('sessionStorage'),
        localStorageItems: getStorageItems('localStorage'),
        sessionStorageItems: getStorageItems('sessionStorage'),
        
        // Auth State
        isLoggedIn,
        isLoading,
        currentUser: currentUser ? {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          role: currentUser.role
        } : null,
        
        // Realtime State
        isConnected,
        tasksCount: tasks.length,
        tasksLoading,
        
        // Timestamps
        lastUpdate: new Date().toISOString(),
        refreshCount
      });
    };

    collectDebugInfo();
    
    // Update every 2 seconds
    const interval = setInterval(collectDebugInfo, 2000);
    return () => clearInterval(interval);
  }, [isLoggedIn, isLoading, currentUser, isConnected, tasks.length, tasksLoading, refreshCount]);

  const getBrowserName = () => {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Edg')) return 'Edge';
    return 'Unknown';
  };

  const isStorageAvailable = (type: 'localStorage' | 'sessionStorage') => {
    try {
      const storage = window[type];
      const test = '__storage_test__';
      storage.setItem(test, test);
      storage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  };

  const getStorageItems = (type: 'localStorage' | 'sessionStorage') => {
    try {
      const storage = window[type];
      const items: Record<string, string> = {};
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key) {
          const value = storage.getItem(key);
          if (value) {
            // Only show relevant keys and truncate long values
            if (key.includes('supabase') || key.includes('auth') || key.includes('session') || key.includes('user')) {
              items[key] = value.length > 100 ? `${value.substring(0, 100)}...` : value;
            }
          }
        }
      }
      return items;
    } catch {
      return {};
    }
  };

  const handleManualRefresh = () => {
    setRefreshCount(prev => prev + 1);
    setLastRefresh(new Date());
    refreshTasks();
  };

  const clearStorage = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      setRefreshCount(prev => prev + 1);
      alert('Storage cleared! Please refresh the page to re-authenticate.');
    } catch (error) {
      alert('Error clearing storage: ' + error);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center">
          <Monitor className="mr-2" />
          Browser Cross-Compatibility Debug
        </h1>
        <div className="flex space-x-2">
          <Button onClick={handleManualRefresh} variant="primary" size="sm">
            <RefreshCw className="w-4 h-4 mr-1" />
            Manual Refresh ({refreshCount})
          </Button>
          <Button onClick={clearStorage} variant="secondary" size="sm">
            Clear Storage
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            {isConnected ? (
              <Wifi className="w-5 h-5 text-green-500 mr-2" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-500 mr-2" />
            )}
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`p-3 rounded-lg ${isLoggedIn ? 'bg-green-100' : 'bg-red-100'}`}>
              <div className="text-sm font-medium">Authentication</div>
              <div className={`text-lg font-bold ${isLoggedIn ? 'text-green-800' : 'text-red-800'}`}>
                {isLoggedIn ? 'Logged In' : 'Not Logged In'}
              </div>
            </div>
            <div className={`p-3 rounded-lg ${isConnected ? 'bg-green-100' : 'bg-red-100'}`}>
              <div className="text-sm font-medium">Polling</div>
              <div className={`text-lg font-bold ${isConnected ? 'text-green-800' : 'text-red-800'}`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </div>
            </div>
            <div className={`p-3 rounded-lg ${tasks.length > 0 ? 'bg-green-100' : 'bg-yellow-100'}`}>
              <div className="text-sm font-medium">Tasks Loaded</div>
              <div className={`text-lg font-bold ${tasks.length > 0 ? 'text-green-800' : 'text-yellow-800'}`}>
                {tasks.length} tasks
              </div>
            </div>
            <div className="p-3 rounded-lg bg-blue-100">
              <div className="text-sm font-medium">Last Refresh</div>
              <div className="text-lg font-bold text-blue-800">
                {lastRefresh ? lastRefresh.toLocaleTimeString() : 'Never'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Browser Information */}
      <Card>
        <CardHeader>
          <CardTitle>Browser Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Browser Details</h4>
              <ul className="space-y-1 text-sm">
                <li><strong>Browser:</strong> {debugInfo.browser}</li>
                <li><strong>Platform:</strong> {debugInfo.platform}</li>
                <li><strong>Language:</strong> {debugInfo.language}</li>
                <li><strong>Online:</strong> {debugInfo.onLine ? 'Yes' : 'No'}</li>
                <li><strong>Cookies:</strong> {debugInfo.cookieEnabled ? 'Enabled' : 'Disabled'}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Security Context</h4>
              <ul className="space-y-1 text-sm">
                <li><strong>Secure Context:</strong> {debugInfo.isSecureContext ? 'Yes' : 'No'}</li>
                <li><strong>Protocol:</strong> {debugInfo.protocol}</li>
                <li><strong>Local Storage:</strong> {debugInfo.localStorageAvailable ? 'Available' : 'Unavailable'}</li>
                <li><strong>Session Storage:</strong> {debugInfo.sessionStorageAvailable ? 'Available' : 'Unavailable'}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Authentication State */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="w-5 h-5 mr-2" />
            Authentication State
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentUser ? (
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">Current User</h4>
              <ul className="space-y-1 text-sm">
                <li><strong>ID:</strong> {currentUser.id}</li>
                <li><strong>Name:</strong> {currentUser.name}</li>
                <li><strong>Email:</strong> {currentUser.email}</li>
                <li><strong>Role:</strong> {currentUser.role}</li>
              </ul>
            </div>
          ) : (
            <div className="bg-red-50 p-4 rounded-lg">
              <h4 className="font-semibold text-red-800">No User Authenticated</h4>
              <p className="text-sm text-red-600">
                {isLoading ? 'Loading authentication state...' : 'User is not logged in'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Storage Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="w-5 h-5 mr-2" />
            Storage Contents (Auth-related only)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Local Storage</h4>
              <div className="bg-gray-100 p-3 rounded-lg text-xs font-mono max-h-48 overflow-y-auto">
                {Object.keys(debugInfo.localStorageItems || {}).length > 0 ? (
                  Object.entries(debugInfo.localStorageItems || {}).map(([key, value]) => (
                    <div key={key} className="mb-2">
                      <div className="font-semibold text-blue-600">{key}:</div>
                      <div className="text-gray-700 break-all">{String(value)}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500">No auth-related items found</div>
                )}
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Session Storage</h4>
              <div className="bg-gray-100 p-3 rounded-lg text-xs font-mono max-h-48 overflow-y-auto">
                {Object.keys(debugInfo.sessionStorageItems || {}).length > 0 ? (
                  Object.entries(debugInfo.sessionStorageItems || {}).map(([key, value]) => (
                    <div key={key} className="mb-2">
                      <div className="font-semibold text-blue-600">{key}:</div>
                      <div className="text-gray-700 break-all">{String(value)}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500">No auth-related items found</div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Raw Debug Data */}
      <Card>
        <CardHeader>
          <CardTitle>Raw Debug Data</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
};

export default BrowserDebugger; 