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
    name: 'Admin User',
    email: 'admin@marketlube.com',
    role: 'admin',
    team: 'creative', // Admin belongs to both teams, but primary is creative
    joinDate: '2023-01-01',
    avatar: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=150',
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

export const clients: Client[] = [
  {
    id: 'client1',
    name: 'TechNova Solutions',
    industry: 'Technology',
    contactPerson: 'Alex Brown',
    email: 'alex@technova.com',
    phone: '555-123-4567',
    dateAdded: '2023-02-01'
  },
  {
    id: 'client2',
    name: 'GreenLeaf Organics',
    industry: 'Food & Beverage',
    contactPerson: 'Jessica Lee',
    email: 'jessica@greenleaf.com',
    phone: '555-234-5678',
    dateAdded: '2023-03-15'
  },
  {
    id: 'client3',
    name: 'Summit Financial',
    industry: 'Finance',
    contactPerson: 'Robert Taylor',
    email: 'robert@summit.com',
    phone: '555-345-6789',
    dateAdded: '2023-04-10'
  },
  {
    id: 'client4',
    name: 'Velocity Fitness',
    industry: 'Health & Wellness',
    contactPerson: 'Samantha Clark',
    email: 'samantha@velocity.com',
    phone: '555-456-7890',
    dateAdded: '2023-05-22'
  }
];

export const tasks: Task[] = [
  {
    id: 'task1',
    title: 'Website redesign for TechNova',
    description: 'Completely overhaul the TechNova Solutions website with new branding elements',
    status: 'in_progress',
    priority: 'high',
    assigneeId: 'user4',
    clientId: 'client1',
    team: 'creative',
    dueDate: formatDate(tomorrow),
    createdAt: formatDate(subDays(today, 5)),
    createdBy: 'user2'
  },
  {
    id: 'task2',
    title: 'Develop e-commerce platform for GreenLeaf',
    description: 'Create an online store for GreenLeaf Organics products with payment integration',
    status: 'proposal_awaiting',
    priority: 'high',
    assigneeId: 'user5',
    clientId: 'client2',
    team: 'web',
    dueDate: formatDate(nextWeek),
    createdAt: formatDate(yesterday),
    createdBy: 'user3'
  },
  {
    id: 'task3',
    title: 'Social media campaign for Summit',
    description: 'Design a series of social media posts highlighting Summit Financial services',
    status: 'scripting',
    priority: 'medium',
    assigneeId: 'user6',
    clientId: 'client3',
    team: 'creative',
    dueDate: formatDate(addDays(today, 3)),
    createdAt: formatDate(yesterday),
    createdBy: 'user2'
  },
  {
    id: 'task4',
    title: 'Bug fixes for Velocity app',
    description: 'Address reported bugs in the Velocity Fitness mobile application',
    status: 'testing',
    priority: 'high',
    assigneeId: 'user7',
    clientId: 'client4',
    team: 'web',
    dueDate: formatDate(tomorrow),
    createdAt: formatDate(subDays(today, 2)),
    createdBy: 'user3'
  },
  {
    id: 'task5',
    title: 'Logo redesign for GreenLeaf',
    description: 'Create new logo concepts for GreenLeaf brand refresh',
    status: 'approved',
    priority: 'medium',
    assigneeId: 'user4',
    clientId: 'client2',
    team: 'creative',
    dueDate: formatDate(yesterday),
    createdAt: formatDate(subDays(today, 7)),
    createdBy: 'user2'
  },
  {
    id: 'task6',
    title: 'API integration for Summit dashboard',
    description: 'Integrate third-party financial data APIs into Summit client dashboard',
    status: 'completed',
    priority: 'medium',
    assigneeId: 'user5',
    clientId: 'client3',
    team: 'web',
    dueDate: formatDate(subDays(today, 1)),
    createdAt: formatDate(subDays(today, 6)),
    createdBy: 'user3'
  },
  {
    id: 'task7',
    title: 'Marketing brochure for TechNova',
    description: 'Design a digital and print-ready brochure showcasing TechNova products',
    status: 'client_approval',
    priority: 'low',
    assigneeId: 'user6',
    clientId: 'client1',
    team: 'creative',
    dueDate: formatDate(addDays(today, 4)),
    createdAt: formatDate(subDays(today, 3)),
    createdBy: 'user2'
  },
  {
    id: 'task8',
    title: 'Performance optimization for Velocity website',
    description: 'Improve loading times and overall performance of the Velocity Fitness website',
    status: 'not_started',
    priority: 'low',
    assigneeId: 'user7',
    clientId: 'client4',
    team: 'web',
    dueDate: formatDate(addDays(today, 5)),
    createdAt: formatDate(yesterday),
    createdBy: 'user3'
  },
  {
    id: 'task9',
    title: 'Product photoshoot for GreenLeaf',
    description: 'Coordinate and execute product photoshoot for new GreenLeaf product line',
    status: 'script_confirmed',
    priority: 'high',
    assigneeId: 'user4',
    clientId: 'client2',
    team: 'creative',
    dueDate: formatDate(addDays(today, 6)),
    createdAt: formatDate(subDays(today, 4)),
    createdBy: 'user2'
  },
  {
    id: 'task10',
    title: 'TV Commercial for Summit Financial',
    description: 'Produce a 30-second TV commercial highlighting Summit\'s financial services',
    status: 'shoot_pending',
    priority: 'high',
    assigneeId: 'user6',
    clientId: 'client3',
    team: 'creative',
    dueDate: formatDate(addDays(today, 10)),
    createdAt: formatDate(subDays(today, 3)),
    createdBy: 'user2'
  },
  {
    id: 'task11',
    title: 'Promotional video for Velocity Fitness',
    description: 'Create a promotional video showcasing Velocity\'s new fitness facilities',
    status: 'shoot_finished',
    priority: 'medium',
    assigneeId: 'user4',
    clientId: 'client4',
    team: 'creative',
    dueDate: formatDate(addDays(today, 7)),
    createdAt: formatDate(subDays(today, 8)),
    createdBy: 'user2'
  },
  {
    id: 'task12',
    title: 'Annual report design for Summit',
    description: 'Design the annual report for Summit Financial with charts and infographics',
    status: 'edit_pending',
    priority: 'medium',
    assigneeId: 'user6',
    clientId: 'client3',
    team: 'creative',
    dueDate: formatDate(addDays(today, 8)),
    createdAt: formatDate(subDays(today, 5)),
    createdBy: 'user2'
  },
  {
    id: 'task13',
    title: 'TechNova dashboard UI design',
    description: 'Design user interface for TechNova client dashboard',
    status: 'ui_started',
    priority: 'high',
    assigneeId: 'user5',
    clientId: 'client1',
    team: 'web',
    dueDate: formatDate(addDays(today, 3)),
    createdAt: formatDate(subDays(today, 2)),
    createdBy: 'user3'
  },
  {
    id: 'task14',
    title: 'Summit Financial mobile app development',
    description: 'Develop mobile application for Summit Financial clients',
    status: 'development_started',
    priority: 'high',
    assigneeId: 'user7',
    clientId: 'client3',
    team: 'web',
    dueDate: formatDate(addDays(today, 10)),
    createdAt: formatDate(subDays(today, 8)),
    createdBy: 'user3'
  },
  {
    id: 'task15',
    title: 'GreenLeaf product catalog frontend',
    description: 'Build frontend components for GreenLeaf product catalog',
    status: 'ui_finished',
    priority: 'medium',
    assigneeId: 'user5',
    clientId: 'client2',
    team: 'web',
    dueDate: formatDate(addDays(today, 7)),
    createdAt: formatDate(subDays(today, 4)),
    createdBy: 'user3'
  },
  {
    id: 'task16',
    title: 'Velocity Fitness website payment integration',
    description: 'Integrate payment gateway for Velocity Fitness subscription services',
    status: 'development_finished',
    priority: 'high',
    assigneeId: 'user7',
    clientId: 'client4',
    team: 'web',
    dueDate: formatDate(addDays(today, 2)),
    createdAt: formatDate(subDays(today, 5)),
    createdBy: 'user3'
  },
  {
    id: 'task17',
    title: 'TechNova admin portal refactoring',
    description: 'Refactor the admin portal for TechNova solutions with new features',
    status: 'handed_over',
    priority: 'medium',
    assigneeId: 'user5',
    clientId: 'client1',
    team: 'web',
    dueDate: formatDate(yesterday),
    createdAt: formatDate(subDays(today, 10)),
    createdBy: 'user3'
  },
  {
    id: 'task18',
    title: 'Summit Financial analytics dashboard',
    description: 'Develop analytics dashboard for Summit Financial admin users',
    status: 'client_reviewing',
    priority: 'medium',
    assigneeId: 'user7',
    clientId: 'client3',
    team: 'web',
    dueDate: formatDate(yesterday),
    createdAt: formatDate(subDays(today, 12)),
    createdBy: 'user3'
  }
];

