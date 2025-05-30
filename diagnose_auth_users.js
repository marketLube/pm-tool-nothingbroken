#!/usr/bin/env node

/**
 * DIAGNOSE SUPABASE AUTH USERS
 * ============================
 * 
 * This script lists all users in Supabase Auth and shows their details
 */

import dotenv from 'dotenv';

dotenv.config();

// Configuration
const SUPABASE_URL = 'https://ysfknpujqivkudhnhezx.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

/**
 * Get all auth users
 */
async function getAllAuthUsers() {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    return data.users || [];
  } catch (error) {
    throw new Error(`Failed to get auth users: ${error.message}`);
  }
}

/**
 * Display user details
 */
function displayUser(user, index) {
  console.log(`\n${index + 1}. AUTH USER: ${user.email}`);
  console.log(`   ID: ${user.id}`);
  console.log(`   Created: ${user.created_at}`);
  console.log(`   Email confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
  console.log(`   Last sign in: ${user.last_sign_in_at || 'Never'}`);
  
  console.log('\n   USER METADATA:');
  if (user.user_metadata && Object.keys(user.user_metadata).length > 0) {
    Object.entries(user.user_metadata).forEach(([key, value]) => {
      console.log(`     ${key}: ${value}`);
    });
  } else {
    console.log('     (No user metadata)');
  }
  
  console.log('\n   APP METADATA:');
  if (user.app_metadata && Object.keys(user.app_metadata).length > 0) {
    Object.entries(user.app_metadata).forEach(([key, value]) => {
      console.log(`     ${key}: ${value}`);
    });
  } else {
    console.log('     (No app metadata)');
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 SUPABASE AUTH USERS DIAGNOSIS');
  console.log('================================\n');
  
  if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ Error: VITE_SUPABASE_SERVICE_ROLE_KEY not found in environment');
    process.exit(1);
  }
  
  try {
    console.log('📋 Fetching all Supabase Auth users...\n');
    
    const authUsers = await getAllAuthUsers();
    
    if (authUsers.length === 0) {
      console.log('❌ No users found in Supabase Auth!');
      return;
    }
    
    console.log(`Found ${authUsers.length} users in Supabase Auth:`);
    console.log('='.repeat(50));
    
    authUsers.forEach((user, index) => {
      displayUser(user, index);
    });
    
    console.log('\n💡 ANALYSIS');
    console.log('============');
    console.log(`Total auth users: ${authUsers.length}`);
    
    const confirmedEmails = authUsers.filter(u => u.email_confirmed_at).length;
    console.log(`Email confirmed: ${confirmedEmails}/${authUsers.length}`);
    
    const withMetadata = authUsers.filter(u => u.user_metadata && Object.keys(u.user_metadata).length > 0).length;
    console.log(`Users with metadata: ${withMetadata}/${authUsers.length}`);
    
    const recentSignIns = authUsers.filter(u => u.last_sign_in_at).length;
    console.log(`Users who signed in: ${recentSignIns}/${authUsers.length}`);
    
  } catch (error) {
    console.error('\n❌ Diagnosis failed:', error.message);
    process.exit(1);
  }
}

// Run the diagnosis
main().catch(console.error); 