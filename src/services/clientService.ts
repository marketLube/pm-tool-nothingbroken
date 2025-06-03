import { supabase } from '../utils/supabase';
import { Client, TeamType } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { getIndiaDateTime, getIndiaDate } from '../utils/timezone';

// Map from App Client to Supabase DB schema
const mapToDbClient = (client: Omit<Client, 'id' | 'dateAdded'>) => {
  const dbClient: any = {
    name: client.name || '',
    industry: client.industry || '',
    contact_person: client.contactPerson || '',
    email: client.email || '',
    phone: client.phone || ''
  };
  
  // Only add team field if it's supported
  if (client.team) {
    dbClient.team = client.team;
  }
  
  return dbClient;
};

// Map from Supabase DB schema to App Client
const mapFromDbClient = (dbClient: any): Client => {
  return {
    id: dbClient.id,
    name: dbClient.name,
    industry: dbClient.industry || '',
    contactPerson: dbClient.contact_person || '',
    email: dbClient.email || '',
    phone: dbClient.phone || '',
    dateAdded: dbClient.date_added,
    team: dbClient.team || 'creative'
  };
};

// Get all clients
export const getClients = async (): Promise<Client[]> => {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { data, error } = await supabase
    .from('clients')
    .select('*');
  
  if (error) {
    console.error('Error fetching clients:', error);
    throw error;
  }
  
  return data.map(mapFromDbClient);
};

// Get clients by team
export const getClientsByTeam = async (team: string): Promise<Client[]> => {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  // First try to get clients with team filter
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('team', team);
  
  if (error && error.code === '42703') {
    // Team column doesn't exist, return all clients and filter in memory
    console.log(`[ClientService] Team column doesn't exist, fetching all clients and filtering locally`);
    const allClients = await getClients();
    return allClients.filter(client => client.team === team);
  } else if (error) {
    console.error(`Error fetching clients for team ${team}:`, error);
    throw error;
  }
  
  return data.map(mapFromDbClient);
};

// Get client by ID
export const getClientById = async (id: string): Promise<Client | null> => {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error(`Error fetching client ${id}:`, error);
    return null;
  }
  
  return mapFromDbClient(data);
};

// Create a new client
export const createClient = async (client: Omit<Client, 'id' | 'dateAdded'>): Promise<Client> => {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const id = uuidv4();
  const dateAdded = getIndiaDate(); // YYYY-MM-DD format
  
  console.log('Creating client with data:', {
    id,
    ...client,
    dateAdded
  });
  
  const clientData = {
    id,
    ...mapToDbClient(client),
    date_added: dateAdded,
    created_at: getIndiaDateTime().toISOString()
  };
  
  console.log('Raw insert data for Supabase:', clientData);
  
  try {
    const { data, error } = await supabase
      .from('clients')
      .insert([clientData])
      .select()
      .single();
    
    if (error) {
      console.error('Supabase error creating client:', error);
      console.error('Error details:', error.details, error.hint, error.message);
      throw error;
    }
    
    if (!data) {
      console.error('No data returned after client creation');
      throw new Error('Failed to create client: No data returned');
    }
    
    console.log('Client created successfully:', data);
    return mapFromDbClient(data);
  } catch (err) {
    console.error('Exception during client creation:', err);
    throw err;
  }
};

// Update a client
export const updateClient = async (client: Client): Promise<Client> => {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { data, error } = await supabase
    .from('clients')
    .update({
      name: client.name,
      industry: client.industry,
      contact_person: client.contactPerson,
      email: client.email,
      phone: client.phone,
      team: client.team
    })
    .eq('id', client.id)
    .select()
    .single();
  
  if (error) {
    console.error(`Error updating client ${client.id}:`, error);
    throw error;
  }
  
  return mapFromDbClient(data);
};

