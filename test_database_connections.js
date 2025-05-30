import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

function logTest(testName, success, details = '') {
  if (success) {
    console.log(`✅ ${testName}`);
    testResults.passed++;
  } else {
    console.log(`❌ ${testName} - ${details}`);
    testResults.failed++;
    testResults.errors.push(`${testName}: ${details}`);
  }
}

async function testDatabaseConnection() {
  console.log('\n🔍 Testing Database Connection...');
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    logTest('Database Connection', !error, error?.message);
    return !error;
  } catch (err) {
    logTest('Database Connection', false, err.message);
    return false;
  }
}

async function testTableExists(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    logTest(`Table '${tableName}' exists`, !error, error?.message);
    return !error;
  } catch (err) {
    logTest(`Table '${tableName}' exists`, false, err.message);
    return false;
  }
}

async function testUserOperations() {
  console.log('\n👥 Testing User Operations...');
  
  // Test user creation
  const testUser = {
    id: 'test-user-' + Date.now(),
    name: 'Test User',
    email: 'test@example.com',
    team: 'creative',
    role: 'employee',
    password: 'test123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  try {
    // Create user
    const { data: createData, error: createError } = await supabase
      .from('users')
      .insert([testUser])
      .select()
      .single();
    
    logTest('User Creation', !createError, createError?.message);
    
    if (!createError) {
      // Read user
      const { data: readData, error: readError } = await supabase
        .from('users')
        .select('*')
        .eq('id', testUser.id)
        .single();
      
      logTest('User Read', !readError && readData?.id === testUser.id, readError?.message);
      
      // Update user
      const { data: updateData, error: updateError } = await supabase
        .from('users')
        .update({ name: 'Updated Test User' })
        .eq('id', testUser.id)
        .select()
        .single();
      
      logTest('User Update', !updateError && updateData?.name === 'Updated Test User', updateError?.message);
      
      // Delete user
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', testUser.id);
      
      logTest('User Delete', !deleteError, deleteError?.message);
    }
  } catch (err) {
    logTest('User Operations', false, err.message);
  }
}

