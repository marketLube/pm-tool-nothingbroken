import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Task } from '../types';
import { useAuth } from './AuthContext';
import * as taskService from '../services/taskService';

interface SimpleRealtimeContextType {
  refreshTasks: () => void;
  isConnected: boolean;
  pausePolling: (reason: string) => void;
  resumePolling: (reason: string) => void;
}

const SimpleRealtimeContext = createContext<SimpleRealtimeContextType | null>(null);

// Global callback registry - shared across all instances
const globalCallbacks = new Set<() => void>();

// Global operation tracking to prevent polling during critical operations
const activeOperations = new Set<string>();
let isPaused = false;

export function SimpleRealtimeProvider({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Function to pause polling during critical operations
  const pausePolling = (reason: string) => {
    console.log(`⏸️ [SimpleRealtime] Pausing polling - Reason: ${reason}`);
    activeOperations.add(reason);
    isPaused = true;
  };

  // Function to resume polling after operations complete
  const resumePolling = (reason: string) => {
    console.log(`▶️ [SimpleRealtime] Resuming polling - Removing reason: ${reason}`);
    activeOperations.delete(reason);
    if (activeOperations.size === 0) {
      isPaused = false;
      console.log(`✅ [SimpleRealtime] All operations complete - Polling resumed`);
    } else {
      console.log(`⏳ [SimpleRealtime] Still paused - Active operations: ${Array.from(activeOperations).join(', ')}`);
    }
  };

  // Smart polling that respects active operations
  const performPoll = () => {
    if (isPaused) {
      console.log(`⏸️ [SimpleRealtime] Poll tick skipped - Active operations: ${Array.from(activeOperations).join(', ')}`);
      return;
    }

    console.log(`🔄 [SimpleRealtime] Poll tick - triggering ${globalCallbacks.size} callbacks`);
    
    // Trigger refresh for all subscribed components
    globalCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('[SimpleRealtime] Error in refresh callback:', error);
      }
    });
  };

  // Simple polling every 3 seconds when user is active
  useEffect(() => {
    console.log(`🔄 [SimpleRealtime] Auth state changed - isLoggedIn: ${isLoggedIn}`);
    
    if (!isLoggedIn) {
      setIsConnected(false);
      // Clear any active operations on logout
      activeOperations.clear();
      isPaused = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      console.log('❌ [SimpleRealtime] Disconnected - User not authenticated');
      return;
    }

    setIsConnected(true);
    console.log('🔄 [SimpleRealtime] Starting smart polling every 3 seconds...');

    pollIntervalRef.current = setInterval(performPoll, 3000); // Poll every 3 seconds with smart logic

    return () => {
      console.log('🔄 [SimpleRealtime] Stopping polling...');
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      setIsConnected(false);
    };
  }, [isLoggedIn]);

  const refreshTasks = () => {
    if (isPaused) {
      console.log(`⏸️ [SimpleRealtime] Manual refresh skipped - Active operations: ${Array.from(activeOperations).join(', ')}`);
      return;
    }
    
    console.log(`🔄 [SimpleRealtime] Manual refresh - triggering ${globalCallbacks.size} callbacks`);
    globalCallbacks.forEach(callback => callback());
  };

  return (
    <SimpleRealtimeContext.Provider value={{ refreshTasks, isConnected, pausePolling, resumePolling }}>
      {children}
    </SimpleRealtimeContext.Provider>
  );
}

export function useSimpleRealtime() {
  const context = useContext(SimpleRealtimeContext);
  if (!context) {
    throw new Error('useSimpleRealtime must be used within SimpleRealtimeProvider');
  }
  return context;
}

// Hook for components to subscribe to task updates
export function useTaskRefresh() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { isLoggedIn } = useAuth();

  const refreshTasks = async () => {
    if (!isLoggedIn) return;
    
    setIsLoading(true);
    try {
      console.log('🔄 [TaskRefresh] Fetching fresh tasks...');
      const freshTasks = await taskService.getTasks();
      setTasks(freshTasks);
      console.log(`✅ [TaskRefresh] Updated to ${freshTasks.length} tasks`);
    } catch (error) {
      console.error('[TaskRefresh] Error fetching tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Subscribe to global refresh events
  useEffect(() => {
    console.log('🔄 [TaskRefresh] Registering callback with global system');
    
    // Add this refresh function to the global set
    globalCallbacks.add(refreshTasks);
    
    // Initial load
    if (isLoggedIn) {
      refreshTasks();
    }

    // Cleanup on unmount
    return () => {
      console.log('🔄 [TaskRefresh] Unregistering callback from global system');
      globalCallbacks.delete(refreshTasks);
    };
  }, [isLoggedIn]);

  return { tasks, isLoading, refreshTasks };
} 