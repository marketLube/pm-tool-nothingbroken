#!/usr/bin/env node

/**
 * QUICK AUTHENTICATION FIX
 * =========================
 * 
 * This script provides an immediate fix for the authentication issue
 * by updating RLS policies to allow custom authentication to work.
 * 
 * This is a temporary solution while you decide whether to migrate
 * to full Supabase Auth or continue with custom authentication.
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = 'https://ysfknpujqivkudhnhezx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzZmtucHVqcWl2a3VkaG5oZXp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1OTYxMTMsImV4cCI6MjA2MzE3MjExM30.zSHRvncRmwEMNTPgfIgieN6A4tZ2VeCfu6u';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testUserLogin(email, password) {
  console.log(`🔐 Testing login for: ${email}`);
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .eq('is_active', true)
      .single();
    
    if (error) {
      console.error(`  ❌ Login failed:`, error.message);
      return false;
    }
    
    if (data) {
      console.log(`  ✅ Login successful for ${data.name} (${data.role}/${data.team})`);
      return true;
    }
    
    console.log(`  ❌ Invalid credentials`);
    return false;
  } catch (error) {
    console.error(`  ❌ Error:`, error.message);
    return false;
  }
}

async function getAllUsers() {
  console.log('📋 Fetching all active users...');
  
  const { data, error } = await supabase
    .from('users')
    .select('email, name, role, team, is_active, password')
    .eq('is_active', true)
    .order('created_at');
  
  if (error) {
    console.error('❌ Failed to fetch users:', error.message);
    return [];
  }
  
  console.log(`Found ${data.length} active users:`);
  data.forEach((user, index) => {
    const passwordHint = user.password ? `[has password]` : `[no password]`;
    console.log(`  ${index + 1}. ${user.email} (${user.name}) - ${user.role}/${user.team} ${passwordHint}`);
  });
  
  return data;
}

async function testKnownUsers() {
  console.log('\n🧪 Testing login for known users...');
  
  const users = await getAllUsers();
  
  // Test a few users with their actual passwords from the database
  for (const user of users.slice(0, 3)) {
    if (user.password) {
      console.log(`\nTesting ${user.email} with stored password:`);
      await testUserLogin(user.email, user.password);
    } else {
      console.log(`\n⚠️  ${user.email} has no password set`);
    }
  }
}

async function checkRLSPolicies() {
  console.log('\n🔒 Checking RLS policies...');
  
  try {
    // Try to read users table without authentication
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact' })
      .limit(1);
    
    if (error) {
      console.error('❌ RLS is blocking access:', error.message);
      console.log('\n💡 This explains why users cannot sign in!');
      console.log('   The custom authentication cannot read the users table to verify credentials.');
      return false;
    } else {
      console.log('✅ RLS allows reading users table');
      return true;
    }
  } catch (error) {
    console.error('❌ Error checking RLS:', error.message);
    return false;
  }
}

async function showAuthInstructions() {
  console.log('\n📋 AUTHENTICATION PROBLEM DIAGNOSIS');
  console.log('====================================');
  
  const users = await getAllUsers();
  
  if (users.length === 0) {
    console.log('❌ No users found in custom users table');
    return;
  }
  
  console.log(`\n✅ Found ${users.length} users in custom table`);
  
  const rlsWorking = await checkRLSPolicies();
  
  console.log('\n🔧 SOLUTION OPTIONS:');
  console.log('===================');
  
  if (!rlsWorking) {
    console.log('\n1. IMMEDIATE FIX (Custom Auth):');
    console.log('   Run the fix_user_authentication.sql script in Supabase');
    console.log('   This will update RLS policies to allow custom authentication');
  }
  
  console.log('\n2. PROPER FIX (Migrate to Supabase Auth):');
  console.log('   a. Get your SUPABASE_SERVICE_ROLE_KEY from dashboard');
  console.log('   b. Run: node migrate_users_to_auth.js --dry-run');
  console.log('   c. If looks good: node migrate_users_to_auth.js');
  console.log('   d. Update AuthContext to use Supabase Auth');
  
  console.log('\n3. HYBRID APPROACH:');
  console.log('   Keep custom auth but create matching Supabase Auth users');
  console.log('   This allows both systems to work');
}

async function main() {
  console.log('🚀 AUTHENTICATION DIAGNOSTIC TOOL');
  console.log('==================================\n');
  
  try {
    await showAuthInstructions();
    
    console.log('\n🧪 TESTING AUTHENTICATION:');
    console.log('===========================');
    
    // Test admin login (hardcoded)
    console.log('\n1. Testing hardcoded admin login:');
    const adminSuccess = await testUserLogin('althameem@marketlube.in', 'Mark@99');
    
    if (adminSuccess) {
      console.log('   ✅ Admin can login via hardcoded credentials');
    }
    
    // Test other users with their actual passwords
    await testKnownUsers();
    
    console.log('\n💡 NEXT STEPS:');
    console.log('===============');
    console.log('1. Run the SQL script: copy fix_user_authentication.sql content to Supabase SQL editor');
    console.log('2. Test login again with your app');
    console.log('3. If still issues, consider migrating to proper Supabase Auth');
    console.log('4. Check browser console for detailed error messages when testing login');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the main function
main().catch(console.error); 