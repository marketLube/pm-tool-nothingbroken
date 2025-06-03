import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pvjscvvmjjhqgfukmkjg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2anNjdnZtampocWdmdWtta2pnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjczNzAyOCwiZXhwIjoyMDQ4MzEzMDI4fQ.WpGTxR1KRUQsJEiLUlrqIBQd7MLKLqcfBLGTcyXmD9E';

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupClients() {
  console.log('🧹 Starting client cleanup...');

  try {
    // 1. Check current unassigned clients
    console.log('\n📋 Current unassigned clients:');
    const { data: unassignedClients, error: unassignedError } = await supabase
      .from('clients')
      .select('id, name, team, date_added')
      .eq('name', 'Unassigned');
    
    if (unassignedError) {
      console.error('Error fetching unassigned clients:', unassignedError);
    } else {
      console.log(`Found ${unassignedClients.length} unassigned clients:`, unassignedClients);
    }

    // 2. Check current ABC Corporation entries
    console.log('\n🏢 Current ABC Corporation entries:');
    const { data: abcClients, error: abcError } = await supabase
      .from('clients')
      .select('id, name, team, date_added')
      .ilike('name', '%ABC%Corporation%');
    
    if (abcError) {
      console.error('Error fetching ABC Corporation clients:', abcError);
    } else {
      console.log(`Found ${abcClients.length} ABC Corporation clients:`, abcClients);
    }

    // 3. Move tasks from unassigned clients to null
    if (unassignedClients && unassignedClients.length > 0) {
      console.log('\n🔄 Moving tasks from unassigned clients...');
      const unassignedIds = unassignedClients.map(c => c.id);
      
      const { data: tasksToUpdate, error: tasksError } = await supabase
        .from('tasks')
        .select('id, title, client_id')
        .in('client_id', unassignedIds);
      
      if (tasksError) {
        console.error('Error fetching tasks from unassigned clients:', tasksError);
      } else {
        console.log(`Found ${tasksToUpdate.length} tasks to update`);
        
        if (tasksToUpdate.length > 0) {
          const { error: updateError } = await supabase
            .from('tasks')
            .update({ client_id: null })
            .in('client_id', unassignedIds);
          
          if (updateError) {
            console.error('Error updating tasks:', updateError);
          } else {
            console.log(`✅ Updated ${tasksToUpdate.length} tasks to have null client_id`);
          }
        }
      }
    }

    // 4. Delete unassigned clients
    if (unassignedClients && unassignedClients.length > 0) {
      console.log('\n🗑️ Deleting unassigned clients...');
      const { error: deleteUnassignedError } = await supabase
        .from('clients')
        .delete()
        .eq('name', 'Unassigned');
      
      if (deleteUnassignedError) {
        console.error('Error deleting unassigned clients:', deleteUnassignedError);
      } else {
        console.log(`✅ Deleted ${unassignedClients.length} unassigned clients`);
      }
    }

    // 5. Handle ABC Corporation duplicates
    if (abcClients && abcClients.length > 1) {
      console.log('\n🔄 Handling ABC Corporation duplicates...');
      
      // Group by team and keep the oldest in each team
      const abcByTeam = abcClients.reduce((acc, client) => {
        if (!acc[client.team]) {
          acc[client.team] = [];
        }
        acc[client.team].push(client);
        return acc;
      }, {});
      
      for (const [team, clients] of Object.entries(abcByTeam)) {
        if (clients.length > 1) {
          // Sort by date and keep the first (oldest)
          clients.sort((a, b) => new Date(a.date_added) - new Date(b.date_added));
          const keepClient = clients[0];
          const deleteClients = clients.slice(1);
          
          console.log(`For team ${team}: keeping ${keepClient.id}, deleting ${deleteClients.length} duplicates`);
          
          // Move tasks from duplicates to the kept client
          for (const clientToDelete of deleteClients) {
            const { data: tasksToMove, error: tasksError } = await supabase
              .from('tasks')
              .select('id, title')
              .eq('client_id', clientToDelete.id);
            
            if (tasksError) {
              console.error(`Error fetching tasks for client ${clientToDelete.id}:`, tasksError);
              continue;
            }
            
            if (tasksToMove && tasksToMove.length > 0) {
              const { error: moveError } = await supabase
                .from('tasks')
                .update({ client_id: keepClient.id })
                .eq('client_id', clientToDelete.id);
              
              if (moveError) {
                console.error(`Error moving tasks from ${clientToDelete.id} to ${keepClient.id}:`, moveError);
              } else {
                console.log(`✅ Moved ${tasksToMove.length} tasks from duplicate to original`);
              }
            }
            
            // Delete the duplicate client
            const { error: deleteError } = await supabase
              .from('clients')
              .delete()
              .eq('id', clientToDelete.id);
            
            if (deleteError) {
              console.error(`Error deleting duplicate client ${clientToDelete.id}:`, deleteError);
            } else {
              console.log(`✅ Deleted duplicate ABC Corporation client ${clientToDelete.id}`);
            }
          }
        }
      }
    }

    // 6. Add unique constraint (using ALTER TABLE through RPC if available)
    console.log('\n🔒 Adding unique constraint...');
    const { error: constraintError } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$ 
        BEGIN
            ALTER TABLE clients 
            ADD CONSTRAINT unique_client_name_per_team 
            UNIQUE (name, team);
            
            RAISE NOTICE 'Added unique constraint for client names per team';
        EXCEPTION
            WHEN duplicate_table THEN
                RAISE NOTICE 'Unique constraint already exists';
            WHEN others THEN
                RAISE NOTICE 'Could not add constraint: %', SQLERRM;
        END $$;
      `
    });
    
    if (constraintError) {
      console.log('Note: Could not add unique constraint via RPC:', constraintError.message);
      console.log('This constraint should be added manually in Supabase dashboard');
    } else {
      console.log('✅ Unique constraint added successfully');
    }

    // 7. Show final state
    console.log('\n📊 Final client list:');
    const { data: finalClients, error: finalError } = await supabase
      .from('clients')
      .select('id, name, team, date_added')
      .order('team')
      .order('name');
    
    if (finalError) {
      console.error('Error fetching final client list:', finalError);
    } else {
      console.log(`Total clients remaining: ${finalClients.length}`);
      finalClients.forEach(client => {
        console.log(`  ${client.team}: ${client.name} (${client.date_added})`);
      });
    }

    console.log('\n✅ Client cleanup completed successfully!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

// Run the cleanup
cleanupClients(); 