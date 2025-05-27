import { Client, Report, Task, Team, TeamType, User } from '../types';
import { addDays, format, subDays } from 'date-fns';

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
const today = new Date();
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
    name: 'Coding (Web) Team',
    managerId: 'user3',
    description: 'Develops and maintains web applications',
    memberCount: 3
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
    avatar: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=150',
    isActive: true,
    password: 'Mark@99'
  },
  {
    id: 'user8',
    name: 'Fidal',
    email: 'fidal@marketlube.com',
    role: 'admin',
    team: 'web', // Admin belongs to both teams in the UI, but primary is web
    joinDate: '2023-01-15',
    avatar: 'https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg?auto=compress&cs=tinysrgb&w=150',
    isActive: true
  },
  {
    id: 'user2',
    name: 'Sarah Johnson',
    email: 'sarah@marketlube.com',
    role: 'manager',
    team: 'creative',
    joinDate: '2023-02-15',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150',
    isActive: true
  },
  {
    id: 'user3',
    name: 'Michael Chen',
    email: 'michael@marketlube.com',
    role: 'manager',
    team: 'web',
    joinDate: '2023-03-10',
    avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150',
    isActive: true
  },
  {
    id: 'user4',
    name: 'Emily Rodriguez',
    email: 'emily@marketlube.com',
    role: 'employee',
    team: 'creative',
    joinDate: '2023-04-05',
    avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150',
    isActive: true
  },
  {
    id: 'user5',
    name: 'David Kim',
    email: 'david@marketlube.com',
    role: 'employee',
    team: 'web',
    joinDate: '2023-05-20',
    avatar: 'https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=150',
    isActive: true
  },
  {
    id: 'user6',
    name: 'Olivia Patel',
    email: 'olivia@marketlube.com',
    role: 'employee',
    team: 'creative',
    joinDate: '2023-06-12',
    avatar: 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=150',
    isActive: true
  },
  {
    id: 'user7',
    name: 'James Wilson',
    email: 'james@marketlube.com',
    role: 'employee',
    team: 'web',
    joinDate: '2023-07-03',
    avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150',
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