import { createClient } from '@supabase/supabase-js';

// Use the same credentials as in the app
const supabaseUrl = 'https://ysfknpujqivkudhnhezx.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzZmtucHVqcWl2a3VkaG5oZXp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzU5NjExMywiZXhwIjoyMDYzMTcyMTEzfQ.7q0ONGSxRUvWJS_Vo3DcXnoZt6DSpBqsZhcnX9JTARI';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testClients() {
  console.log('Testing Supabase connection...');
  
  try {
    // Fetch all clients
    const { data: clients, error } = await supabase
      .from('clients')
      .select('*');
    
    if (error) {
      console.error('Error fetching clients:', error);
      return;
    }
    
    console.log(`Found ${clients.length} clients in database:`);
    clients.forEach(client => {
      console.log(`- ${client.name} (${client.team}) - ID: ${client.id}`);
    });
    
    // Test specific client ID that's failing
    const problemId = 'f3a51f38-0d9b-457d-a704-33e35266396f';
    console.log(`\nTesting specific client ID: ${problemId}`);
    
    const { data: specificClient, error: specificError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', problemId)
      .single();
    
    if (specificError) {
      console.log('Error fetching specific client:', specificError);
    } else {
      console.log('Found specific client:', specificClient);
    }
    
    // Test the exact query that's failing in the app
    console.log('\nTesting the exact query from the app...');
    const { data: testClient, error: testError } = await supabase
      .from('clients')
      .select('team, name')
      .eq('id', problemId)
      .single();
    
    if (testError) {
      console.log('Error with team/name query:', testError);
    } else {
      console.log('Success with team/name query:', testClient);
    }
    
    // Check if team column exists
    console.log('\nChecking database schema...');
    const { data: schemaData, error: schemaError } = await supabase
      .from('clients')
      .select('*')
      .limit(1);
    
    if (!schemaError && schemaData.length > 0) {
      console.log('Available columns:', Object.keys(schemaData[0]));
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testClients(); 