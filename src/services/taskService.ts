import { supabase } from '../utils/supabase';
import { Task, TeamType, StatusCode } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { getIndiaDateTime } from '../utils/timezone';

// Map from App Task to Supabase DB schema
const mapToDbTask = (task: Omit<Task, 'id' | 'createdAt'>) => {
  return {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    assignee_id: task.assigneeId,
    client_id: task.clientId,
    team: task.team,
    due_date: task.dueDate,
    created_by: task.createdBy
  };
};

// Map from Supabase DB schema to App Task
const mapFromDbTask = (dbTask: any): Task => {
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
};

// Get all tasks
export const getTasks = async (): Promise<Task[]> => {
  if (!supabase) {
    console.error('Supabase not configured');
    throw new Error('Supabase not configured');
  }
  
  const { data, error } = await supabase
    .from('tasks')
    .select('*');
  
  if (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }
  
  return data.map(mapFromDbTask);
};

// Get task by ID
export const getTaskById = async (id: string): Promise<Task | null> => {
  if (!supabase) {
    console.error('Supabase not configured');
    return null;
  }
  
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error(`Error fetching task ${id}:`, error);
    return null;
  }
  
  return mapFromDbTask(data);
};

// Create a new task
export const createTask = async (task: Omit<Task, 'id' | 'createdAt'>): Promise<Task> => {
  if (!supabase) {
    console.error('Supabase not configured');
    throw new Error('Supabase not configured');
  }
  
  const id = uuidv4();
  const { data, error } = await supabase
    .from('tasks')
    .insert([{
      id,
      ...mapToDbTask(task),
      created_at: getIndiaDateTime().toISOString()
    }])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating task:', error);
    throw error;
  }
  
  return mapFromDbTask(data);
};

// Update a task
export const updateTask = async (task: Task): Promise<Task> => {
  if (!supabase) {
    console.error('Supabase not configured');
    throw new Error('Supabase not configured');
  }
  
  const { data, error } = await supabase
    .from('tasks')
    .update({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignee_id: task.assigneeId,
      client_id: task.clientId,
      team: task.team,
      due_date: task.dueDate
    })
    .eq('id', task.id)
    .select()
    .single();
  
  if (error) {
    console.error(`Error updating task ${task.id}:`, error);
    throw error;
  }
  
  return mapFromDbTask(data);
};

// Update task status
export const updateTaskStatus = async (taskId: string, status: string): Promise<Task> => {
  console.log(`🔄 [TaskService] Starting updateTaskStatus: ${taskId} -> ${status}`);
  
  if (!supabase) {
    console.error(`❌ [TaskService] Supabase not configured`);
    throw new Error('Supabase not configured');
  }
  
  const { data, error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', taskId)
    .select()
    .single();
  
  if (error) {
    console.error(`❌ [TaskService] Error updating status for task ${taskId}:`, error);
    throw error;
  }
  
  console.log(`✅ [TaskService] Successfully updated task ${taskId} to status ${status}`);
  console.log(`📄 [TaskService] Updated task data:`, data);
  
  const mappedTask = mapFromDbTask(data);
  console.log(`🔄 [TaskService] Mapped task object:`, mappedTask);
  
  return mappedTask;
};

// Delete a task
export const deleteTask = async (id: string): Promise<void> => {
  if (!supabase) {
    console.error('Supabase not configured');
    throw new Error('Supabase not configured');
  }
  
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error(`Error deleting task ${id}:`, error);
    throw error;
  }
};

// Get tasks by team
export const getTasksByTeam = async (teamId: TeamType): Promise<Task[]> => {
  if (!supabase) {
    console.error('Supabase not configured');
    throw new Error('Supabase not configured');
  }
  
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('team', teamId);
  
  if (error) {
    console.error(`Error fetching tasks for team ${teamId}:`, error);
    throw error;
  }
  
  return data.map(mapFromDbTask);
};

// Get tasks by user
export const getTasksByUser = async (userId: string): Promise<Task[]> => {
  if (!supabase) {
    console.error('Supabase not configured');
    throw new Error('Supabase not configured');
  }
  
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('assignee_id', userId);
  
  if (error) {
    console.error(`Error fetching tasks for user ${userId}:`, error);
    throw error;
  }
  
  return data.map(mapFromDbTask);
};

// Database-level search and filter interface
export interface TaskSearchFilters {
  searchQuery?: string;
  team?: TeamType;
  assigneeId?: string; // 'unassigned' for null assignees
  clientId?: string;
  sortBy?: 'createdDate' | 'dueDate' | 'title' | 'none';
  userId?: string; // for "my tasks" view
}

