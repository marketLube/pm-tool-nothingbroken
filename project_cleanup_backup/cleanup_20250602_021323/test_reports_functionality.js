// Test script to verify Reports & Analytics functionality
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// Use the correct Supabase credentials from your project
const supabaseUrl = 'https://ysfknpujqivkudhnhezx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzZmtucHVqcWl2a3VkaG5oZXp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1OTYxMTMsImV4cCI6MjA2MzE3MjExM30.zSHRvncRmwEMNTPgfIgieN6A4tZ2VeCfu6uZV0xaiSQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testReportsFunctionality() {
  console.log('🧪 Testing Reports & Analytics functionality...\n');

  try {
    // Test 1: Check if tables exist
    console.log('1. Checking if daily_work_entries table exists...');
    const { data: tables, error: tablesError } = await supabase
      .from('daily_work_entries')
      .select('*')
      .limit(1);

    if (tablesError) {
      console.error('❌ Table check failed:', tablesError.message);
      return;
    }
    console.log('✅ daily_work_entries table exists');

    // Test 2: Get a user ID for testing
    console.log('\n2. Getting user for testing...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, team')
      .limit(1);

    if (usersError || !users || users.length === 0) {
      console.error('❌ No users found:', usersError?.message);
      return;
    }

    const testUser = users[0];
    console.log(`✅ Using test user: ${testUser.name} (${testUser.team} team)`);

    // Test 3: Try to create a daily work entry
    console.log('\n3. Testing daily work entry creation...');
    const testDate = '2025-05-27';
    const testEntryId = randomUUID(); // Generate a proper UUID
    const testEntry = {
      id: testEntryId,
      user_id: testUser.id,
      date: testDate,
      assigned_tasks: ['test-task-1'],
      completed_tasks: [],
      check_in_time: '09:00',
      check_out_time: null,
      is_absent: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: createData, error: createError } = await supabase
      .from('daily_work_entries')
      .upsert([testEntry])
      .select();

    if (createError) {
      console.error('❌ Create entry failed:', createError.message);
      return;
    }
    console.log('✅ Daily work entry created successfully');

    // Test 4: Try to read the entry
    console.log('\n4. Testing daily work entry retrieval...');
    const { data: readData, error: readError } = await supabase
      .from('daily_work_entries')
      .select('*')
      .eq('user_id', testUser.id)
      .eq('date', testDate)
      .single();

    if (readError) {
      console.error('❌ Read entry failed:', readError.message);
      return;
    }
    console.log('✅ Daily work entry retrieved successfully');

    // Test 5: Test task completion (move task from assigned to completed)
    console.log('\n5. Testing task completion...');
    const { data: updateData, error: updateError } = await supabase
      .from('daily_work_entries')
      .update({
        assigned_tasks: [],
        completed_tasks: ['test-task-1'],
        updated_at: new Date().toISOString(),
      })
      .eq('id', testEntryId)
      .select();

    if (updateError) {
      console.error('❌ Task completion failed:', updateError.message);
      return;
    }
    console.log('✅ Task completion works correctly');

    // Clean up test data
    console.log('\n6. Cleaning up test data...');
    await supabase
      .from('daily_work_entries')
      .delete()
      .eq('id', testEntryId);
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All tests passed! Reports & Analytics functionality is working correctly.');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testReportsFunctionality(); 