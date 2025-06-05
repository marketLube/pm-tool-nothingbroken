import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../utils/supabase';
import { Task } from '../types';
import { useAuth } from './AuthContext';

// Real-time connection status types
type ConnectionStatus = 'connecting' | 'live' | 'disconnected';

// Real-time event types for tasks
interface TaskRealtimeEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  old?: Task;
  new?: Task;
}

interface RealtimeContextType {
  status: ConnectionStatus;
  isSubscribed: boolean;
  // Event handlers that components can register
  onTaskEvent: (handler: (event: TaskRealtimeEvent) => void) => () => void;
  // Manual reconnection
  reconnect: () => void;
}

const RealtimeContext = createContext<RealtimeContextType | null>(null);

interface RealtimeProviderProps {
  children: ReactNode;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const { isLoggedIn, currentUser } = useAuth();
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [eventHandlers, setEventHandlers] = useState<Set<(event: TaskRealtimeEvent) => void>>(new Set());
  
  // Use refs to avoid all circular dependencies
  const channelRef = useRef<any>(null);
  const eventHandlersRef = useRef(eventHandlers);
  const isLoggedInRef = useRef(isLoggedIn);
  const currentUserIdRef = useRef<string | null>(currentUser?.id || null);
  
  // Keep refs updated without causing re-renders
  useEffect(() => {
    eventHandlersRef.current = eventHandlers;
  }, [eventHandlers]);
  
  useEffect(() => {
    isLoggedInRef.current = isLoggedIn;
  }, [isLoggedIn]);
  
  useEffect(() => {
    currentUserIdRef.current = currentUser?.id || null;
  }, [currentUser?.id]);

  // 🔥 STABLE: Map function - never changes
  const mapFromDbTask = useCallback((dbTask: any): Task => {
    return {
      id: dbTask.id,
      title: dbTask.title,
      description: dbTask.description,
      status: dbTask.status,
      priority: dbTask.priority,
      assigneeId: dbTask.assignee_id,
      clientId: dbTask.client_id,
      team: dbTask.team,
      dueDate: dbTask.due_date,
      createdAt: dbTask.created_at,
      createdBy: dbTask.created_by
    };
  }, []);

