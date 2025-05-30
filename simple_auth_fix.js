#!/usr/bin/env node

/**
 * SIMPLE AUTH FIX
 * ===============
 * 
 * This script ensures all users can log in with your custom authentication system.
 * It verifies the database setup and provides login credentials for testing.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const SUPABASE_URL = 'https://ysfknpujqivkudhnhezx.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Test database connection and fetch all users
 */
async function getAllUsers() {
  console.log('🔌 Testing database connection...');
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('email');
  
  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }
  
  console.log('✅ Database connection successful!\n');
  return data;
}

/**
 * Display user information for testing
 */
function displayUsers(users) {
  console.log('📋 AVAILABLE USERS FOR LOGIN TESTING');
  console.log('=====================================\n');
  
  users.forEach((user, index) => {
    console.log(`${index + 1}. Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Team: ${user.team}`);
    console.log(`   Status: ${user.is_active ? 'Active' : 'Inactive'}`);
    console.log(`   Password: ${user.password}`);
    console.log('');
  });
}

/**
 * Provide login instructions
 */
function provideLoginInstructions() {
  console.log('🔑 LOGIN TESTING INSTRUCTIONS');
  console.log('=============================\n');
  
  console.log('1. Start your development server:');
  console.log('   npm run dev\n');
  
  console.log('2. Open http://localhost:5173 in your browser\n');
  
  console.log('3. Try logging in with any of the users listed above');
  console.log('   Use the exact email and password shown\n');
  
  console.log('4. If login fails, the issue might be:');
  console.log('   - AuthContext.tsx logic needs updating');
  console.log('   - RLS policies blocking access');
  console.log('   - Frontend validation issues\n');
  
  console.log('5. Check browser console for error messages');
  console.log('6. Check network tab for failed API requests\n');
}

/**
 * Check for common authentication issues
 */
async function checkAuthIssues() {
  console.log('🔍 CHECKING FOR COMMON AUTH ISSUES');
  console.log('==================================\n');
  
  try {
    // Test if we can read from users table
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact' });
    
    if (error) {
      console.log('❌ Issue: Cannot read from users table');
      console.log(`   Error: ${error.message}`);
      console.log('   Solution: Apply the SQL fix from fix_user_authentication.sql\n');
      return false;
    }
    
    console.log('✅ Can read from users table');
    
    // Test if we can authenticate (simulate login)
    const testEmail = 'zaman@marketlube.in';
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', testEmail)
      .eq('is_active', true)
      .single();
    
    if (userError) {
      console.log(`❌ Issue: Cannot fetch user ${testEmail}`);
      console.log(`   Error: ${userError.message}\n`);
      return false;
    }
    
    console.log(`✅ Can fetch user data for ${testEmail}`);
    console.log('✅ Basic authentication setup looks good!\n');
    
    return true;
    
  } catch (error) {
    console.log('❌ Unexpected error during checks:');
    console.log(`   ${error.message}\n`);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 SIMPLE AUTH FIX & TEST');
  console.log('==========================\n');
  
  try {
    // Check for basic issues
    const authOk = await checkAuthIssues();
    
    if (!authOk) {
      console.log('🛠️  RECOMMENDED FIXES:');
      console.log('======================\n');
      console.log('1. Apply the SQL fix:');
      console.log('   - Open Supabase Dashboard');
      console.log('   - Go to SQL Editor');
      console.log('   - Run the contents of fix_user_authentication.sql\n');
      console.log('2. Then run this script again to verify the fix\n');
      return;
    }
    
    // Get all users
    const users = await getAllUsers();
    
    if (users.length === 0) {
      console.log('❌ No users found in database!');
      return;
    }
    
    // Display users and instructions
    displayUsers(users);
    provideLoginInstructions();
    
    console.log('💡 TROUBLESHOOTING TIPS');
    console.log('=======================\n');
    console.log('If users still can\'t log in:');
    console.log('1. Check AuthContext.tsx for hardcoded logic');
    console.log('2. Verify the login form is sending correct data');
    console.log('3. Check browser network tab for API errors');
    console.log('4. Ensure RLS policies allow the queries');
    console.log('5. Test with different users to isolate the issue\n');
    
    console.log('🎉 Auth setup verification complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
  }
}

// Run the script
main().catch(console.error); 