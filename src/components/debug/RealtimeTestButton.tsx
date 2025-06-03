import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useRealtime } from '../../contexts/RealtimeContext';
import { useAuth } from '../../contexts/AuthContext';

export const RealtimeTestButton: React.FC = () => {
  const { addTask, tasks } = useData();
  const { status, isSubscribed } = useRealtime();
  const { currentUser } = useAuth();
  const [isCreating, setIsCreating] = useState(false);

  const createTestTask = async () => {
    if (!currentUser) return;
    
    setIsCreating(true);
    try {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`🧪 [Test] Creating test task at ${timestamp}`);
      
      await addTask({
        title: `Test Task ${timestamp}`,
        description: `Auto-generated test task created at ${timestamp}`,
        status: 'not_started',
        priority: 'medium',
        assigneeId: currentUser.id,
        clientId: undefined,
        team: currentUser.team || 'web',
        dueDate: new Date().toISOString().split('T')[0],
        createdBy: currentUser.id
      });
      
      console.log(`✅ [Test] Test task created successfully`);
    } catch (error) {
      console.error(`❌ [Test] Error creating test task:`, error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 m-4">
      <h3 className="text-lg font-semibold text-blue-800 mb-2">🧪 Real-time Test</h3>
      
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium">Connection Status:</span>
          <span className={`px-2 py-1 rounded text-xs ${
            status === 'live' ? 'bg-green-100 text-green-800' :
            status === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {status.toUpperCase()}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="font-medium">Subscribed:</span>
          <span className={`px-2 py-1 rounded text-xs ${
            isSubscribed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {isSubscribed ? 'YES' : 'NO'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="font-medium">Total Tasks:</span>
          <span className="font-mono">{tasks.length}</span>
        </div>
      </div>
      
      <button
        onClick={createTestTask}
        disabled={isCreating || !currentUser || status !== 'live'}
        className={`mt-3 px-4 py-2 rounded text-sm font-medium transition-colors ${
          isCreating || !currentUser || status !== 'live'
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {isCreating ? 'Creating...' : 'Create Test Task'}
      </button>
      
      <p className="text-xs text-gray-600 mt-2">
        💡 Open browser dev tools to see real-time logs. Test with two browser windows.
      </p>
    </div>
  );
}; 