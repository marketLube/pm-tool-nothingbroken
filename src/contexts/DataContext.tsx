import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Client, Report, Task, Team, TeamType, User, StatusCode } from '../types';
import { isSupabaseConfigured } from '../utils/supabase';
import * as userService from '../services/userService';
import * as taskService from '../services/taskService';
import * as clientService from '../services/clientService';
import * as statusService from '../services/statusService';
import * as dailyReportService from '../services/dailyReportService';
import { format } from 'date-fns';
import { useAuth } from './AuthContext';

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

  // User actions
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  toggleUserStatus: (userId: string) => Promise<User>;

  // Task actions
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<void>;
  updateTask: (task: Task) => Promise<void>;
  updateTaskStatus: (taskId: string, status: StatusCode) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;

  // Client actions
  addClient: (client: Omit<Client, 'id' | 'dateAdded'>) => Promise<Client>;
  updateClient: (client: Client) => Promise<void>;
  deleteClient: (clientId: string) => Promise<void>;

  // Report actions
  addReport: (report: Omit<Report, 'id'>) => Promise<void>;
  updateReport: (report: Report) => Promise<void>;
  approveReport: (reportId: string, approved: boolean, feedback?: string) => Promise<void>;
  submitReport: (userId: string, reportData: Omit<Report, 'id' | 'userId' | 'submitted' | 'approved'>) => Promise<void>;

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

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const { isAuthenticated, currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
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

  // Load data when user is authenticated
  useEffect(() => {
    // Only load data if the user is authenticated
    if (!isAuthenticated) {
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
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isAuthenticated]); // Reload when authentication state changes

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
      const updated = await userService.updateUser(updatedUser);
      
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

  // Task actions
  const addTask = async (task: Omit<Task, 'id' | 'createdAt'>) => {
    try {
      const newTask = await taskService.createTask(task);
      setTasks([...tasks, newTask]);
      updateTaskAnalytics();
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const updateTask = async (updatedTask: Task) => {
    try {
      const updated = await taskService.updateTask(updatedTask);
      setTasks(tasks.map(task => 
        task.id === updatedTask.id ? updated : task
      ));
      updateTaskAnalytics();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const updateTaskStatus = async (taskId: string, status: StatusCode) => {
    try {
      const updated = await taskService.updateTaskStatus(taskId, status);
      setTasks(tasks.map(task => 
        task.id === taskId ? updated : task
      ));
      updateTaskAnalytics();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      // First remove the task from all daily reports
      await dailyReportService.removeTaskFromAllDailyReports(taskId);
      
      // Then delete the task from the database
      await taskService.deleteTask(taskId);
      
      // Finally update the local state
      setTasks(tasks.filter(task => task.id !== taskId));
      updateTaskAnalytics();
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error; // Re-throw to allow UI to handle the error
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

  // Analytics calculation
  const updateTaskAnalytics = (currentTasks = tasks) => {
    // Process tasks to calculate the completion percentage
    const creativeTeamTasks = currentTasks.filter(task => task.team === 'creative');
    const webTeamTasks = currentTasks.filter(task => task.team === 'web');
    
    const creativeCompletedTasks = creativeTeamTasks.filter(
      task => task.status === 'approved' || task.status === 'done'
    ).length;
    const webCompletedTasks = webTeamTasks.filter(
      task => task.status === 'completed' || task.status === 'done'
    ).length;
    
    const today = new Date();
    const todayFormatted = format(today, 'yyyy-MM-dd');
    
    const creativeOverdue = creativeTeamTasks.filter(
      task => task.dueDate < todayFormatted && 
      task.status !== 'approved' && 
      task.status !== 'done'
    ).length;
    
    const webOverdue = webTeamTasks.filter(
      task => task.dueDate < todayFormatted && 
      task.status !== 'completed' && 
      task.status !== 'done'
    ).length;
    
    // Calculate completion percentages 
    const creativeCompletion = creativeTeamTasks.length > 0 
      ? Math.round((creativeCompletedTasks / creativeTeamTasks.length) * 100)
      : 0;
      
    const webCompletion = webTeamTasks.length > 0
      ? Math.round((webCompletedTasks / webTeamTasks.length) * 100)
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

  return (
    <DataContext.Provider
      value={{
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
        addClient,
        updateClient,
        deleteClient,
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
        getTaskById
      }}
    >
      {children}
    </DataContext.Provider>
  );
};