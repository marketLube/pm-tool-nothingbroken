import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef, useMemo } from 'react';
import { Client, Report, Task, Team, TeamType, User, StatusCode } from '../types';
import { isSupabaseConfigured } from '../utils/supabase';
import * as userService from '../services/userService';
import * as taskService from '../services/taskService';
import * as clientService from '../services/clientService';
import * as statusService from '../services/statusService';
import * as dailyReportService from '../services/dailyReportService';
import { TaskSearchFilters } from '../services/taskService';
import { UserSearchFilters } from '../services/userService';
import { ClientSearchFilters } from '../services/clientService';
import { format } from 'date-fns';
import { useAuth } from './AuthContext';
import { updateUserPassword } from '../services/authService';
import { getIndiaDateTime, getIndiaDate } from '../utils/timezone';
import { useRealtime } from './RealtimeContext';
import { useStatus } from './StatusContext';

// Import TaskRealtimeEvent type
interface TaskRealtimeEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  old?: Task;
  new?: Task;
}

interface DataContextType {
  // Data
  users: User[];
  teams: Team[];
  clients: Client[];
  tasks: Task[];
  reports: Report[];
  analytics: {
    creative: {
      taskCompletion: number;
      reportSubmission: number;
      overdueTasksCount: number;
    };
    web: {
      taskCompletion: number;
      reportSubmission: number;
      overdueTasksCount: number;
    };
  };
  isLoading: boolean;
  
  // 🔥 NEW: Force re-render trigger
  forceUpdate: () => void;

  // User actions
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  toggleUserStatus: (userId: string) => Promise<User>;
  searchUsers: (filters: UserSearchFilters) => Promise<User[]>;

  // Task actions
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<void>;
  updateTask: (task: Task) => Promise<void>;
  updateTaskStatus: (taskId: string, status: StatusCode) => Promise<Task>;
  deleteTask: (taskId: string) => Promise<void>;
  createTestOverdueTask: () => Promise<Task>;
  searchTasks: (filters: TaskSearchFilters) => Promise<Task[]>;

  // 🔥 NEW: Drag operation management
  setDragOperationActive: (active: boolean) => void;
  isDragOperationActive: () => boolean;

  // Client actions
  addClient: (client: Omit<Client, 'id' | 'dateAdded'>) => Promise<Client>;
  updateClient: (client: Client) => Promise<void>;
  deleteClient: (clientId: string) => Promise<void>;
  refreshClients: () => Promise<void>;
  searchClients: (filters: ClientSearchFilters) => Promise<Client[]>;

  // Report actions
  addReport: (report: Omit<Report, 'id'>) => Promise<void>;
  updateReport: (report: Report) => Promise<void>;
  approveReport: (reportId: string, approved: boolean, feedback?: string) => Promise<void>;
  submitReport: (userId: string, reportData: Omit<Report, 'id' | 'userId' | 'submitted' | 'approved'>) => Promise<void>;
  searchReports: (filters: {
    dateStart?: string;
    dateEnd?: string;
    teamId?: TeamType;
    userId?: string;
    status?: 'all' | 'submitted' | 'approved' | 'rejected' | 'pending';
    clientId?: string;
  }) => Promise<Report[]>;

  // Team actions
  updateTeam: (team: Team) => Promise<void>;

