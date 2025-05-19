export type Status = 
  // Creative team statuses
  | 'not_started' 
  | 'scripting' 
  | 'script_confirmed' 
  | 'shoot_pending' 
  | 'shoot_finished' 
  | 'edit_pending' 
  | 'client_approval' 
  | 'approved' 
  // Web team statuses (new)
  | 'proposal_awaiting'
  | 'ui_started'
  | 'ui_finished'
  | 'development_started'
  | 'development_finished'
  | 'testing'
  | 'handed_over'
  | 'client_reviewing'
  | 'completed'
  // Legacy web team statuses (keeping for backward compatibility)
  | 'in_progress' 
  | 'done';
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
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  assigneeId: string;
  clientId: string;
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