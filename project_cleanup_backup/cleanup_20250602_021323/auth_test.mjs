#!/usr/bin/env node

/**
 * AUTHENTICATION TEST
 * ===================
 * 
 * This script tests authentication using the app's actual Supabase client configuration.
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Use the same configuration as the app
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔧 Testing with app configuration...');
console.log(`URL: ${SUPABASE_URL}`);
console.log(`Key (first 50 chars): ${SUPABASE_ANON_KEY?.substring(0, 50)}...`);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing environment variables');
  console.log('\nPlease check your .env file contains:');
  console.log('VITE_SUPABASE_URL');
  console.log('VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
  console.log('\n🔌 Testing Supabase connection...');
  
  try {
    // Test basic connection
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact' })
      .limit(1);
    
    if (error) {
      console.error('❌ Connection failed:', error.message);
      console.log('\n💡 This could be due to:');
      console.log('   1. Invalid API key');
      console.log('   2. RLS (Row Level Security) blocking access');
      console.log('   3. Table does not exist');
      console.log('   4. Network issues');
      return false;
    }
    
    console.log('✅ Connection successful!');
    console.log(`   Found ${data?.length || 0} users table accessible`);
    return true;
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return false;
  }
}

async function testReadUsers() {
  console.log('\n📋 Testing user table access...');
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('email, name, role, team, is_active')
      .eq('is_active', true)
      .limit(5);
    
    if (error) {
      console.error('❌ Cannot read users:', error.message);
      console.log('\n💡 This suggests RLS is blocking anonymous access');
      console.log('   Run the fix_user_authentication.sql script in Supabase');
      return [];
    }
    
    console.log(`✅ Successfully read ${data.length} users:`);
    data.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (${user.name}) - ${user.role}/${user.team}`);
    });
    
    return data;
    
  } catch (error) {
    console.error('❌ Error reading users:', error.message);
    return [];
  }
}

async function testLogin(email, password) {
  console.log(`\n🔐 Testing login: ${email}`);
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .eq('is_active', true)
      .single();
    
    if (error) {
      console.error(`   ❌ Login failed: ${error.message}`);
      return false;
    }
    
    if (data) {
      console.log(`   ✅ Login successful for ${data.name} (${data.role}/${data.team})`);
      return true;
    }
    
    console.log(`   ❌ Invalid credentials or user not found`);
    return false;
    
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 AUTHENTICATION TEST TOOL');
  console.log('============================');
  
  const connected = await testConnection();
  
  if (!connected) {
    console.log('\n🔧 TROUBLESHOOTING STEPS:');
    console.log('========================');
    console.log('1. Check your Supabase project URL and API key');
    console.log('2. Verify the users table exists in your database');
    console.log('3. Run: Copy fix_user_authentication.sql content to Supabase SQL editor');
    console.log('4. Check if RLS policies are too restrictive');
    return;
  }
  
  const users = await testReadUsers();
  
  if (users.length === 0) {
    console.log('\n⚠️  No users found or RLS blocking access');
    console.log('   Run the fix_user_authentication.sql script first');
    return;
  }
  
  // Test admin login
  console.log('\n🧪 TESTING LOGINS:');
  console.log('==================');
  
  await testLogin('althameem@marketlube.in', 'Mark@99');
  
  // Test first few users with common passwords
  const testPasswords = ['password', '123456', 'admin', 'user123', 'test'];
  
  for (const user of users.slice(0, 2)) {
    console.log(`\nTesting ${user.email} with common passwords:`);
    
    let found = false;
    for (const pwd of testPasswords) {
      const success = await testLogin(user.email, pwd);
      if (success) {
        found = true;
        break;
      }
    }
    
    if (!found) {
      console.log(`   ⚠️  Could not guess password for ${user.email}`);
      console.log(`   💡 Check the password in your Supabase users table`);
    }
  }
  
  console.log('\n📋 SUMMARY:');
  console.log('===========');
  
  if (users.length > 1) {
    console.log(`✅ Found ${users.length} users in the database`);
    console.log('❌ Authentication is failing due to missing Supabase Auth accounts');
    console.log('\n🔧 SOLUTIONS:');
    console.log('1. IMMEDIATE: Run fix_user_authentication.sql to fix RLS');
    console.log('2. PROPER: Migrate users to Supabase Auth with migrate_users_to_auth.js');
  } else {
    console.log('⚠️  Only one user accessible - check RLS policies');
  }
}

main().catch(console.error); 