  // Helper methods
  getTasksByUser: (userId: string) => Task[];
  getTasksByTeam: (teamId: TeamType) => Task[];
  getUsersByTeam: (teamId: TeamType) => User[];
  getClientsByTeam: (teamId: TeamType) => Client[];
  getReportsByUser: (userId: string) => Report[];
  getReportsByDate: (date: string) => Report[];
  getUserById: (userId: string) => User | undefined;
  getClientById: (clientId: string) => Client | undefined;
  getTeamById: (teamId: TeamType) => Team | undefined;
  getTaskById: (taskId: string) => Task | undefined;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

interface DataProviderProps {
  children: ReactNode;
}

export function DataProvider({ children }: DataProviderProps) {
  const { isLoggedIn, currentUser } = useAuth();
  const realtimeHook = useRealtime();

  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // 🔥 NEW: Force update counter for triggering re-renders
  const [updateCounter, setUpdateCounter] = useState(0);
  const forceUpdate = useCallback(() => {
    setUpdateCounter(prev => prev + 1);
    console.log('🔄 [DataContext] Force update triggered');
  }, []);
  
  // 🔥 CRITICAL FIX: Use refs to avoid stale closures
  const isInitialLoadRef = useRef(true);
  const isDragOperationActiveRef = useRef(false);
  
  // Keep refs in sync with state
  useEffect(() => {
    isInitialLoadRef.current = isInitialLoad;
  }, [isInitialLoad]);
  
  // Default analytics
  const [analytics, setAnalytics] = useState({
    creative: {
      taskCompletion: 0,
      reportSubmission: 0,
      overdueTasksCount: 0
    },
    web: {
      taskCompletion: 0,
      reportSubmission: 0,
      overdueTasksCount: 0
    }
  });

  // 🔥 STABLE: Analytics calculation - never changes
  const updateTaskAnalytics = useCallback((currentTasks: Task[]) => {
    // Always use the passed tasks parameter to avoid stale closures
    const tasksToAnalyze = currentTasks;
    
    // Filter tasks by team and calculate completion rates
    const creativeTasksAll = tasksToAnalyze.filter(task => task.team === 'creative');
    const webTasksAll = tasksToAnalyze.filter(task => task.team === 'web');
    
    // Calculate overdue tasks (due before today)
    const today = getIndiaDateTime();
    
    // Count overdue tasks by team
    const creativeOverdue = creativeTasksAll.filter(task => 
      task.dueDate && new Date(task.dueDate) < today && task.status !== 'completed'
    ).length;
    
    const webOverdue = webTasksAll.filter(
      task => task.dueDate && new Date(task.dueDate) < today && task.status !== 'completed'
    ).length;
    
    // Calculate completion percentages 
    const creativeCompletion = creativeTasksAll.length > 0 
      ? Math.round((creativeTasksAll.filter(task => task.status === 'approved' || task.status === 'done').length / creativeTasksAll.length) * 100)
      : 0;
      
    const webCompletion = webTasksAll.length > 0
      ? Math.round((webTasksAll.filter(task => task.status === 'completed' || task.status === 'done').length / webTasksAll.length) * 100)
      : 0;
    
    // Update analytics
    setAnalytics({
      creative: {
        taskCompletion: creativeCompletion,
        reportSubmission: 0, // Will implement if we add report tracking
        overdueTasksCount: creativeOverdue
      },
      web: {
        taskCompletion: webCompletion,
        reportSubmission: 0, // Will implement if we add report tracking
        overdueTasksCount: webOverdue
      }
    });
  }, []); // Empty dependencies since it only uses the passed parameter

  // 🔥 CRITICAL FIX: Handle realtime events with refs - never changes
  const handleRealtimeTaskEvent = useCallback((event: TaskRealtimeEvent) => {
    console.log(`🔄 [DataContext] Received real-time event:`, event);
    
    // Use refs to avoid stale closures
    if (isInitialLoadRef.current) {
      console.log(`⏸️ [DataContext] Skipping event - initial load in progress`);
      return;
    }

    // 🔥 FIX: Don't skip updates during drag - instead debounce them
    const shouldProcessEvent = !isDragOperationActiveRef.current;
    console.log(`🎯 [DataContext] Should process event: ${shouldProcessEvent} (drag active: ${isDragOperationActiveRef.current})`);
    
    switch (event.eventType) {
      case 'INSERT':
        console.log(`➕ [DataContext] Processing INSERT event for task: ${event.new?.id}`);
        if (event.new) {
          setTasks(prevTasks => {
            // Check if task already exists (avoid duplicates)
            const exists = prevTasks.some(task => task.id === event.new!.id);
            console.log(`🔍 [DataContext] Task ${event.new!.id} already exists: ${exists}`);
            if (!exists) {
              const updatedTasks = [...prevTasks, event.new!];
              console.log(`✅ [DataContext] Added new task, total tasks: ${updatedTasks.length}`);
              // 🔥 FIX: Recalculate analytics immediately
              if (shouldProcessEvent) {
                console.log(`📊 [DataContext] Recalculating analytics after INSERT`);
                updateTaskAnalytics(updatedTasks);
              }
              // 🔥 NEW: Multiple force update mechanisms
              setTimeout(() => {
                forceUpdate();
                // 🔥 AGGRESSIVE: Dispatch window event to force global re-renders
                window.dispatchEvent(new CustomEvent('taskDataUpdated', { 
                  detail: { type: 'INSERT', task: event.new } 
                }));
              }, 50);
              return updatedTasks;
            }
            console.log(`⏭️ [DataContext] Skipping duplicate task ${event.new!.id}`);
            return prevTasks;
          });
        }
        break;
        
      case 'UPDATE':
        console.log(`🔄 [DataContext] Processing UPDATE event for task: ${event.new?.id}`);
        if (event.new) {
          setTasks(prevTasks => {
            const taskIndex = prevTasks.findIndex(task => task.id === event.new!.id);
            console.log(`🔍 [DataContext] Found task at index: ${taskIndex}`);
            const updated = prevTasks.map(task => 
              task.id === event.new!.id ? event.new! : task
            );
            console.log(`✅ [DataContext] Updated task ${event.new!.id}, total tasks: ${updated.length}`);
            // 🔥 FIX: Recalculate analytics immediately
            if (shouldProcessEvent) {
              console.log(`📊 [DataContext] Recalculating analytics after UPDATE`);
              updateTaskAnalytics(updated);
            }
            // 🔥 NEW: Multiple force update mechanisms
            setTimeout(() => {
              forceUpdate();
              // 🔥 AGGRESSIVE: Dispatch window event to force global re-renders
              window.dispatchEvent(new CustomEvent('taskDataUpdated', { 
                detail: { type: 'UPDATE', task: event.new } 
              }));
            }, 50);
            return updated;
          });
        }
        break;
        
      case 'DELETE':
        console.log(`🗑️ [DataContext] Processing DELETE event for task: ${event.old?.id}`);
        if (event.old) {
          setTasks(prevTasks => {
            const filtered = prevTasks.filter(task => task.id !== event.old!.id);
            console.log(`✅ [DataContext] Deleted task ${event.old!.id}, remaining tasks: ${filtered.length}`);
            // 🔥 FIX: Recalculate analytics immediately
            if (shouldProcessEvent) {
              console.log(`📊 [DataContext] Recalculating analytics after DELETE`);
              updateTaskAnalytics(filtered);
            }
            // 🔥 NEW: Multiple force update mechanisms
            setTimeout(() => {
              forceUpdate();
              // 🔥 AGGRESSIVE: Dispatch window event to force global re-renders
              window.dispatchEvent(new CustomEvent('taskDataUpdated', { 
                detail: { type: 'DELETE', task: event.old } 
              }));
            }, 50);
            return filtered;
          });
        }
        break;
        
      default:
        console.warn(`⚠️ [DataContext] Unknown event type: ${event.eventType}`);
    }
  }, [forceUpdate, updateTaskAnalytics]); // 🔥 Add necessary dependencies

  // Subscribe to realtime events - only runs when needed
  useEffect(() => {
    if (realtimeHook && isLoggedIn && !isInitialLoadRef.current) {
      const unsubscribe = realtimeHook.onTaskEvent(handleRealtimeTaskEvent);
      return unsubscribe;
    }
  }, [realtimeHook, isLoggedIn, handleRealtimeTaskEvent]); // 🔥 REMOVED isInitialLoad - using ref instead

  // Load data when user is authenticated - only runs when login changes
  useEffect(() => {
    if (!isLoggedIn) {
      // Reset all state when user logs out
      setUsers([]);
      setClients([]);
      setTasks([]);
      setTeams([]);
      setReports([]);
      setIsInitialLoad(true);
      setIsLoading(false);
      return;
    }
    
    const loadData = async () => {
      if (!isSupabaseConfigured()) {
        console.error('Supabase is not configured. Unable to load data.');
        return;
      }

      setIsLoading(true);
      try {
        // Load users
        const usersData = await userService.getUsers();
        setUsers(usersData);

        // Load clients
        const clientsData = await clientService.getClients();
        setClients(clientsData);

        // Load tasks
        const tasksData = await taskService.getTasks();
        setTasks(tasksData);

        // Set up teams
        const creativeTeamMembers = usersData.filter(u => u.team === 'creative');
        const webTeamMembers = usersData.filter(u => u.team === 'web');
        
        const teamsData: Team[] = [
          {
            id: 'creative',
            name: 'Creative Team',
            managerId: creativeTeamMembers.find(u => u.role === 'manager')?.id || '',
            description: 'Handles all design and creative aspects of projects',
            memberCount: creativeTeamMembers.length
          },
          {
            id: 'web',
            name: 'Web Team',
            managerId: webTeamMembers.find(u => u.role === 'manager')?.id || '',
            description: 'Develops and maintains web applications',
            memberCount: webTeamMembers.length
          }
        ];
        
        setTeams(teamsData);
        
        // Calculate analytics
        updateTaskAnalytics(tasksData);
        
        // Mark initial load as complete
        setIsInitialLoad(false);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isLoggedIn]); // 🔥 REMOVED updateTaskAnalytics - it's memoized with empty deps

  // Re-sync on realtime reconnection - only when status changes
  useEffect(() => {
    if (realtimeHook?.status === 'live' && !isInitialLoadRef.current && !isLoading && isLoggedIn) {
      const resyncTasks = async () => {
        try {
          const freshTasks = await taskService.getTasks();
          setTasks(prevTasks => {
            // Only update if tasks have actually changed
            if (JSON.stringify(prevTasks) !== JSON.stringify(freshTasks)) {
              updateTaskAnalytics(freshTasks);
              return freshTasks;
            }
            return prevTasks;
          });
        } catch (error) {
          console.error('Error during re-sync:', error);
        }
      };
      
      // Debounce the re-sync to avoid multiple calls
      const timeoutId = setTimeout(resyncTasks, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [realtimeHook?.status, isLoading, isLoggedIn]); // 🔥 REMOVED updateTaskAnalytics - it's memoized with empty deps

  // User actions
  const addUser = async (user: Omit<User, 'id'>) => {
    try {
      console.log('Creating user in Supabase:', {
        name: user.name,
        email: user.email,
        role: user.role,
        team: user.team,
        password: user.password ? 'password provided' : 'no password',
        allowedStatuses: user.allowedStatuses?.length || 0
      });
      
      const newUser = await userService.createUser(user);
      console.log('User created successfully with ID:', newUser.id);
      
      setUsers([...users, newUser]);
      updateTeamMemberCount(user.team, 1);
    } catch (error) {
      console.error('Error adding user:', error);
      throw error; // Re-throw to let the caller handle it
    }
  };

  const updateUser = async (updatedUser: User) => {
    try {
      const oldUser = users.find(u => u.id === updatedUser.id);
      
      // Check if password was changed
      const passwordChanged = updatedUser.password && 
                             oldUser && 
                             updatedUser.password !== oldUser.password;
      
      let updated: User;
      
      if (passwordChanged && updatedUser.password) {
        // Use auth service to update both custom table and Supabase Auth
        console.log('Password changed detected, updating via authService...');
        updated = await updateUserPassword(updatedUser, updatedUser.password);
      } else {
        // Regular user update without password change
        updated = await userService.updateUser(updatedUser);
      }
      
      setUsers(users.map(user => 
        user.id === updatedUser.id ? updated : user
      ));
      
      // Update team member count if team changed
      if (oldUser && oldUser.team !== updatedUser.team) {
        updateTeamMemberCount(oldUser.team, -1);
        updateTeamMemberCount(updatedUser.team, 1);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      throw error; // Re-throw to let the frontend handle it
    }
  };

  const toggleUserStatus = async (userId: string) => {
    try {
      console.log(`Starting to toggle status for user: ${userId}`);
      const updated = await userService.toggleUserStatus(userId);
      console.log(`Successfully toggled status for user ${userId} in service, updating state`);
      
      setUsers(users.map(user => 
        user.id === userId ? updated : user
      ));
      
      console.log(`State updated for user ${userId}`);
      return updated;
    } catch (error) {
      console.error('Error toggling user status:', error);
      // Re-throw to allow the UI to handle the error
      throw error;
    }
  };

  // Task actions (these will trigger realtime events for other users)
  const addTask = async (task: Omit<Task, 'id' | 'createdAt'>) => {
    try {
      console.log('[DataContext] Creating task:', task.title);
      const newTask = await taskService.createTask(task);
      
      // Update local state immediately (realtime event will be ignored due to duplicate check)
      setTasks(prevTasks => {
        const updatedTasks = [...prevTasks, newTask];
        // Calculate analytics with the new tasks array
        updateTaskAnalytics(updatedTasks);
        return updatedTasks;
      });
      
      console.log('[DataContext] Task created successfully:', newTask.id);
    } catch (error) {
      console.error('Error adding task:', error);
      throw error;
    }
  };

  const updateTask = async (updatedTask: Task) => {
    try {
      console.log('[DataContext] Updating task:', updatedTask.title);
      const updated = await taskService.updateTask(updatedTask);
      
      // Update local state immediately
      setTasks(prevTasks => {
        const updatedTasks = prevTasks.map(task => 
        task.id === updatedTask.id ? updated : task
        );
        // Calculate analytics with the updated tasks array
        updateTaskAnalytics(updatedTasks);
        return updatedTasks;
      });
      
      console.log('[DataContext] Task updated successfully:', updated.id);
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  };

  const updateTaskStatus = async (taskId: string, status: StatusCode) => {
    try {
      console.log('[DataContext] Updating task status:', taskId, 'to', status);
      const updated = await taskService.updateTaskStatus(taskId, status);
      
      // Update local state immediately
      setTasks(prevTasks => {
        const updatedTasks = prevTasks.map(task => 
        task.id === taskId ? updated : task
        );
        // Calculate analytics with the updated tasks array
        updateTaskAnalytics(updatedTasks);
        return updatedTasks;
      });
      
      console.log('[DataContext] Task status updated successfully');
      return updated;
    } catch (error) {
      console.error('Error updating task status:', error);
      throw error;
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      console.log('[DataContext] Deleting task:', taskId);
      await taskService.deleteTask(taskId);
      
      // Update local state immediately
      setTasks(prevTasks => {
        const updatedTasks = prevTasks.filter(task => task.id !== taskId);
        // Calculate analytics with the updated tasks array
        updateTaskAnalytics(updatedTasks);
        return updatedTasks;
      });
      
      console.log('[DataContext] Task deleted successfully:', taskId);
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  };

  // Demo function to create test overdue task
  const createTestOverdueTask = async () => {
    try {
      if (!currentUser || clients.length === 0) {
        throw new Error('User not logged in or no clients available');
      }
      
      // Use the first available client
      const firstClient = clients[0];
      console.log('[DataContext] Creating test overdue task for client:', firstClient.name);
      
      const newTask = await taskService.createTestOverdueTask(currentUser.id, firstClient.id);
      
      // Update local state immediately
      setTasks(prevTasks => {
        const updatedTasks = [...prevTasks, newTask];
        updateTaskAnalytics(updatedTasks);
        return updatedTasks;
      });
      
      console.log('[DataContext] Test overdue task created successfully:', newTask.id);
      return newTask;
    } catch (error) {
      console.error('Error creating test overdue task:', error);
      throw error;
    }
  };

  const searchTasks = async (filters: TaskSearchFilters) => {
    try {
      return await taskService.searchTasks(filters);
    } catch (error) {
      console.error('Error searching tasks:', error);
      throw error;
    }
  };

  const searchUsers = async (filters: UserSearchFilters) => {
    try {
      return await userService.searchUsers(filters);
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  };

  const searchClients = async (filters: ClientSearchFilters) => {
    try {
      return await clientService.searchClients(filters);
    } catch (error) {
      console.error('Error searching clients:', error);
      return [];
    }
  };

  // Search reports with filters
  const searchReports = async (filters: {
    dateStart?: string;
    dateEnd?: string;
    teamId?: TeamType;
    userId?: string;
    status?: 'all' | 'submitted' | 'approved' | 'rejected' | 'pending';
    clientId?: string;
  }) => {
    try {
      // For now, implement client-side filtering since reports are in-memory
      // This can be converted to database queries when reports are moved to Supabase
      let filteredReports = [...reports];

      // Filter by date range
      if (filters.dateStart) {
        filteredReports = filteredReports.filter(report => report.date >= filters.dateStart!);
      }
      if (filters.dateEnd) {
        filteredReports = filteredReports.filter(report => report.date <= filters.dateEnd!);
      }

      // Filter by team
      if (filters.teamId) {
        const teamUserIds = users
          .filter(user => user.team === filters.teamId)
          .map(user => user.id);
        filteredReports = filteredReports.filter(report => teamUserIds.includes(report.userId));
      }

      // Filter by user
      if (filters.userId) {
        filteredReports = filteredReports.filter(report => report.userId === filters.userId);
      }

      // Filter by status
      if (filters.status && filters.status !== 'all') {
        switch (filters.status) {
          case 'submitted':
            filteredReports = filteredReports.filter(report => report.submitted);
            break;
          case 'approved':
            filteredReports = filteredReports.filter(report => report.approved === true);
            break;
          case 'rejected':
            filteredReports = filteredReports.filter(report => report.approved === false);
            break;
          case 'pending':
            filteredReports = filteredReports.filter(report => report.submitted && report.approved === null);
            break;
        }
      }

      // Filter by client (check tasks in report)
      if (filters.clientId) {
        filteredReports = filteredReports.filter(report => {
          const reportTaskIds = report.tasks.map(t => t.taskId);
          const reportTasks = reportTaskIds.map(id => getTaskById(id)).filter(Boolean);
          return reportTasks.some(task => task?.clientId === filters.clientId);
        });
      }

      return filteredReports;
    } catch (error) {
      console.error('Error searching reports:', error);
      return [];
    }
  };

  // Client actions
  const addClient = async (client: Omit<Client, 'id' | 'dateAdded'>) => {
    try {
      console.log('DataContext: Adding client:', client);
      const newClient = await clientService.createClient(client);
      console.log('DataContext: Client added successfully:', newClient);
      setClients([...clients, newClient]);
      return newClient; // Return the new client for confirmation
    } catch (error) {
      console.error('DataContext: Error adding client:', error);
      // You might want to show a notification here
      throw error; // Re-throw to allow component to handle error
    }
  };

  const updateClient = async (client: Client) => {
    try {
      const updated = await clientService.updateClient(client);
      setClients(clients.map(c => 
        c.id === client.id ? updated : c
      ));
    } catch (error) {
      console.error('Error updating client:', error);
    }
  };

  const deleteClient = async (clientId: string) => {
    try {
      console.log('DataContext: Attempting to delete client:', clientId);
      console.log('DataContext: Current clients before deletion:', clients.map(c => ({ id: c.id, name: c.name })));
      
      // Check if client exists in local state
      const clientExists = clients.find(c => c.id === clientId);
      if (!clientExists) {
        console.warn('DataContext: Client not found in local state, but proceeding with deletion');
      } else {
        console.log('DataContext: Found client in local state:', clientExists.name);
      }
      
      await clientService.deleteClient(clientId);
      console.log('DataContext: Client deleted from database successfully');
      
      // Force refresh clients from database to ensure we have the latest data
      const refreshedClients = await clientService.getClients();
      setClients(refreshedClients);
      console.log('DataContext: Clients refreshed from database:', refreshedClients.map(c => ({ id: c.id, name: c.name })));
      
      // Also refresh tasks to reflect any reassignments
      const updatedTasks = await taskService.getTasks();
      setTasks(updatedTasks);
      console.log('DataContext: Tasks refreshed after client deletion');
      
    } catch (error) {
      console.error('DataContext: Error deleting client:', error);
      
      // Provide more specific error messages
      if (error && typeof error === 'object' && 'message' in error) {
        throw new Error(`Failed to delete client: ${error.message}`);
      } else {
        throw new Error('Failed to delete client: Unknown error occurred');
      }
    }
  };

  const refreshClients = async () => {
    try {
      const refreshedClients = await clientService.getClients();
      setClients(refreshedClients);
    } catch (error) {
      console.error('Error refreshing clients:', error);
    }
  };

  // Team actions
  const updateTeam = async (team: Team) => {
    setTeams(teams.map(t => 
      t.id === team.id ? team : t
    ));
  };

  // Update team member count helper
  const updateTeamMemberCount = (teamId: TeamType, change: number) => {
    setTeams(teams.map(team => 
      team.id === teamId 
        ? { ...team, memberCount: team.memberCount + change } 
        : team
    ));
  };

  // Report actions (keeping simpler implementation for now)
  const addReport = async (report: Omit<Report, 'id'>) => {
    const newReport: Report = {
      ...report,
      id: `report${reports.length + 1}`,
    };
    setReports([...reports, newReport]);
  };

  const updateReport = async (report: Report) => {
    setReports(reports.map(r => 
      r.id === report.id ? report : r
    ));
  };

  const approveReport = async (reportId: string, approved: boolean, feedback?: string) => {
    setReports(reports.map(report => 
      report.id === reportId 
        ? { ...report, approved, feedback: feedback || report.feedback } 
        : report
    ));
  };

  const submitReport = async (
    userId: string, 
    reportData: Omit<Report, 'id' | 'userId' | 'submitted' | 'approved'>
  ) => {
    const newReport: Report = {
      ...reportData,
      id: `report${reports.length + 1}`,
      userId,
      submitted: true,
      approved: null,
    };
    
    setReports([...reports, newReport]);
  };

  // Helper methods
  const getTasksByUser = (userId: string) => {
    return tasks.filter(task => task.assigneeId === userId);
  };

  const getTasksByTeam = (teamId: TeamType) => {
    return tasks.filter(task => task.team === teamId);
  };

  const getUsersByTeam = (teamId: TeamType) => {
    return users.filter(user => user.team === teamId || user.role === 'admin');
  };

  const getClientsByTeam = (teamId: TeamType) => {
    return clients.filter(client => client.team === teamId);
  };

  const getReportsByUser = (userId: string) => {
    return reports.filter(report => report.userId === userId);
  };

  const getReportsByDate = (date: string) => {
    return reports.filter(report => report.date === date);
  };

  const getUserById = (userId: string) => {
    return users.find(user => user.id === userId);
  };

  const getClientById = (clientId: string) => {
    return clients.find(client => client.id === clientId);
  };

  const getTeamById = (teamId: TeamType) => {
    return teams.find(team => team.id === teamId);
  };

  const getTaskById = (taskId: string) => {
    return tasks.find(task => task.id === taskId);
  };

  const syncTasksWithReports = async () => {
    try {
      const today = getIndiaDateTime();
      const todayStr = today.toISOString().split('T')[0];
      
      // Get all tasks assigned for today
      const todayTasks = tasks.filter(task => 
        task.dueDate === todayStr && task.assigneeId
      );

      // ... existing code ...
    } catch (error) {
      console.error('Error syncing tasks with reports:', error);
    }
  };

  // 🔥 NEW: Drag operation management
  const setDragOperationActive = (active: boolean) => {
    isDragOperationActiveRef.current = active;
    
    // 🔥 FIX: Recalculate analytics when drag operation ends
    if (!active) {
      // Delay slightly to ensure task state is updated
      setTimeout(() => {
        updateTaskAnalytics(tasks);
      }, 100);
    }
  };

  const isDragOperationActive = () => {
    return isDragOperationActiveRef.current;
  };

  // 🔥 CRITICAL FIX: Memoize the context value to prevent constant recreations
  const contextValue = useMemo(() => ({
        users,
        teams,
        clients,
        tasks,
        reports,
        analytics,
        isLoading,
        addUser,
        updateUser,
        toggleUserStatus,
        addTask,
        updateTask,
        updateTaskStatus,
        deleteTask,
        createTestOverdueTask,
        addClient,
        updateClient,
        deleteClient,
        refreshClients,
        addReport,
        updateReport,
        approveReport,
        submitReport,
        updateTeam,
        getTasksByUser,
        getTasksByTeam,
        getUsersByTeam,
        getClientsByTeam,
        getReportsByUser,
        getReportsByDate,
        getUserById,
        getClientById,
        getTeamById,
        getTaskById,
        searchTasks,
        searchUsers,
        searchClients,
    searchReports,
    setDragOperationActive,
    isDragOperationActive,
    forceUpdate
  }), [
    // 🔥 ONLY include primitive state values - never functions
    users,
    teams,
    clients,
    tasks,
    reports,
    analytics,
    isLoading,
    forceUpdate
    // 🔥 CRITICAL: Exclude all functions - they're memoized separately
  ]);

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};