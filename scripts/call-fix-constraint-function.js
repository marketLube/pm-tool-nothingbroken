#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://ysfknpujqivkudhnhezx.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzZmtucHVqcWl2a3VkaG5oZXp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzU5NjExMywiZXhwIjoyMDYzMTcyMTEzfQ.7q0ONGSxRUvWJS_Vo3DcXnoZt6DSpBqsZhcnX9JTARI';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function callFixConstraintFunction() {
  console.log('🔧 Calling PostgreSQL function to fix team constraint...');
  
  try {
    // Call the fix_team_constraint function via RPC
    const { data, error } = await supabase.rpc('fix_team_constraint');
    
    if (error) {
      console.error('❌ Error calling function:', error);
      return false;
    }
    
    console.log('📋 Function result:', data);
    
    if (data && data.success) {
      console.log('✅ Success:', data.message);
      console.log('🕒 Timestamp:', data.timestamp);
      return true;
    } else {
      console.error('❌ Function reported an error:', data?.error || 'Unknown error');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

async function verifyFix() {
  console.log('\n🧪 Verifying the constraint fix...');
  
  try {
    // Get an admin user
    const { data: admins, error: adminError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'admin')
      .limit(1);

    if (adminError) {
      console.error('❌ Error fetching admin:', adminError);
      return false;
    }

    if (admins.length === 0) {
      console.log('⚠️  No admin users found to test with');
      return true; // Not really an error
    }

    const admin = admins[0];
    console.log(`📋 Testing with admin: ${admin.full_name || admin.email}`);

    // Try to update the admin's team to 'all'
    console.log('🔄 Attempting to set team to "all"...');
    const { error: updateError } = await supabase
      .from('users')
      .update({ team: 'all' })
      .eq('id', admin.id);

    if (updateError) {
      console.log('❌ Constraint still blocking:', updateError.message);
      return false;
    }

    console.log('✅ Successfully updated admin team to "all"!');
    console.log('🎉 Constraint fix has been verified!');
    return true;

  } catch (error) {
    console.error('❌ Error during verification:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting constraint fix process...');
  console.log('🔗 Connecting to Supabase...');
  
  // Test connection
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .limit(1);
  
  if (error) {
    console.error('❌ Connection failed:', error);
    return;
  }
  
  console.log('✅ Connected to database successfully!');
  
  // Note: The function must be created first in the database
  console.log('\n⚠️  Note: Make sure the fix_team_constraint() function has been created in the database first!');
  console.log('📝 You can create it by running the SQL in scripts/create-fix-constraint-function.sql');
  console.log('🔧 Go to: https://ysfknpujqivkudhnhezx.supabase.co/project/default/sql');
  console.log('📋 Copy and run the SQL from create-fix-constraint-function.sql\n');
  
  // Call the fix function
  const success = await callFixConstraintFunction();
  
  if (success) {
    // Verify it worked
    await verifyFix();
  } else {
    console.log('\n💡 If the function doesn\'t exist, please:');
    console.log('1. Go to Supabase SQL editor: https://ysfknpujqivkudhnhezx.supabase.co/project/default/sql');
    console.log('2. Copy and run the SQL from scripts/create-fix-constraint-function.sql');
    console.log('3. Run this script again');
  }
}

main().catch(console.error); 