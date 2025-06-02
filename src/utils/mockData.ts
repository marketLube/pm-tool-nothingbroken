import { Client, Report, Task, Team, TeamType, User } from '../types';
import { addDays, format, subDays } from 'date-fns';
import { getIndiaDateTime, getIndiaDate } from './timezone';

// Debug function to check all tasks have valid status IDs
const debugCheckTaskStatuses = () => {
  // Valid status IDs for each team
  const creativeStatuses = [
    'not_started', 'scripting', 'script_confirmed', 'shoot_pending',
    'shoot_finished', 'edit_pending', 'client_approval', 'approved',
    'in_progress', 'done' // Legacy statuses
  ];
  
  const webStatuses = [
    'proposal_awaiting', 'not_started', 'ui_started', 'ui_finished',
    'development_started', 'development_finished', 'testing',
    'handed_over', 'client_reviewing', 'completed',
    'in_progress', 'done' // Legacy statuses
  ];
  
  // Check each task in the exported tasks array
  let allValid = true;
  
  console.log('Validating mock task statuses...');
  
  tasks.forEach(task => {
    const validStatuses = task.team === 'creative' ? creativeStatuses : webStatuses;
    const isValid = validStatuses.includes(task.status);
    
    if (!isValid) {
      console.error(`❌ Task ${task.id} has invalid status "${task.status}" for team "${task.team}"`);
      allValid = false;
    }
  });
  
  if (allValid) {
    console.log('✅ All mock tasks have valid status IDs');
  }
};

// Call debug function in development - using a simplified approach without process.env
// This will run in all environments but won't cause errors
setTimeout(debugCheckTaskStatuses, 1000);

// Generate dates relative to current date
const today = getIndiaDateTime();
const yesterday = subDays(today, 1);
const tomorrow = addDays(today, 1);
const nextWeek = addDays(today, 7);

// Format to ISO string for consistency
const formatDate = (date: Date) => format(date, 'yyyy-MM-dd');

export const teams: Team[] = [
  {
    id: 'creative',
    name: 'Creative Team',
    managerId: 'user2',
    description: 'Handles all design and creative aspects of projects',
    memberCount: 4
  },
  {
    id: 'web',
    name: 'Web Team',
    managerId: '',
    description: 'Develops and maintains web applications',
    memberCount: 0
  }
];

export const users: User[] = [
  {
    id: 'user1',
    name: 'Althameem',
    email: 'althameem@marketlube.in',
    role: 'admin',
    team: 'creative', // Admin belongs to both teams in the UI, but primary is creative
    joinDate: '2023-01-01',
    avatar: '', // Removed avatar to test alphabet-styled default
    isActive: true,
    password: 'admin123'
  },
  {
    id: 'user8',
    name: 'Fidal',
    email: 'fidal@marketlube.com',
    role: 'admin',
    team: 'web', // Admin belongs to both teams in the UI, but primary is web
    joinDate: '2023-01-15',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Fidal&backgroundColor=green',
    isActive: true
  },
  {
    id: 'user2',
    name: 'Sarah Johnson',
    email: 'sarah@marketlube.com',
    role: 'manager',
    team: 'creative',
    joinDate: '2023-02-15',
    avatar: '', // Removed avatar to test alphabet-styled default
    isActive: true
  },
  {
    id: 'user3',
    name: 'Michael Chen',
    email: 'michael@marketlube.com',
    role: 'manager',
    team: 'web',
    joinDate: '2023-03-10',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael&backgroundColor=yellow',
    isActive: true
  },
  {
    id: 'user4',
    name: 'Emily Rodriguez',
    email: 'emily@marketlube.com',
    role: 'employee',
    team: 'creative',
    joinDate: '2023-04-05',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily&backgroundColor=red',
    isActive: true
  },
  {
    id: 'user5',
    name: 'David Kim',
    email: 'david@marketlube.com',
    role: 'employee',
    team: 'web',
    joinDate: '2023-05-20',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David&backgroundColor=indigo',
    isActive: true
  },
  {
    id: 'user6',
    name: 'Olivia Patel',
    email: 'olivia@marketlube.com',
    role: 'employee',
    team: 'creative',
    joinDate: '2023-06-12',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Olivia&backgroundColor=pink',
    isActive: true
  },
  {
    id: 'user7',
    name: 'James Wilson',
    email: 'james@marketlube.com',
    role: 'employee',
    team: 'web',
    joinDate: '2023-07-03',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=James&backgroundColor=teal',
    isActive: false
  }
];

export const clients: Client[] = [];

export const tasks: Task[] = [];

export const reports: Report[] = [];

// Generate analytics data for each team
export const analytics = {
  creative: {
    taskCompletion: 65,
    reportSubmission: 90,
    overdueTasksCount: 1
  },
  web: {
    taskCompletion: 78,
    reportSubmission: 75,
    overdueTasksCount: 2
  }
};

// Helper function to get a user by ID
export const getUserById = (userId: string): User | undefined => {
  return users.find(user => user.id === userId);
};

// Helper function to get a client by ID
export const getClientById = (clientId: string): Client | undefined => {
  return clients.find(client => client.id === clientId);
};

// Helper function to get tasks for a specific team
export const getTasksByTeam = (teamId: TeamType): Task[] => {
  return tasks.filter(task => task.team === teamId);
};

// Helper function to get users for a specific team
export const getUsersByTeam = (teamId: TeamType): User[] => {
  return users.filter(user => user.team === teamId || user.role === 'admin');
};

// Helper function to get tasks for a specific user
export const getTasksByUser = (userId: string): Task[] => {
  return tasks.filter(task => task.assigneeId === userId);
};

// Helper function to get reports for a specific user
export const getReportsByUser = (userId: string): Report[] => {
  return reports.filter(report => report.userId === userId);
};

// Helper function to get reports for a specific date
export const getReportsByDate = (date: string): Report[] => {
  return reports.filter(report => report.date === date);
};