// Advanced search with database-level filtering, searching, and sorting
export const searchTasks = async (filters: TaskSearchFilters): Promise<Task[]> => {
  if (!supabase) {
    console.error('Supabase not configured');
    throw new Error('Supabase not configured');
  }
  
  let query = supabase
    .from('tasks')
    .select(`
      *,
      clients:client_id(name),
      assignee:assignee_id(name)
    `);

  // Apply team filter
  if (filters.team) {
    query = query.eq('team', filters.team);
  }

  // Apply user filter for "my tasks" view
  if (filters.userId) {
    query = query.eq('assignee_id', filters.userId);
  }

  // Apply assignee filter
  if (filters.assigneeId) {
    if (filters.assigneeId === 'unassigned') {
      query = query.is('assignee_id', null);
    } else {
      query = query.eq('assignee_id', filters.assigneeId);
    }
  }

  // Apply client filter
  if (filters.clientId) {
    query = query.eq('client_id', filters.clientId);
  }

  // Handle search query with client name support
  if (filters.searchQuery && filters.searchQuery.trim()) {
    const searchTerm = filters.searchQuery.trim();
    
    // First, search for clients matching the search term
    if (!supabase) {
      console.error('Supabase not configured for client search');
      throw new Error('Supabase not configured');
    }
    
    const { data: matchingClients } = await supabase
      .from('clients')
      .select('id')
      .ilike('name', `%${searchTerm}%`);
    
    const clientIds = matchingClients?.map(client => client.id) || [];
    
    // Build the search query
    let searchConditions = [`title.ilike.%${searchTerm}%`, `description.ilike.%${searchTerm}%`];
    
    // If we found matching clients, add them to the search
    if (clientIds.length > 0) {
      const clientIdConditions = clientIds.map(id => `client_id.eq.${id}`);
      searchConditions = [...searchConditions, ...clientIdConditions];
    }
    
    // Apply the combined search conditions
    query = query.or(searchConditions.join(','));
  }

  // Apply sorting
  if (filters.sortBy && filters.sortBy !== 'none') {
    switch (filters.sortBy) {
      case 'createdDate':
        query = query.order('created_at', { ascending: false }); // Newest first
        break;
      case 'dueDate':
        query = query.order('due_date', { ascending: true, nullsFirst: false }); // Earliest first, nulls last
        break;
      case 'title':
        query = query.order('title', { ascending: true }); // Alphabetical
        break;
    }
  } else {
    // Default sorting by created date for consistent results
    query = query.order('created_at', { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error searching tasks:', error);
    throw error;
  }

  return data.map(mapFromDbTask);
};

// Get filtered tasks by team with optional search
export const getFilteredTasksByTeam = async (
  teamId: TeamType, 
  searchQuery?: string,
  assigneeId?: string,
  clientId?: string,
  sortBy?: 'createdDate' | 'dueDate' | 'title' | 'none'
): Promise<Task[]> => {
  return searchTasks({
    team: teamId,
    searchQuery,
    assigneeId,
    clientId,
    sortBy
  });
};

// Get filtered tasks by user with optional search
export const getFilteredTasksByUser = async (
  userId: string,
  teamId?: TeamType,
  searchQuery?: string,
  clientId?: string,
  sortBy?: 'createdDate' | 'dueDate' | 'title' | 'none'
): Promise<Task[]> => {
  return searchTasks({
    userId,
    team: teamId,
    searchQuery,
    clientId,
    sortBy
  });
};

// Demo function to create a test overdue task
export const createTestOverdueTask = async (userId: string, clientId: string): Promise<Task> => {
  if (!supabase) {
    console.error('Supabase not configured');
    throw new Error('Supabase not configured');
  }
  
  // Create a task that's overdue by setting due date to 3 days ago
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const dueDateStr = threeDaysAgo.toISOString().split('T')[0];
  
  const overdueTaskData = {
    title: 'TEST OVERDUE TASK - Demo Positioning Fix',
    description: 'This is a test task created to demonstrate the overdue label positioning. Please delete this task after testing.',
    status: 'not_started' as StatusCode,
    priority: 'high' as const,
    assigneeId: userId,
    clientId: clientId,
    team: 'creative' as const,
    dueDate: dueDateStr,
    createdBy: userId
  };
  
  return await createTask(overdueTaskData);
}; 