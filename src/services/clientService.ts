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
    industry: dbClient.industry,
    contactPerson: dbClient.contact_person,
    email: dbClient.email,
    phone: dbClient.phone,
    dateAdded: dbClient.date_added,
    team: dbClient.team || 'creative'
  };
};

// Get all clients
export const getClients = async (): Promise<Client[]> => {
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
  console.log(`[ClientService] Starting deletion of client: ${clientId}`);
  
  // First, check if the client exists and get its details
  // Try with team column first, fallback to without team column if it doesn't exist
  let clientData;
  let clientTeam = 'creative'; // Default team
  
  const { data: clientWithTeam, error: teamError } = await supabase
    .from('clients')
    .select('team, name')
    .eq('id', clientId)
    .single();
  
  if (teamError && teamError.code === '42703') {
    // Column doesn't exist, try without team
    console.log(`[ClientService] Team column doesn't exist, fetching client without team field`);
    const { data: clientWithoutTeam, error: clientError } = await supabase
      .from('clients')
      .select('name')
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
    
    clientData = clientWithoutTeam;
    console.log(`[ClientService] Found client: ${clientData.name} (using default team: ${clientTeam})`);
  } else if (teamError) {
    console.error(`[ClientService] Error fetching client ${clientId}:`, teamError);
    
    // If client doesn't exist (404), it might already be deleted
    if (teamError.code === 'PGRST116') {
      console.log(`[ClientService] Client ${clientId} not found in database - it may already be deleted`);
      return; // Exit gracefully
    }
    
    throw teamError;
  } else {
    clientData = clientWithTeam;
    clientTeam = clientData.team || 'creative';
    console.log(`[ClientService] Found client: ${clientData.name} (team: ${clientTeam})`);
  }
  
  if (!clientData) {
    console.log(`[ClientService] Client ${clientId} not found in database`);
    return; // Exit gracefully
  }
  
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
  
  console.log(`[ClientService] Found ${tasks?.length || 0} tasks assigned to client ${clientId}:`, tasks);
  
  // If client has tasks, reassign them to "Unassigned" client
  if (tasks && tasks.length > 0) {
    // Find or create "Unassigned" client for this team
    let unassignedClient;
    const { data: existingUnassigned, error: unassignedError } = await supabase
      .from('clients')
      .select('id')
      .eq('name', 'Unassigned')
      .eq('team', clientTeam)
      .single();
    
    if (unassignedError && unassignedError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking for unassigned client:', unassignedError);
      throw unassignedError;
    }
    
    if (existingUnassigned) {
      unassignedClient = existingUnassigned;
    } else {
      // Create "Unassigned" client for this team
      const unassignedClientData = {
        id: uuidv4(), // Use proper UUID instead of string
        name: 'Unassigned',
        industry: '',
        contact_person: '',
        email: '',
        phone: '',
        team: clientTeam,
        date_added: getIndiaDate(),
        created_at: getIndiaDateTime().toISOString()
      };
      
      const { data: newUnassigned, error: createError } = await supabase
        .from('clients')
        .insert([unassignedClientData])
        .select('id')
        .single();
      
      if (createError) {
        console.error('Error creating unassigned client:', createError);
        throw createError;
      }
      
      unassignedClient = newUnassigned;
    }
    
    // Reassign all tasks to the unassigned client
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ client_id: unassignedClient.id })
      .eq('client_id', clientId);
    
    if (updateError) {
      console.error(`Error reassigning tasks for client ${clientId}:`, updateError);
      throw updateError;
    }
    
    console.log(`Reassigned ${tasks.length} tasks from client ${clientId} to unassigned client`);
  }
  
  // Delete the client
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
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
}): Promise<Client | null> => {
  try {
    const clientToCreate: Omit<Client, 'id' | 'dateAdded'> = {
      name: clientData.name,
      email: clientData.email || '',
      phone: clientData.phone || '',
      industry: clientData.company || '',
      contactPerson: '',
      team: 'creative'
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
  industry?: string;
  sortBy?: 'name' | 'dateAdded' | 'none';
}

// Get filtered clients with database-level filtering
export const searchClients = async (filters: ClientSearchFilters): Promise<Client[]> => {
  let query = supabase
    .from('clients')
    .select('*');

  // Apply team filter
  if (filters.team) {
    query = query.eq('team', filters.team);
  }

  // Apply industry filter
  if (filters.industry) {
    query = query.eq('industry', filters.industry);
  }

  // Apply search query
  if (filters.searchQuery && filters.searchQuery.trim()) {
    const searchTerm = filters.searchQuery.trim();
    query = query.or(`name.ilike.%${searchTerm}%,industry.ilike.%${searchTerm}%,contact_person.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
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
  industry?: string,
  sortBy?: 'name' | 'dateAdded' | 'none'
): Promise<Client[]> => {
  return searchClients({
    team: teamId,
    searchQuery,
    industry,
    sortBy
  });
}; 