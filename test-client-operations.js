import { supabaseAdmin } from './src/utils/supabase.ts';

async function testClientOperations() {
  console.log('Testing Supabase admin connection...');
  
  try {
    // Test connection
    const { data: testData, error: testError } = await supabaseAdmin
      .from('clients')
      .select('id, name')
      .limit(1);
    
    if (testError) {
      console.error('Connection test failed:', testError);
      return;
    }
    
    console.log('✅ Connection successful');
    
    // Fetch all clients
    console.log('\nFetching all clients...');
    const { data: clients, error: clientsError } = await supabaseAdmin
      .from('clients')
      .select('*');
    
    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
    } else {
      console.log('Current clients in database:', clients.length);
      clients.forEach(client => {
        console.log(`- ${client.name} (${client.team}) - ID: ${client.id}`);
      });
    }
    
    // Check tasks
    console.log('\nFetching all tasks...');
    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from('tasks')
      .select('id, title, client_id');
    
    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
    } else {
      console.log('Current tasks in database:', tasks.length);
      tasks.forEach(task => {
        console.log(`- ${task.title} (Client ID: ${task.client_id})`);
      });
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testClientOperations(); 