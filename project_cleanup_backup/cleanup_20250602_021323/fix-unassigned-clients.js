import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Use the same credentials as in the app
const supabaseUrl = 'https://ysfknpujqivkudhnhezx.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzZmtucHVqcWl2a3VkaG5oZXp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzU5NjExMywiZXhwIjoyMDYzMTcyMTEzfQ.7q0ONGSxRUvWJS_Vo3DcXnoZt6DSpBqsZhcnX9JTARI';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function fixUnassignedClients() {
  console.log('Fixing unassigned clients with invalid UUIDs...');
  
  try {
    // Find clients with invalid UUID format (like "unassigned-creative", "unassigned-web")
    const { data: invalidClients, error: fetchError } = await supabase
      .from('clients')
      .select('*')
      .in('id', ['unassigned-creative', 'unassigned-web']);
    
    if (fetchError) {
      console.error('Error fetching invalid clients:', fetchError);
      return;
    }
    
    console.log(`Found ${invalidClients.length} clients with invalid UUID format:`, invalidClients);
    
    for (const client of invalidClients) {
      console.log(`\nFixing client: ${client.name} (${client.id})`);
      
      // Check if there are any tasks assigned to this client
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, title')
        .eq('client_id', client.id);
      
      if (tasksError) {
        console.error(`Error checking tasks for client ${client.id}:`, tasksError);
        continue;
      }
      
      console.log(`Found ${tasks.length} tasks assigned to this client`);
      
      // Create a new client with proper UUID
      const newClientId = uuidv4();
      const newClientData = {
        ...client,
        id: newClientId
      };
      
      // Insert the new client
      const { error: insertError } = await supabase
        .from('clients')
        .insert([newClientData]);
      
      if (insertError) {
        console.error(`Error creating new client:`, insertError);
        continue;
      }
      
      console.log(`Created new client with ID: ${newClientId}`);
      
      // Update all tasks to point to the new client
      if (tasks.length > 0) {
        const { error: updateError } = await supabase
          .from('tasks')
          .update({ client_id: newClientId })
          .eq('client_id', client.id);
        
        if (updateError) {
          console.error(`Error updating tasks:`, updateError);
          continue;
        }
        
        console.log(`Updated ${tasks.length} tasks to point to new client`);
      }
      
      // Delete the old client with invalid UUID
      const { error: deleteError } = await supabase
        .from('clients')
        .delete()
        .eq('id', client.id);
      
      if (deleteError) {
        console.error(`Error deleting old client:`, deleteError);
        continue;
      }
      
      console.log(`Deleted old client with invalid UUID: ${client.id}`);
    }
    
    console.log('\nFinished fixing unassigned clients!');
    
  } catch (error) {
    console.error('Error fixing unassigned clients:', error);
  }
}

fixUnassignedClients(); 