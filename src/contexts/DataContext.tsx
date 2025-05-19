import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Client, Report, Task, Team, TeamType, User } from '../types';
import { 
  clients as initialClients,
  tasks as initialTasks,
  teams as initialTeams,
  users as initialUsers,
  reports as initialReports,
  analytics as initialAnalytics
} from '../utils/mockData';
import { format } from 'date-fns';

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

  // User actions
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (user: User) => void;
  toggleUserStatus: (userId: string) => void;

  // Task actions
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  updateTask: (task: Task) => void;
  updateTaskStatus: (taskId: string, status: Task['status']) => void;
  deleteTask: (taskId: string) => void;

  // Client actions
  addClient: (client: Omit<Client, 'id' | 'dateAdded'>) => void;
  updateClient: (client: Client) => void;
  deleteClient: (clientId: string) => void;

  // Report actions
  addReport: (report: Omit<Report, 'id'>) => void;
  updateReport: (report: Report) => void;
  approveReport: (reportId: string, approved: boolean, feedback?: string) => void;
  submitReport: (userId: string, reportData: Omit<Report, 'id' | 'userId' | 'submitted' | 'approved'>) => void;

  // Team actions
  updateTeam: (team: Team) => void;

  // Helper methods
  getTasksByUser: (userId: string) => Task[];
  getTasksByTeam: (teamId: TeamType) => Task[];
  getUsersByTeam: (teamId: TeamType) => User[];
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
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [analytics, setAnalytics] = useState(initialAnalytics);

  // User actions
  const addUser = (user: Omit<User, 'id'>) => {
    const newUser: User = {
      ...user,
      id: `user${users.length + 1}`,
    };
    setUsers([...users, newUser]);
    
    // Update team member count
    updateTeamMemberCount(user.team, 1);
  };

  const updateUser = (updatedUser: User) => {
    const oldUser = users.find(u => u.id === updatedUser.id);
    
    setUsers(users.map(user => 
      user.id === updatedUser.id ? updatedUser : user
    ));
    
    // Update team member count if team changed
    if (oldUser && oldUser.team !== updatedUser.team) {
      updateTeamMemberCount(oldUser.team, -1);
      updateTeamMemberCount(updatedUser.team, 1);
    }
  };

  const toggleUserStatus = (userId: string) => {
    setUsers(users.map(user => 
      user.id === userId ? {...user, isActive: !user.isActive} : user
    ));
  };

  // Task actions
  const addTask = (task: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask: Task = {
      ...task,
      id: `task${tasks.length + 1}`,
      createdAt: format(new Date(), 'yyyy-MM-dd'),
    };
    setTasks([...tasks, newTask]);
    
    // Update analytics
    updateTaskAnalytics();
  };

  const updateTask = (updatedTask: Task) => {
    setTasks(tasks.map(task => 
      task.id === updatedTask.id ? updatedTask : task
    ));
    
    // Update analytics
    updateTaskAnalytics();
  };

  const updateTaskStatus = (taskId: string, status: Task['status']) => {
    // Find the task to update
    const taskToUpdate = tasks.find(task => task.id === taskId);
    
    if (taskToUpdate) {
      console.log(`Updating task ${taskId} status from ${taskToUpdate.status} to ${status}`);
      
      try {
        // Validate that the status is a valid string (should match one of the Status union types)
        if (typeof status === 'string') {
          // Check if the status is valid for the task's team
          const isValidStatusForTeam = (status: string, team: TeamType): boolean => {
            // This validation ensures the status matches the team
            // Creative team statuses
            const creativeStatuses = [
              'not_started', 'scripting', 'script_confirmed', 'shoot_pending',
              'shoot_finished', 'edit_pending', 'client_approval', 'approved'
            ];
            
            // Web team statuses
            const webStatuses = [
              'proposal_awaiting', 'not_started', 'ui_started', 'ui_finished',
              'development_started', 'development_finished', 'testing',
              'handed_over', 'client_reviewing', 'completed', 'in_progress', 'done'
            ];
            
            // Common statuses (legacy support)
            const commonStatuses = ['in_progress', 'done'];
            
            let isValid = false;
            
            if (team === 'creative') {
              // For creative team, allow creative-specific statuses + common statuses
              isValid = creativeStatuses.includes(status) || commonStatuses.includes(status);
            } else if (team === 'web') {
              // For web team, allow web-specific statuses + common statuses
              isValid = webStatuses.includes(status) || commonStatuses.includes(status);
            }
            
            console.log(`Validating status "${status}" for team "${team}": ${isValid ? 'VALID' : 'INVALID'}`);
            return isValid;
          };
          
          // Ensure the status is valid for the task's team
          if (isValidStatusForTeam(status, taskToUpdate.team)) {
            // Create a new array with the updated task
            const updatedTasks = tasks.map(task => 
              task.id === taskId 
                ? { ...task, status } 
                : task
            );
            
            // Update state with the new array
            setTasks(updatedTasks);
            
            // Update analytics
            updateTaskAnalytics();
            
            console.log(`Successfully updated task ${taskId} to status: ${status}`);
          } else {
            console.error(`Status "${status}" is not valid for ${taskToUpdate.team} team`);
          }
        } else {
          console.error(`Invalid status type: ${typeof status}`, status);
        }
      } catch (error) {
        console.error(`Error updating task status: ${error}`);
      }
    } else {
      console.error(`Task with ID ${taskId} not found`);
    }
  };

  const deleteTask = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId));
    
    // Update analytics
    updateTaskAnalytics();
  };

  // Client actions
  const addClient = (client: Omit<Client, 'id' | 'dateAdded'>) => {
    const newClient: Client = {
      ...client,
      id: `client${clients.length + 1}`,
      dateAdded: format(new Date(), 'yyyy-MM-dd'),
    };
    setClients([...clients, newClient]);
  };

  const updateClient = (updatedClient: Client) => {
    setClients(clients.map(client => 
      client.id === updatedClient.id ? updatedClient : client
    ));
  };

  const deleteClient = (clientId: string) => {
    // Check if client has active tasks
    const clientHasTasks = tasks.some(task => task.clientId === clientId);
    
    if (!clientHasTasks) {
      setClients(clients.filter(client => client.id !== clientId));
    } else {
      // In a real app, we might show an error or confirmation message
      console.error("Cannot delete client with active tasks");
    }
  };

  // Report actions
  const addReport = (report: Omit<Report, 'id'>) => {
    const newReport: Report = {
      ...report,
      id: `report${reports.length + 1}`,
    };
    setReports([...reports, newReport]);
    
    // Update analytics
    updateReportAnalytics();
  };

  const updateReport = (updatedReport: Report) => {
    setReports(reports.map(report => 
      report.id === updatedReport.id ? updatedReport : report
    ));
    
    // Update analytics
    updateReportAnalytics();
  };

  const approveReport = (reportId: string, approved: boolean, feedback?: string) => {
    setReports(reports.map(report => 
      report.id === reportId 
        ? {...report, approved, feedback} 
        : report
    ));
    
    // Update analytics
    updateReportAnalytics();
  };

  const submitReport = (userId: string, reportData: Omit<Report, 'id' | 'userId' | 'submitted' | 'approved'>) => {
    const newReport: Report = {
      id: `report${reports.length + 1}`,
      userId,
      submitted: true,
      approved: null,
      ...reportData
    };
    
    setReports([...reports, newReport]);
    
    // Update analytics
    updateReportAnalytics();
  };

  // Team actions
  const updateTeam = (updatedTeam: Team) => {
    setTeams(teams.map(team => 
      team.id === updatedTeam.id ? updatedTeam : team
    ));
  };

  // Helper functions
  const updateTeamMemberCount = (teamId: TeamType, change: number) => {
    setTeams(teams.map(team => 
      team.id === teamId 
        ? {...team, memberCount: team.memberCount + change} 
        : team
    ));
  };

  const updateTaskAnalytics = () => {
    // Calculate task completion rates for each team
    const creativeTeamTasks = tasks.filter(task => task.team === 'creative');
    const webTeamTasks = tasks.filter(task => task.team === 'web');
    
    const creativeCompletionRate = creativeTeamTasks.length 
      ? (creativeTeamTasks.filter(task => task.status === 'done').length / creativeTeamTasks.length) * 100 
      : 0;
      
    const webCompletionRate = webTeamTasks.length 
      ? (webTeamTasks.filter(task => task.status === 'done').length / webTeamTasks.length) * 100 
      : 0;
    
    // Count overdue tasks
    const today = format(new Date(), 'yyyy-MM-dd');
    const creativeOverdueTasks = creativeTeamTasks.filter(
      task => task.status !== 'done' && task.dueDate < today
    ).length;
    
    const webOverdueTasks = webTeamTasks.filter(
      task => task.status !== 'done' && task.dueDate < today
    ).length;
    
    setAnalytics(prev => ({
      creative: {
        ...prev.creative,
        taskCompletion: Math.round(creativeCompletionRate),
        overdueTasksCount: creativeOverdueTasks
      },
      web: {
        ...prev.web,
        taskCompletion: Math.round(webCompletionRate),
        overdueTasksCount: webOverdueTasks
      }
    }));
  };

  const updateReportAnalytics = () => {
    // Calculate report submission rates for each team
    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
    
    const creativeMemberIds = users
      .filter(user => user.team === 'creative' && user.role !== 'admin')
      .map(user => user.id);
      
    const webMemberIds = users
      .filter(user => user.team === 'web' && user.role !== 'admin')
      .map(user => user.id);
    
    const creativeReports = reports.filter(
      report => creativeMemberIds.includes(report.userId) && 
      (report.date === today || report.date === yesterday)
    );
    
    const webReports = reports.filter(
      report => webMemberIds.includes(report.userId) && 
      (report.date === today || report.date === yesterday)
    );
    
    const creativeSubmissionRate = creativeMemberIds.length 
      ? (creativeReports.filter(report => report.submitted).length / creativeMemberIds.length) * 100 
      : 0;
      
    const webSubmissionRate = webMemberIds.length 
      ? (webReports.filter(report => report.submitted).length / webMemberIds.length) * 100 
      : 0;
    
    setAnalytics(prev => ({
      creative: {
        ...prev.creative,
        reportSubmission: Math.round(creativeSubmissionRate)
      },
      web: {
        ...prev.web,
        reportSubmission: Math.round(webSubmissionRate)
      }
    }));
  };

  // Helper methods for querying data
  const getTasksByUser = (userId: string) => {
    return tasks.filter(task => task.assigneeId === userId);
  };

  const getTasksByTeam = (teamId: TeamType) => {
    return tasks.filter(task => task.team === teamId);
  };

  const getUsersByTeam = (teamId: TeamType) => {
    return users.filter(user => user.team === teamId || user.role === 'admin');
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