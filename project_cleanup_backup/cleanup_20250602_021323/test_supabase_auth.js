#!/usr/bin/env node

/**
 * TEST SUPABASE AUTH
 * ==================
 * 
 * This script tests whether Supabase Auth login is working for your users
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const SUPABASE_URL = 'https://ysfknpujqivkudhnhezx.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Test login for a specific user
 */
async function testLogin(email, password) {
  console.log(`\n🔄 Testing login for ${email}...`);
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.log(`  ❌ Login failed: ${error.message}`);
      return false;
    }

    if (data.user) {
      console.log(`  ✅ Login successful!`);
      console.log(`     User ID: ${data.user.id}`);
      console.log(`     Email: ${data.user.email}`);
      console.log(`     Name: ${data.user.user_metadata?.name || 'Not set'}`);
      console.log(`     Role: ${data.user.user_metadata?.role || 'Not set'}`);
      console.log(`     Team: ${data.user.user_metadata?.team || 'Not set'}`);
      
      // Sign out after test
      await supabase.auth.signOut();
      return true;
    }

    return false;
  } catch (error) {
    console.log(`  ❌ Login error: ${error.message}`);
    return false;
  }
}

/**
 * Test users that we know exist
 */
async function main() {
  console.log('🚀 TESTING SUPABASE AUTH LOGIN');
  console.log('===============================\n');

  const testUsers = [
    { email: 'althameem@marketlube.in', password: 'admin123' },
    { email: 'zaman@marketlube.in', password: 'manager123' },
    { email: 'michael@marketlube.com', password: 'manager123' },
    { email: 'sahad@marketlube.in', password: 'employee123' },
    { email: 'james@marketlube.com', password: 'employee123' },
  ];

  let successCount = 0;
  let totalCount = testUsers.length;

  for (const user of testUsers) {
    const success = await testLogin(user.email, user.password);
    if (success) successCount++;
  }

  console.log('\n📊 TEST SUMMARY');
  console.log('================');
  console.log(`Successful logins: ${successCount}/${totalCount}`);
  
  if (successCount === totalCount) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('Your users are already set up in Supabase Auth and ready for production.');
    console.log('\nYou can now:');
    console.log('1. Update your AuthContext.tsx to use Supabase Auth');
    console.log('2. Remove custom authentication logic');
    console.log('3. Deploy to production with confidence!');
  } else {
    console.log('\n⚠️  Some users failed login test');
    console.log('This might be due to:');
    console.log('- Incorrect passwords in the test data');
    console.log('- Users not properly migrated to Supabase Auth');
    console.log('- Authentication configuration issues');
  }

  console.log('\n💡 NEXT STEPS:');
  console.log('==============');
  console.log('1. If tests passed: Update your frontend to use Supabase Auth');
  console.log('2. If tests failed: Check user credentials and migration status');
  console.log('3. Test the new auth flow in your application');
}

main().catch(console.error); 