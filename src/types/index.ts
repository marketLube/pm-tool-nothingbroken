export type StatusCode = 
  // Creative team statuses
  | 'creative_not_started' 
  | 'creative_scripting' 
  | 'creative_script_confirmed' 
  | 'creative_shoot_pending' 
  | 'creative_shoot_finished' 
  | 'creative_edit_pending' 
  | 'creative_client_approval' 
  | 'creative_approved' 
  // Web team statuses
  | 'web_proposal_awaiting'
  | 'web_not_started'
  | 'web_ui_started'
  | 'web_ui_finished'
  | 'web_development_started'
  | 'web_development_finished'
  | 'web_testing'
  | 'web_handed_over'
  | 'web_client_reviewing'
  | 'web_completed'
  // Legacy statuses (keeping for backward compatibility)
  | 'not_started' 
  | 'scripting' 
  | 'script_confirmed' 
  | 'shoot_pending' 
  | 'shoot_finished' 
  | 'edit_pending' 
  | 'client_approval' 
  | 'approved' 
  | 'proposal_awaiting'
  | 'ui_started'
  | 'ui_finished'
  | 'development_started'
  | 'development_finished'
  | 'testing'
  | 'handed_over'
  | 'client_reviewing'
  | 'completed'
  | 'in_progress' 
  | 'done';

export interface Status {
  id: StatusCode;
  name: string;
  team: TeamType;
  color: string;
  order: number;
}

// Legacy compatibility type for places where we're still using status as a string
export type StatusString = StatusCode;

export type Priority = 'low' | 'medium' | 'high';
export type TeamType = 'creative' | 'web';
export type Role = 'admin' | 'manager' | 'employee';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  team: TeamType;
  joinDate: string;
  avatar?: string;
  isActive: boolean;
  allowedStatuses?: string[]; // Array of status IDs the user has permission to use
  password?: string; // Password for the user (only used for login)
}

export interface Team {
  id: TeamType;
  name: string;
  managerId: string;
  description: string;
  memberCount: number;
}

export interface Client {
  id: string;
  name: string;
  industry: string;
  contactPerson: string;
  email: string;
  phone: string;
  dateAdded: string;
  team: TeamType;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: StatusCode;
  priority: Priority;
  assigneeId?: string;
  clientId?: string;
  team: TeamType;
  dueDate: string;
  createdAt: string;
  createdBy: string;
}

export interface Report {
  id: string;
  userId: string;
  date: string;
  submitted: boolean;
  approved: boolean | null;
  feedback?: string;
  tasks: {
    taskId: string;
    hours: number;
    notes: string;
  }[];
  totalHours: number;
}

export interface Analytics {
  taskCompletion: number;
  reportSubmission: number;
  overdueTasksCount: number;
}

// Enhanced types for the new Report & Analytics module
export interface DailyWorkEntry {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD format
  checkInTime?: string; // HH:MM format
  checkOutTime?: string; // HH:MM format
  isAbsent: boolean;
  assignedTasks: string[]; // Array of task IDs
  completedTasks: string[]; // Array of task IDs
  createdAt: string;
  updatedAt: string;
}

export interface TaskCompletion {
  id: string;
  taskId: string;
  userId: string;
  completedAt: string;
  notes?: string;
}

export interface DailyReport {
  id: string;
  userId: string;
  date: string;
  workEntry: DailyWorkEntry;
  tasks: {
    assigned: Task[];
    completed: Task[];
  };
  totalHours?: number;
  productivity?: number;
}

export interface WeeklyAnalytics {
  userId: string;
  userName: string;
  team: TeamType;
  weekStart: string;
  weekEnd: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  totalTasksAssigned: number;
  totalTasksCompleted: number;
  completionRate: number;
  averageHoursPerDay: number;
  dailyReports: DailyReport[];
}

export interface TeamAnalyticsData {
  teamId: TeamType;
  teamName: string;
  period: {
    start: string;
    end: string;
  };
  totalMembers: number;
  activeMembers: number;
  teamCompletionRate: number;
  totalTasksAssigned: number;
  totalTasksCompleted: number;
  memberAnalytics: WeeklyAnalytics[];
}