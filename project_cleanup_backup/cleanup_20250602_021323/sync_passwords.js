#!/usr/bin/env node

/**
 * SYNC PASSWORDS TO SUPABASE AUTH
 * ===============================
 * 
 * This script updates Supabase Auth user passwords to match your custom users table
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
 * Get users from custom table
 */
async function getCustomUsers() {
  console.log('📋 Fetching users from custom table...');
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('is_active', true);
  
  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }
  
  console.log(`Found ${data.length} active users to sync:`);
  data.forEach(user => {
    console.log(`  - ${user.email} (password: ${user.password})`);
  });
  
  return data;
}

/**
 * Get auth user by email
 */
async function getAuthUser(email) {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      }
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.users && data.users.length > 0 ? data.users[0] : null;
  } catch (error) {
    console.log(`  Could not fetch auth user ${email}:`, error.message);
    return null;
  }
}

/**
 * Update auth user password
 */
async function updateAuthUserPassword(authUserId, newPassword, userData) {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${authUserId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY
      },
      body: JSON.stringify({
        password: newPassword,
        user_metadata: {
          name: userData.name,
          role: userData.role,
          team: userData.team,
          avatar: userData.avatar,
          join_date: userData.join_date,
          allowed_statuses: userData.allowed_statuses,
          custom_user_id: userData.id,
          synced_at: new Date().toISOString()
        },
        app_metadata: {
          role: userData.role,
          team: userData.team
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to update user: ${response.status} ${errorData}`);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Failed to update password for user: ${error.message}`);
  }
}

/**
 * Sync a single user
 */
async function syncUser(user) {
  console.log(`\n🔄 Syncing ${user.email}...`);
  
  // Get auth user
  const authUser = await getAuthUser(user.email);
  
  if (!authUser) {
    console.log(`  ❌ Auth user not found for ${user.email}`);
    return { status: 'not_found' };
  }
  
  if (isDryRun) {
    console.log(`  🧪 DRY RUN: Would update password for ${user.email}`);
    console.log(`     New password: ${user.password}`);
    return { status: 'dry_run' };
  }
  
  try {
    await updateAuthUserPassword(authUser.id, user.password, user);
    console.log(`  ✅ Password updated for ${user.email}`);
    console.log(`     Password: ${user.password}`);
    return { status: 'updated' };
  } catch (error) {
    console.log(`  ❌ Failed to update ${user.email}: ${error.message}`);
    return { status: 'error', error: error.message };
  }
}

/**
 * Test login after sync
 */
async function testLoginAfterSync(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return false;
    }

    if (data.user) {
      await supabase.auth.signOut();
      return true;
    }

    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 SYNC PASSWORDS TO SUPABASE AUTH');
  console.log('==================================\n');
  
  if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ Error: VITE_SUPABASE_SERVICE_ROLE_KEY not found in environment');
    process.exit(1);
  }
  
  if (isDryRun) {
    console.log('🧪 DRY RUN MODE - No changes will be made\n');
  }
  
  try {
    // Get users to sync
    const users = await getCustomUsers();
    
    if (users.length === 0) {
      console.log('🎉 No users to sync!');
      return;
    }
    
    if (!isDryRun) {
      console.log(`\n⚠️  About to update passwords for ${users.length} users in Supabase Auth.`);
      console.log('   This will sync the passwords from your custom users table.');
      console.log('\n   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
      
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Sync each user
    const results = {
      updated: 0,
      not_found: 0,
      dry_run: 0,
      error: 0
    };
    
    for (const user of users) {
      const result = await syncUser(user);
      results[result.status]++;
    }
    
    // Summary
    console.log('\n📊 SYNC SUMMARY');
    console.log('================');
    console.log(`Updated: ${results.updated}`);
    console.log(`Not found: ${results.not_found}`);
    console.log(`Errors: ${results.error}`);
    if (isDryRun) console.log(`Dry run: ${results.dry_run}`);
    
    if (results.error === 0 && !isDryRun && results.updated > 0) {
      console.log('\n🎉 Password sync completed successfully!');
      
      // Test a few logins
      console.log('\n🧪 Testing login with synced passwords...');
      const testUsers = users.slice(0, 3); // Test first 3 users
      
      for (const user of testUsers) {
        const success = await testLoginAfterSync(user.email, user.password);
        console.log(`  ${success ? '✅' : '❌'} ${user.email}: ${success ? 'Login works!' : 'Login failed'}`);
      }
      
      console.log('\n📝 WHAT\'S NEXT:');
      console.log('===============');
      console.log('1. ✅ Your users are now ready for Supabase Auth');
      console.log('2. Update your AuthContext.tsx to use Supabase Auth (code provided earlier)');
      console.log('3. Test the new authentication in your application');
      console.log('4. Remove the old custom authentication logic');
      console.log('5. Deploy to production!');
      
    } else if (isDryRun) {
      console.log('\n🧪 Dry run completed. Remove --dry-run to perform sync.');
    }
    
  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    process.exit(1);
  }
}

// Run the sync
main().catch(console.error); 