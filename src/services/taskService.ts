import { supabase } from '../utils/supabase';
import { Task, TeamType } from '../types';
import { v4 as uuidv4 } from 'uuid';

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
  const id = uuidv4();
  const { data, error } = await supabase
    .from('tasks')
    .insert([{
      id,
      ...mapToDbTask(task),
      created_at: new Date().toISOString()
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
  const { data, error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', taskId)
    .select()
    .single();
  
  if (error) {
    console.error(`Error updating status for task ${taskId}:`, error);
    throw error;
  }
  
  return mapFromDbTask(data);
};

// Delete a task
export const deleteTask = async (taskId: string): Promise<void> => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);
  
  if (error) {
    console.error(`Error deleting task ${taskId}:`, error);
    throw error;
  }
};

// Get tasks by team
export const getTasksByTeam = async (teamId: TeamType): Promise<Task[]> => {
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