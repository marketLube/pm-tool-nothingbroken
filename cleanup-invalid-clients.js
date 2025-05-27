import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Use the same credentials as in the app
const supabaseUrl = 'https://ysfknpujqivkudhnhezx.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzZmtucHVqcWl2a3VkaG5oZXp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzU5NjExMywiZXhwIjoyMDYzMTcyMTEzfQ.7q0ONGSxRUvWJS_Vo3DcXnoZt6DSpBqsZhcnX9JTARI';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function cleanupInvalidClients() {
  console.log('Cleaning up invalid client entries...');
  
  try {
    // First, let's see all clients to understand what we have
    const { data: allClients, error: allError } = await supabase
      .from('clients')
      .select('*');
    
    if (allError) {
      console.error('Error fetching all clients:', allError);
      return;
    }
    
    console.log('All clients in database:');
    allClients.forEach(client => {
      console.log(`- ${client.name} (${client.team}) - ID: ${client.id}`);
    });
    
    // Check for tasks that might be pointing to invalid client IDs
    const { data: allTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, client_id');
    
    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      return;
    }
    
    console.log('\nTasks and their client assignments:');
    allTasks.forEach(task => {
      console.log(`- Task: ${task.title} -> Client ID: ${task.client_id}`);
    });
    
    // Find tasks with potentially invalid client IDs
    const invalidClientIds = ['unassigned-creative', 'unassigned-web'];
    const tasksWithInvalidClients = allTasks.filter(task => 
      invalidClientIds.includes(task.client_id)
    );
    
    console.log(`\nFound ${tasksWithInvalidClients.length} tasks with invalid client IDs:`, tasksWithInvalidClients);
    
    // For each team, ensure we have a proper "Unassigned" client
    const teams = ['creative', 'web'];
    
    for (const team of teams) {
      console.log(`\nProcessing ${team} team...`);
      
      // Check if we already have a valid "Unassigned" client for this team
      const validUnassigned = allClients.find(client => 
        client.name === 'Unassigned' && 
        client.team === team &&
        client.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
      );
      
      let unassignedClientId;
      
      if (validUnassigned) {
        console.log(`Found valid unassigned client for ${team}: ${validUnassigned.id}`);
        unassignedClientId = validUnassigned.id;
      } else {
        // Create a new unassigned client with proper UUID
        unassignedClientId = uuidv4();
        const newUnassignedData = {
          id: unassignedClientId,
          name: 'Unassigned',
          industry: '',
          contact_person: '',
          email: '',
          phone: '',
          team: team,
          date_added: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString()
        };
        
        const { error: createError } = await supabase
          .from('clients')
          .insert([newUnassignedData]);
        
        if (createError) {
          console.error(`Error creating unassigned client for ${team}:`, createError);
          continue;
        }
        
        console.log(`Created new unassigned client for ${team}: ${unassignedClientId}`);
      }
      
      // Update any tasks that were pointing to the invalid client ID
      const invalidClientId = `unassigned-${team}`;
      const tasksToUpdate = tasksWithInvalidClients.filter(task => 
        task.client_id === invalidClientId
      );
      
      if (tasksToUpdate.length > 0) {
        console.log(`Updating ${tasksToUpdate.length} tasks to point to valid unassigned client...`);
        
        for (const task of tasksToUpdate) {
          const { error: updateError } = await supabase
            .from('tasks')
            .update({ client_id: unassignedClientId })
            .eq('id', task.id);
          
          if (updateError) {
            console.error(`Error updating task ${task.id}:`, updateError);
          } else {
            console.log(`Updated task "${task.title}" to point to ${unassignedClientId}`);
          }
        }
      }
    }
    
    console.log('\nCleanup completed!');
    
    // Show final state
    const { data: finalClients } = await supabase
      .from('clients')
      .select('*')
      .eq('name', 'Unassigned');
    
    console.log('\nFinal unassigned clients:');
    finalClients?.forEach(client => {
      console.log(`- ${client.name} (${client.team}) - ID: ${client.id}`);
    });
    
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

cleanupInvalidClients(); 