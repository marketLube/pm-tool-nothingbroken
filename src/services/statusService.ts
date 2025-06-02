import { supabase } from '../utils/supabase';
import { Status, TeamType } from '../types';
import { getIndiaDateTime } from '../utils/timezone';

// Map from App Status to Supabase DB schema
const mapToDbStatus = (status: Status) => {
  return {
    id: status.id,
    name: status.name,
    team: status.team,
    color: status.color,
    order: status.order
  };
};

// Map from Supabase DB schema to App Status
const mapFromDbStatus = (dbStatus: any): Status => {
  return {
    id: dbStatus.id,
    name: dbStatus.name,
    team: dbStatus.team,
    color: dbStatus.color,
    order: dbStatus.order
  };
};

// Get all statuses
export const getStatuses = async (): Promise<Status[]> => {
  const { data, error } = await supabase
    .from('statuses')
    .select('*');
  
  if (error) {
    console.error('Error fetching statuses:', error);
    throw error;
  }
  
  return data.map(mapFromDbStatus);
};

// Get statuses by team
export const getStatusesByTeam = async (team: TeamType): Promise<Status[]> => {
  const { data, error } = await supabase
    .from('statuses')
    .select('*')
    .eq('team', team)
    .order('order', { ascending: true });
  
  if (error) {
    console.error(`Error fetching statuses for team ${team}:`, error);
    throw error;
  }
  
  return data.map(mapFromDbStatus);
};

// Add a status
export const addStatus = async (status: Status): Promise<Status> => {
  const { data, error } = await supabase
    .from('statuses')
    .insert([{
      ...mapToDbStatus(status),
      created_at: getIndiaDateTime().toISOString()
    }])
    .select()
    .single();
  
  if (error) {
    console.error('Error adding status:', error);
    throw error;
  }
  
  return mapFromDbStatus(data);
};

// Update a status
export const updateStatus = async (id: string, status: Partial<Status>): Promise<Status> => {
  const { data, error } = await supabase
    .from('statuses')
    .update(mapToDbStatus(status as Status))
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error(`Error updating status ${id}:`, error);
    throw error;
  }
  
  return mapFromDbStatus(data);
};

// Delete a status
export const deleteStatus = async (id: string): Promise<void> => {
  // Check if status is being used in tasks
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id')
    .eq('status', id);
  
  if (tasksError) {
    console.error(`Error checking tasks for status ${id}:`, tasksError);
    throw tasksError;
  }
  
  // If status is being used, don't delete it
  if (tasks && tasks.length > 0) {
    throw new Error(`Cannot delete status ${id} as it is being used in ${tasks.length} tasks`);
  }
  
  const { error } = await supabase
    .from('statuses')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error(`Error deleting status ${id}:`, error);
    throw error;
  }
};

export const createStatus = async (status: Omit<Status, 'id' | 'createdAt'>): Promise<Status> => {
  const id = crypto.randomUUID();
  
  const newStatus: Status = {
    ...status,
    id,
    createdAt: getIndiaDateTime().toISOString()
  };

  const { data, error } = await supabase
    .from('statuses')
    .insert([{
      ...mapToDbStatus(newStatus),
      created_at: newStatus.createdAt
    }])
    .select()
    .single();
  
  if (error) {
    console.error('Error adding status:', error);
    throw error;
  }
  
  return mapFromDbStatus(data);
}; 