export const reports: Report[] = [
  {
    id: 'report1',
    userId: 'user4',
    date: formatDate(yesterday),
    submitted: true,
    approved: true,
    tasks: [
      {
        taskId: 'task1',
        hours: 6,
        notes: 'Completed wireframes and started on visual designs'
      },
      {
        taskId: 'task5',
        hours: 2,
        notes: 'Final revisions to logo and exported files'
      }
    ],
    totalHours: 8
  },
  {
    id: 'report2',
    userId: 'user5',
    date: formatDate(yesterday),
    submitted: true,
    approved: null,
    tasks: [
      {
        taskId: 'task6',
        hours: 7.5,
        notes: 'Fixed integration issues and completed testing'
      }
    ],
    totalHours: 7.5
  },
  {
    id: 'report3',
    userId: 'user6',
    date: formatDate(yesterday),
    submitted: true,
    approved: false,
    feedback: 'Please provide more details on the social media campaign tasks',
    tasks: [
      {
        taskId: 'task3',
        hours: 4,
        notes: 'Started researching and planning campaign'
      },
      {
        taskId: 'task7',
        hours: 3,
        notes: 'Collected assets and started design'
      }
    ],
    totalHours: 7
  },
  {
    id: 'report4',
    userId: 'user7',
    date: formatDate(yesterday),
    submitted: false,
    approved: null,
    tasks: [
      {
        taskId: 'task4',
        hours: 6,
        notes: 'Identified and fixed critical bugs'
      }
    ],
    totalHours: 6
  }
];

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