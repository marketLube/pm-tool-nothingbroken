import { createClient } from '@supabase/supabase-js';

// Use the same credentials as in the app
const supabaseUrl = 'https://ysfknpujqivkudhnhezx.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzZmtucHVqcWl2a3VkaG5oZXp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzU5NjExMywiZXhwIjoyMDYzMTcyMTEzfQ.7q0ONGSxRUvWJS_Vo3DcXnoZt6DSpBqsZhcnX9JTARI';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function fixClientsTable() {
  console.log('Fixing clients table...');
  
  try {
    // First, let's try to add the team column using a direct SQL query
    console.log('Adding team column...');
    const { data: alterResult, error: alterError } = await supabase.rpc('exec_sql', {
      sql: "ALTER TABLE clients ADD COLUMN IF NOT EXISTS team VARCHAR(20) DEFAULT 'creative';"
    });
    
    if (alterError) {
      console.log('Could not use RPC, trying alternative approach...');
      
      // Alternative: Update existing clients one by one
      console.log('Fetching all clients...');
      const { data: clients, error: fetchError } = await supabase
        .from('clients')
        .select('id, name');
      
      if (fetchError) {
        console.error('Error fetching clients:', fetchError);
        return;
      }
      
      console.log(`Found ${clients.length} clients to update`);
      
      // Update each client to add team field
      for (const client of clients) {
        console.log(`Updating client: ${client.name}`);
        const { error: updateError } = await supabase
          .from('clients')
          .update({ team: 'creative' })
          .eq('id', client.id);
        
        if (updateError) {
          console.error(`Error updating client ${client.name}:`, updateError);
        } else {
          console.log(`✅ Updated ${client.name}`);
        }
      }
    } else {
      console.log('✅ Team column added successfully');
      
      // Update existing clients
      console.log('Updating existing clients...');
      const { error: updateError } = await supabase
        .from('clients')
        .update({ team: 'creative' })
        .is('team', null);
      
      if (updateError) {
        console.error('Error updating clients:', updateError);
      } else {
        console.log('✅ Existing clients updated');
      }
    }
    
    // Verify the changes
    console.log('\nVerifying changes...');
    const { data: updatedClients, error: verifyError } = await supabase
      .from('clients')
      .select('id, name, team');
    
    if (verifyError) {
      console.error('Error verifying changes:', verifyError);
    } else {
      console.log('Updated clients:');
      updatedClients.forEach(client => {
        console.log(`- ${client.name} (${client.team}) - ID: ${client.id}`);
      });
    }
    
  } catch (error) {
    console.error('Fix failed:', error);
  }
}

fixClientsTable(); 