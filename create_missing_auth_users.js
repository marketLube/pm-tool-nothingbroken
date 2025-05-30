#!/usr/bin/env node

/**
 * CREATE MISSING AUTH USERS
 * =========================
 * 
 * This script creates all missing users in Supabase Auth properly
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const SUPABASE_URL = 'https://ysfknpujqivkudhnhezx.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

/**
 * Get all existing auth users
 */
async function getExistingAuthUsers() {
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
    const users = data.users || [];
    
    console.log(`📋 Found ${users.length} existing auth users:`);
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.user_metadata?.name || 'No name'})`);
    });
    
    return users.map(u => u.email.toLowerCase());
  } catch (error) {
    console.log('⚠️ Could not fetch existing auth users:', error.message);
    return [];
  }
}

/**
 * Get users from custom table
 */
async function getCustomUsers() {
  console.log('\n📋 Fetching users from custom table...');
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('is_active', true);
  
  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }
  
  console.log(`Found ${data.length} active users in custom table:`);
  data.forEach(user => {
    console.log(`  - ${user.email} (${user.name}) - ${user.role}/${user.team}`);
  });
  
  return data;
}

/**
 * Create auth user
 */
async function createAuthUser(user) {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY
      },
      body: JSON.stringify({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          name: user.name,
          role: user.role,
          team: user.team,
          avatar: user.avatar,
          join_date: user.join_date,
          allowed_statuses: user.allowed_statuses,
          custom_user_id: user.id,
          created_at: new Date().toISOString()
        },
        app_metadata: {
          role: user.role,
          team: user.team
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorData}`);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Failed to create auth user: ${error.message}`);
  }
}

/**
 * Update existing auth user
 */
async function updateAuthUser(email, userData) {
  try {
    // First get the user ID
    const getUserResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      }
    });

    if (!getUserResponse.ok) {
      throw new Error(`Failed to get user: ${getUserResponse.status}`);
    }

    const userData_response = await getUserResponse.json();
    const authUser = userData_response.users?.[0];
    
    if (!authUser) {
      throw new Error('User not found');
    }

    // Update the user
    const updateResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${authUser.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY
      },
      body: JSON.stringify({
        password: userData.password,
        user_metadata: {
          name: userData.name,
          role: userData.role,
          team: userData.team,
          avatar: userData.avatar,
          join_date: userData.join_date,
          allowed_statuses: userData.allowed_statuses,
          custom_user_id: userData.id,
          updated_at: new Date().toISOString()
        },
        app_metadata: {
          role: userData.role,
          team: userData.team
        }
      })
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.text();
      throw new Error(`HTTP ${updateResponse.status}: ${errorData}`);
    }

    return await updateResponse.json();
  } catch (error) {
    throw new Error(`Failed to update auth user: ${error.message}`);
  }
}

/**
 * Process a single user
 */
async function processUser(user, existingAuthEmails) {
  const email = user.email.toLowerCase();
  const exists = existingAuthEmails.includes(email);
  
  console.log(`\n🔄 Processing ${user.email}...`);
  
  if (exists) {
    console.log(`  📝 Updating existing auth user`);
    if (isDryRun) {
      console.log(`  🧪 DRY RUN: Would update auth user for ${user.email}`);
      return { status: 'dry_run_update' };
    }
    
    try {
      await updateAuthUser(user.email, user);
      console.log(`  ✅ Updated auth user for ${user.email}`);
      return { status: 'updated' };
    } catch (error) {
      console.log(`  ❌ Failed to update: ${error.message}`);
      return { status: 'update_error', error: error.message };
    }
  } else {
    console.log(`  🆕 Creating new auth user`);
    if (isDryRun) {
      console.log(`  🧪 DRY RUN: Would create auth user for ${user.email}`);
      return { status: 'dry_run_create' };
    }
    
    try {
      const authUser = await createAuthUser(user);
      console.log(`  ✅ Created auth user: ${authUser.id}`);
      return { status: 'created', authUserId: authUser.id };
    } catch (error) {
      console.log(`  ❌ Failed to create: ${error.message}`);
      return { status: 'create_error', error: error.message };
    }
  }
}

/**
 * Test auth login
 */
async function testAuthLogin(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data.user) {
      await supabase.auth.signOut();
      return { 
        success: true, 
        user: {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name,
          role: data.user.user_metadata?.role,
          team: data.user.user_metadata?.team
        }
      };
    }

    return { success: false, error: 'No user returned' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 CREATE MISSING SUPABASE AUTH USERS');
  console.log('=====================================\n');
  
  if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ Error: VITE_SUPABASE_SERVICE_ROLE_KEY not found in environment');
    process.exit(1);
  }
  
  if (isDryRun) {
    console.log('🧪 DRY RUN MODE - No changes will be made\n');
  }
  
  try {
    // Get existing auth users
    const existingAuthEmails = await getExistingAuthUsers();
    
    // Get custom users
    const customUsers = await getCustomUsers();
    
    if (customUsers.length === 0) {
      console.log('❌ No users found in custom table!');
      return;
    }
    
    console.log(`\n📊 COMPARISON:`);
    console.log(`Custom table users: ${customUsers.length}`);
    console.log(`Auth users: ${existingAuthEmails.length}`);
    console.log(`Missing in auth: ${customUsers.length - existingAuthEmails.length}\n`);
    
    if (!isDryRun) {
      console.log(`⚠️  About to process ${customUsers.length} users.`);
      console.log('   This will create missing auth users and update existing ones.');
      console.log('\n   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
      
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Process each user
    const results = {
      created: 0,
      updated: 0,
      dry_run_create: 0,
      dry_run_update: 0,
      create_error: 0,
      update_error: 0
    };
    
    for (const user of customUsers) {
      const result = await processUser(user, existingAuthEmails);
      results[result.status]++;
    }
    
    // Summary
    console.log('\n📊 PROCESSING SUMMARY');
    console.log('=====================');
    console.log(`Created: ${results.created}`);
    console.log(`Updated: ${results.updated}`);
    console.log(`Create errors: ${results.create_error}`);
    console.log(`Update errors: ${results.update_error}`);
    if (isDryRun) {
      console.log(`Dry run - would create: ${results.dry_run_create}`);
      console.log(`Dry run - would update: ${results.dry_run_update}`);
    }
    
    if ((results.created > 0 || results.updated > 0) && !isDryRun) {
      console.log('\n🎉 Auth user processing completed!');
      
      // Test a few logins
      console.log('\n🧪 Testing authentication...');
      const testUsers = customUsers.slice(0, 5); // Test first 5 users
      
      let successCount = 0;
      for (const user of testUsers) {
        const result = await testAuthLogin(user.email, user.password);
        if (result.success) {
          console.log(`  ✅ ${user.email}: Login works!`);
          console.log(`     Name: ${result.user.name}, Role: ${result.user.role}, Team: ${result.user.team}`);
          successCount++;
        } else {
          console.log(`  ❌ ${user.email}: ${result.error}`);
        }
      }
      
      console.log(`\n📊 Login test: ${successCount}/${testUsers.length} successful`);
      
      if (successCount === testUsers.length) {
        console.log('\n🎉 ALL TESTS PASSED! Your users are ready for production!');
        console.log('\n📝 NEXT STEPS:');
        console.log('==============');
        console.log('1. Update your AuthContext.tsx to use Supabase Auth');
        console.log('2. Remove old custom authentication logic');  
        console.log('3. Test in your application');
        console.log('4. Deploy to production');
      }
      
    } else if (isDryRun) {
      console.log('\n🧪 Dry run completed. Remove --dry-run to perform actual processing.');
    }
    
  } catch (error) {
    console.error('\n❌ Processing failed:', error.message);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error); 