// Delete a client
export const deleteClient = async (clientId: string): Promise<void> => {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  console.log(`[ClientService] Starting deletion check for client: ${clientId}`);
  
  // First, get client details
  const { data: clientData, error: clientError } = await supabase
    .from('clients')
    .select('name, team')
    .eq('id', clientId)
    .single();
  
  if (clientError) {
    console.error(`[ClientService] Error fetching client ${clientId}:`, clientError);
    
    // If client doesn't exist (404), it might already be deleted
    if (clientError.code === 'PGRST116') {
      console.log(`[ClientService] Client ${clientId} not found in database - it may already be deleted`);
      return; // Exit gracefully
    }
    
    throw clientError;
  }
  
  if (!clientData) {
    console.log(`[ClientService] Client ${clientId} not found in database`);
    return; // Exit gracefully
  }
  
  console.log(`[ClientService] Found client: ${clientData.name} (team: ${clientData.team})`);
  
  // Check if client has related tasks
  console.log(`[ClientService] Checking for tasks assigned to client ${clientId}`);
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id, title')
    .eq('client_id', clientId);
  
  if (tasksError) {
    console.error(`[ClientService] Error checking tasks for client ${clientId}:`, tasksError);
    throw tasksError;
  }
  
  console.log(`[ClientService] Found ${tasks?.length || 0} tasks assigned to client ${clientId}`);
  
  // If client has tasks, prevent deletion
  if (tasks && tasks.length > 0) {
    const errorMessage = `Cannot delete client "${clientData.name}". There are ${tasks.length} active task${tasks.length > 1 ? 's' : ''} assigned to this client. Please reassign or complete these tasks before deleting the client.`;
    console.log(`[ClientService] ${errorMessage}`);
    throw new Error(errorMessage);
  }
  
  // Delete the client (only if no tasks are assigned)
  console.log(`[ClientService] Deleting client ${clientId} from database`);
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', clientId);
  
  if (error) {
    console.error(`[ClientService] Error deleting client ${clientId}:`, error);
    throw error;
  }
  
  console.log(`[ClientService] Successfully deleted client ${clientId} from database`);
};

export const addClient = async (clientData: Omit<Client, 'id' | 'dateAdded'>): Promise<Client | null> => {
  try {
    const dateAdded = getIndiaDate(); // YYYY-MM-DD format
    
    const newClient: Client = {
      id: crypto.randomUUID(),
      ...clientData,
      dateAdded
    };

    return await createClient(newClient);
  } catch (error) {
    console.error('Error adding client:', error);
    return null;
  }
};

export const createClientInSupabase = async (clientData: {
  name: string;
  team?: 'creative' | 'web';
}): Promise<Client | null> => {
  try {
    const clientToCreate: Omit<Client, 'id' | 'dateAdded'> = {
      name: clientData.name,
      industry: '',
      contactPerson: '',
      email: '',
      phone: '',
      team: clientData.team || 'creative'
    };

    return await createClient(clientToCreate);
  } catch (error) {
    console.error('Error creating client in Supabase:', error);
    return null;
  }
};

// Database-level client filtering interface
export interface ClientSearchFilters {
  team?: TeamType;
  searchQuery?: string;
  sortBy?: 'name' | 'dateAdded' | 'none';
}

// Get filtered clients with database-level filtering
export const searchClients = async (filters: ClientSearchFilters): Promise<Client[]> => {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  let query = supabase
    .from('clients')
    .select('*');

  // Apply team filter
  if (filters.team) {
    query = query.eq('team', filters.team);
  }

  // Apply search query (removed industry from search)
  if (filters.searchQuery && filters.searchQuery.trim()) {
    const searchTerm = filters.searchQuery.trim();
    query = query.or(`name.ilike.%${searchTerm}%,contact_person.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
  }

  // Apply sorting
  if (filters.sortBy && filters.sortBy !== 'none') {
    switch (filters.sortBy) {
      case 'name':
        query = query.order('name', { ascending: true });
        break;
      case 'dateAdded':
        query = query.order('date_added', { ascending: false }); // Newest first
        break;
    }
  } else {
    // Default sorting by name
    query = query.order('name', { ascending: true });
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error searching clients:', error);
    throw error;
  }

  return data.map(mapFromDbClient);
};

// Get clients by team with database filtering
export const getFilteredClientsByTeam = async (
  teamId: TeamType,
  searchQuery?: string,
  sortBy?: 'name' | 'dateAdded' | 'none'
): Promise<Client[]> => {
  return searchClients({
    team: teamId,
    searchQuery,
    sortBy
  });
}; 