async function testClientOperations() {
  console.log('\n🏢 Testing Client Operations...');
  
  const testClient = {
    id: 'test-client-' + Date.now(),
    name: 'Test Client',
    industry: 'Technology',
    contact_person: 'John Doe',
    email: 'john@testclient.com',
    phone: '123-456-7890',
    team: 'creative',
    date_added: new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString()
  };
  
  try {
    // Create client
    const { data: createData, error: createError } = await supabase
      .from('clients')
      .insert([testClient])
      .select()
      .single();
    
    logTest('Client Creation', !createError, createError?.message);
    
    if (!createError) {
      // Read client
      const { data: readData, error: readError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', testClient.id)
        .single();
      
      logTest('Client Read', !readError && readData?.id === testClient.id, readError?.message);
      
      // Update client
      const { data: updateData, error: updateError } = await supabase
        .from('clients')
        .update({ name: 'Updated Test Client' })
        .eq('id', testClient.id)
        .select()
        .single();
      
      logTest('Client Update', !updateError && updateData?.name === 'Updated Test Client', updateError?.message);
      
      // Delete client
      const { error: deleteError } = await supabase
        .from('clients')
        .delete()
        .eq('id', testClient.id);
      
      logTest('Client Delete', !deleteError, deleteError?.message);
    }
  } catch (err) {
    logTest('Client Operations', false, err.message);
  }
}

async function testTaskOperations() {
  console.log('\n📋 Testing Task Operations...');
  
  // First create a test user and client for the task
  const testUser = {
    id: 'test-task-user-' + Date.now(),
    name: 'Task Test User',
    email: 'taskuser@example.com',
    team: 'creative',
    role: 'employee',
    password: 'test123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  const testClient = {
    id: 'test-task-client-' + Date.now(),
    name: 'Task Test Client',
    industry: 'Technology',
    contact_person: 'Jane Doe',
    email: 'jane@taskclient.com',
    phone: '123-456-7890',
    team: 'creative',
    date_added: new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString()
  };
  
  try {
    // Create dependencies
    await supabase.from('users').insert([testUser]);
    await supabase.from('clients').insert([testClient]);
    
    const testTask = {
      id: 'test-task-' + Date.now(),
      title: 'Test Task',
      description: 'This is a test task',
      status: 'todo',
      priority: 'medium',
      assignee_id: testUser.id,
      client_id: testClient.id,
      team: 'creative',
      due_date: new Date().toISOString().split('T')[0],
      created_by: testUser.id,
      created_at: new Date().toISOString()
    };
    
    // Create task
    const { data: createData, error: createError } = await supabase
      .from('tasks')
      .insert([testTask])
      .select()
      .single();
    
    logTest('Task Creation', !createError, createError?.message);
    
    if (!createError) {
      // Read task
      const { data: readData, error: readError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', testTask.id)
        .single();
      
      logTest('Task Read', !readError && readData?.id === testTask.id, readError?.message);
      
      // Update task
      const { data: updateData, error: updateError } = await supabase
        .from('tasks')
        .update({ status: 'in_progress' })
        .eq('id', testTask.id)
        .select()
        .single();
      
      logTest('Task Update', !updateError && updateData?.status === 'in_progress', updateError?.message);
      
      // Delete task
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', testTask.id);
      
      logTest('Task Delete', !deleteError, deleteError?.message);
    }
    
    // Cleanup dependencies
    await supabase.from('users').delete().eq('id', testUser.id);
    await supabase.from('clients').delete().eq('id', testClient.id);
    
  } catch (err) {
    logTest('Task Operations', false, err.message);
  }
}

async function testDailyWorkEntryOperations() {
  console.log('\n📊 Testing Daily Work Entry Operations...');
  
  // Create a test user first
  const testUser = {
    id: 'test-dwe-user-' + Date.now(),
    name: 'DWE Test User',
    email: 'dweuser@example.com',
    team: 'creative',
    role: 'employee',
    password: 'test123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  try {
    await supabase.from('users').insert([testUser]);
    
    const testEntry = {
      id: 'test-dwe-' + Date.now(),
      user_id: testUser.id,
      date: new Date().toISOString().split('T')[0],
      check_in_time: '09:00',
      check_out_time: '17:00',
      is_absent: false,
      assigned_tasks: ['task1', 'task2'],
      completed_tasks: ['task1'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Create daily work entry
    const { data: createData, error: createError } = await supabase
      .from('daily_work_entries')
      .insert([testEntry])
      .select()
      .single();
    
    logTest('Daily Work Entry Creation', !createError, createError?.message);
    
    if (!createError) {
      // Read entry
      const { data: readData, error: readError } = await supabase
        .from('daily_work_entries')
        .select('*')
        .eq('id', testEntry.id)
        .single();
      
      logTest('Daily Work Entry Read', !readError && readData?.id === testEntry.id, readError?.message);
      
      // Update entry
      const { data: updateData, error: updateError } = await supabase
        .from('daily_work_entries')
        .update({ check_out_time: '18:00' })
        .eq('id', testEntry.id)
        .select()
        .single();
      
      logTest('Daily Work Entry Update', !updateError && updateData?.check_out_time === '18:00', updateError?.message);
      
      // Delete entry
      const { error: deleteError } = await supabase
        .from('daily_work_entries')
        .delete()
        .eq('id', testEntry.id);
      
      logTest('Daily Work Entry Delete', !deleteError, deleteError?.message);
    }
    
    // Cleanup user
    await supabase.from('users').delete().eq('id', testUser.id);
    
  } catch (err) {
    logTest('Daily Work Entry Operations', false, err.message);
  }
}

async function testStatusOperations() {
  console.log('\n🏷️ Testing Status Operations...');
  
  const testStatus = {
    id: 'test-status-' + Date.now(),
    name: 'Test Status',
    team: 'creative',
    color: '#FF0000',
    order: 999,
    created_at: new Date().toISOString()
  };
  
  try {
    // Create status
    const { data: createData, error: createError } = await supabase
      .from('statuses')
      .insert([testStatus])
      .select()
      .single();
    
    logTest('Status Creation', !createError, createError?.message);
    
    if (!createError) {
      // Read status
      const { data: readData, error: readError } = await supabase
        .from('statuses')
        .select('*')
        .eq('id', testStatus.id)
        .single();
      
      logTest('Status Read', !readError && readData?.id === testStatus.id, readError?.message);
      
      // Update status
      const { data: updateData, error: updateError } = await supabase
        .from('statuses')
        .update({ name: 'Updated Test Status' })
        .eq('id', testStatus.id)
        .select()
        .single();
      
      logTest('Status Update', !updateError && updateData?.name === 'Updated Test Status', updateError?.message);
      
      // Delete status
      const { error: deleteError } = await supabase
        .from('statuses')
        .delete()
        .eq('id', testStatus.id);
      
      logTest('Status Delete', !deleteError, deleteError?.message);
    }
  } catch (err) {
    logTest('Status Operations', false, err.message);
  }
}

async function testRLSPolicies() {
  console.log('\n🔒 Testing Row Level Security Policies...');
  
  try {
    // Test if we can access tables without authentication (should work with anon key)
    const tables = ['users', 'clients', 'tasks', 'statuses', 'daily_work_entries'];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      // For anon access, we expect either data or a specific RLS error
      const hasAccess = !error || error.code !== '42501'; // 42501 is insufficient privilege
      logTest(`RLS Policy for ${table}`, hasAccess, error?.message);
    }
  } catch (err) {
    logTest('RLS Policies', false, err.message);
  }
}

async function testDataIntegrity() {
  console.log('\n🔍 Testing Data Integrity...');
  
  try {
    // Test foreign key constraints
    const invalidTask = {
      id: 'test-invalid-task-' + Date.now(),
      title: 'Invalid Task',
      description: 'Task with invalid foreign keys',
      status: 'todo',
      priority: 'medium',
      assignee_id: 'non-existent-user',
      client_id: 'non-existent-client',
      team: 'creative',
      due_date: new Date().toISOString().split('T')[0],
      created_by: 'non-existent-user',
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('tasks')
      .insert([invalidTask])
      .select()
      .single();
    
    // We expect this to fail due to foreign key constraints
    logTest('Foreign Key Constraints', !!error, 'Should fail with foreign key constraint');
    
    // Test unique constraints
    const duplicateUser = {
      id: 'test-duplicate-' + Date.now(),
      name: 'Duplicate User',
      email: 'duplicate@example.com',
      team: 'creative',
      role: 'employee',
      password: 'test123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Insert first user
    await supabase.from('users').insert([duplicateUser]);
    
    // Try to insert duplicate email
    const { error: duplicateError } = await supabase
      .from('users')
      .insert([{ ...duplicateUser, id: 'test-duplicate-2-' + Date.now() }]);
    
    logTest('Unique Email Constraint', !!duplicateError, 'Should fail with unique constraint');
    
    // Cleanup
    await supabase.from('users').delete().eq('id', duplicateUser.id);
    
  } catch (err) {
    logTest('Data Integrity', false, err.message);
  }
}

async function runAllTests() {
  console.log('🚀 Starting Comprehensive Database Connection Test\n');
  console.log('============================================================');
  
  // Test basic connection
  const connectionOk = await testDatabaseConnection();
  
  if (!connectionOk) {
    console.log('\n❌ Database connection failed. Stopping tests.');
    return;
  }
  
  // Test table existence
  console.log('\n📋 Testing Table Existence...');
  const tables = ['users', 'clients', 'tasks', 'statuses', 'daily_work_entries', 'task_completions'];
  for (const table of tables) {
    await testTableExists(table);
  }
  
  // Test CRUD operations
  await testUserOperations();
  await testClientOperations();
  await testTaskOperations();
  await testDailyWorkEntryOperations();
  await testStatusOperations();
  
  // Test security and integrity
  await testRLSPolicies();
  await testDataIntegrity();
  
  // Summary
  console.log('\n============================================================');
  console.log('📊 TEST SUMMARY');
  console.log('============================================================');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n🔍 FAILED TESTS:');
    testResults.errors.forEach(error => console.log(`   • ${error}`));
  }
  
  console.log('\n============================================================');
  
  if (testResults.failed === 0) {
    console.log('🎉 ALL TESTS PASSED! Your database is properly connected and configured.');
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.');
  }
}

// Run the tests
runAllTests().catch(console.error); 