  // 🔥 STABLE: Broadcast function - never changes
  const broadcastEvent = useCallback((event: TaskRealtimeEvent) => {
    eventHandlersRef.current.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in realtime event handler:', error);
      }
    });
  }, []);

  // 🔥 STABLE: Register event handler - prevent Set recreations
  const onTaskEvent = useCallback((handler: (event: TaskRealtimeEvent) => void) => {
    setEventHandlers(prev => {
      const next = new Set(prev);
      next.add(handler);
      return next;
    });
    
    // Return unsubscribe function that's also stable
    return () => {
      setEventHandlers(prev => {
        const next = new Set(prev);
        next.delete(handler);
        return next;
      });
    };
  }, []); // 🔥 EMPTY DEPS - truly stable

  // 🔥 STABLE: Cleanup function - never changes  
  const cleanup = useCallback(() => {
    if (channelRef.current && supabase) {
      console.log('[Realtime] Cleaning up subscription...');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setIsSubscribed(false);
      setStatus('disconnected');
    }
  }, []);

  // 🔥 STABLE: Setup function - never changes
  const setupSubscription = useCallback(() => {
    if (!isLoggedInRef.current) {
      console.log('[Realtime] User not logged in, skipping subscription');
      return;
    }

    if (!supabase) {
      console.log('[Realtime] Supabase not configured, skipping subscription');
      return;
    }

    console.log('[Realtime] Setting up tasks subscription...');
    setStatus('connecting');

    // Create channel for tasks table
    const newChannel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT',
          schema: 'public',
          table: 'tasks'
        },
        (payload) => {
          console.log('[Realtime] Task created:', payload.new);
          broadcastEvent({
            eventType: 'INSERT',
            new: mapFromDbTask(payload.new)
          });
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks'
        },
        (payload) => {
          console.log('📥 [Realtime] Task updated payload received:', payload);
          console.log('📄 [Realtime] Old task data:', payload.old);
          console.log('📄 [Realtime] New task data:', payload.new);
          
          const mappedOld = payload.old ? mapFromDbTask(payload.old) : undefined;
          const mappedNew = mapFromDbTask(payload.new);
          
          console.log('🔄 [Realtime] Mapped old task:', mappedOld);
          console.log('🔄 [Realtime] Mapped new task:', mappedNew);
          
          const event = {
            eventType: 'UPDATE' as const,
            old: mappedOld,
            new: mappedNew
          };
          
          console.log('📡 [Realtime] Broadcasting UPDATE event:', event);
          broadcastEvent(event);
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'DELETE',
          schema: 'public',
          table: 'tasks'
        },
        (payload) => {
          console.log('[Realtime] Task deleted:', payload.old);
          broadcastEvent({
            eventType: 'DELETE',
            old: mapFromDbTask(payload.old)
          });
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status);
        
        switch (status) {
          case 'SUBSCRIBED':
            console.log('✅ [Realtime] Successfully subscribed to tasks changes');
            setStatus('live');
            setIsSubscribed(true);
            break;
          case 'CHANNEL_ERROR':
            console.error('❌ [Realtime] Channel error');
            setStatus('disconnected');
            setIsSubscribed(false);
            break;
          case 'TIMED_OUT':
            console.error('⏰ [Realtime] Subscription timed out');
            setStatus('disconnected');
            setIsSubscribed(false);
            break;
          case 'CLOSED':
            console.log('🔒 [Realtime] Channel closed');
            setStatus('disconnected');
            setIsSubscribed(false);
            break;
        }
      });

    channelRef.current = newChannel;
  }, [mapFromDbTask, broadcastEvent]);

  // 🔥 STABLE: Manual reconnection - truly stable
  const reconnect = useCallback(() => {
    console.log('[Realtime] Manual reconnection requested...');
    // Cleanup current connection
    if (channelRef.current && supabase) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setIsSubscribed(false);
      setStatus('disconnected');
    }
    
    // Setup new connection after delay
    setTimeout(() => {
      if (isLoggedInRef.current && supabase) {
        console.log('[Realtime] Setting up tasks subscription...');
        setStatus('connecting');

        const newChannel = supabase
          .channel('tasks-changes')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks' }, (payload) => {
            console.log('[Realtime] Task created:', payload.new);
            broadcastEvent({ eventType: 'INSERT', new: mapFromDbTask(payload.new) });
          })
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks' }, (payload) => {
            console.log('📥 [Realtime] Task updated payload received:', payload);
            console.log('📄 [Realtime] Old task data:', payload.old);
            console.log('📄 [Realtime] New task data:', payload.new);
            
            const mappedOld = payload.old ? mapFromDbTask(payload.old) : undefined;
            const mappedNew = mapFromDbTask(payload.new);
            
            console.log('🔄 [Realtime] Mapped old task:', mappedOld);
            console.log('🔄 [Realtime] Mapped new task:', mappedNew);
            
            const event = {
              eventType: 'UPDATE' as const,
              old: mappedOld,
              new: mappedNew
            };
            
            console.log('📡 [Realtime] Broadcasting UPDATE event:', event);
            broadcastEvent(event);
          })
          .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tasks' }, (payload) => {
            console.log('[Realtime] Task deleted:', payload.old);
            broadcastEvent({ eventType: 'DELETE', old: mapFromDbTask(payload.old) });
          })
          .subscribe((status) => {
            console.log('[Realtime] Subscription status:', status);
            switch (status) {
              case 'SUBSCRIBED':
                console.log('✅ [Realtime] Successfully subscribed to tasks changes');
                setStatus('live');
                setIsSubscribed(true);
                break;
              case 'CHANNEL_ERROR':
              case 'TIMED_OUT':
              case 'CLOSED':
                setStatus('disconnected');
                setIsSubscribed(false);
                break;
            }
          });

        channelRef.current = newChannel;
      }
    }, 1000);
  }, [mapFromDbTask, broadcastEvent]); // 🔥 EMPTY DEPS - completely self-contained

  // 🔥 STABLE: Primary effect - only runs when auth state changes
  useEffect(() => {
    if (isLoggedIn && currentUser?.id) {
      setupSubscription();
    } else {
      cleanup();
    }

    return cleanup;
  }, [isLoggedIn, currentUser?.id, setupSubscription, cleanup]); // Only primitive values

  // 🔥 STABLE: Reconnection effect - only runs when status changes
  useEffect(() => {
    let reconnectTimer: NodeJS.Timeout;

    if (status === 'disconnected' && isLoggedInRef.current && currentUserIdRef.current) {
      console.log('[Realtime] Connection lost, attempting to reconnect in 5 seconds...');
      reconnectTimer = setTimeout(() => {
        // Direct calls instead of function references
        if (channelRef.current && supabase) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
          setIsSubscribed(false);
        }
        setTimeout(() => {
          if (isLoggedInRef.current && supabase) {
            setStatus('connecting');
            // Direct setup code to avoid function dependencies
            const newChannel = supabase.channel('tasks-changes')
              .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks' }, (payload) => {
                broadcastEvent({ eventType: 'INSERT', new: mapFromDbTask(payload.new) });
              })
              .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks' }, (payload) => {
                console.log('📥 [Realtime] Task updated payload received:', payload);
                console.log('📄 [Realtime] Old task data:', payload.old);
                console.log('📄 [Realtime] New task data:', payload.new);
                
                const mappedOld = payload.old ? mapFromDbTask(payload.old) : undefined;
                const mappedNew = mapFromDbTask(payload.new);
                
                console.log('🔄 [Realtime] Mapped old task:', mappedOld);
                console.log('🔄 [Realtime] Mapped new task:', mappedNew);
                
                const event = {
                  eventType: 'UPDATE' as const,
                  old: mappedOld,
                  new: mappedNew
                };
                
                console.log('📡 [Realtime] Broadcasting UPDATE event:', event);
                broadcastEvent(event);
              })
              .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tasks' }, (payload) => {
                broadcastEvent({ eventType: 'DELETE', old: mapFromDbTask(payload.old) });
              })
              .subscribe((status) => {
                switch (status) {
                  case 'SUBSCRIBED':
                    setStatus('live');
                    setIsSubscribed(true);
                    break;
                  default:
                    setStatus('disconnected');
                    setIsSubscribed(false);
                    break;
                }
              });
            channelRef.current = newChannel;
          }
        }, 1000);
      }, 5000);
    }

    return () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, [status, mapFromDbTask, broadcastEvent]); // Only primitive values

  // Keep refs in sync with auth state
  useEffect(() => {
    isLoggedInRef.current = isLoggedIn;
    currentUserIdRef.current = currentUser?.id || null;
  }, [isLoggedIn, currentUser?.id]);

  // 🔥 CRITICAL FIX: Memoize the context value to prevent constant recreations  
  const contextValue = useMemo(() => ({
    status,
    isSubscribed,
    onTaskEvent,
    reconnect
  }), [
    // 🔥 ONLY primitive state values - functions are already memoized
    status,
    isSubscribed,
    onTaskEvent,
    reconnect
    // 🔥 CRITICAL: onTaskEvent and reconnect are already useCallback-ed
  ]);

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
    </RealtimeContext.Provider>
  );
}

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}; 