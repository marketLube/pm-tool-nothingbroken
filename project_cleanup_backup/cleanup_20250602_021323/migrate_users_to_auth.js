#!/usr/bin/env node

/**
 * MIGRATE USERS TO SUPABASE AUTH
 * =============================
 * 
 * This script migrates users from your custom 'users' table to Supabase Auth.
 * It creates proper auth accounts while preserving all user data and roles.
 * 
 * BEFORE RUNNING:
 * 1. Make sure you have SUPABASE_SERVICE_ROLE_KEY set
 * 2. Run the fix_user_authentication.sql script first
 * 3. Backup your database
 * 
 * USAGE:
 * node migrate_users_to_auth.js [--dry-run] [--force]
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const SUPABASE_URL = 'https://ysfknpujqivkudhnhezx.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY; // Updated to match .env file
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzZmtucHVqcWl2a3VkaG5oZXp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1OTYxMTMsImV4cCI6MjA2MzE3MjExM30.zSHRvncRmwEMNTPgfIgieN6A4tZ2VeCfu6uZV0xaiSQ';

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isForce = args.includes('--force');

// Initialize Supabase clients
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Fetch all users that need migration
 */
async function getUsersToMigrate() {
  console.log('📋 Fetching users that need migration...');
  
  const { data, error } = await supabaseAnon
    .from('users')
    .select('*')
    .eq('is_active', true)
    .neq('email', 'althameem@marketlube.in'); // Skip admin user
  
  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }
  
  console.log(`Found ${data.length} users that need migration:`);
  data.forEach(user => {
    console.log(`  - ${user.email} (${user.name}) - ${user.role}/${user.team}`);
  });
  
  return data;
}

/**
 * Check if user already exists in Supabase Auth
 */
async function checkExistingAuthUser(email) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserByEmail(email);
    
    if (error && error.message !== 'User not found') {
      throw error;
    }
    
    return data.user || null;
  } catch (error) {
    if (error.message.includes('User not found')) {
      return null;
    }
    throw error;
  }
}

/**
 * Create Supabase Auth user
 */
async function createAuthUser(user) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true, // Auto-confirm email
    user_metadata: {
      name: user.name,
      role: user.role,
      team: user.team,
      avatar: user.avatar,
      join_date: user.join_date,
      allowed_statuses: user.allowed_statuses,
      migrated_at: new Date().toISOString(),
      custom_user_id: user.id
    }
  });
  
  if (error) {
    throw new Error(`Failed to create auth user for ${user.email}: ${error.message}`);
  }
  
  return data.user;
}

/**
 * Update custom users table with auth ID
 */
async function linkAuthUser(customUserId, authUserId) {
  // Add auth_user_id column if it doesn't exist
  const { error: alterError } = await supabaseAdmin
    .rpc('exec_sql', {
      sql: `
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS auth_user_id UUID,
        ADD COLUMN IF NOT EXISTS migrated_at TIMESTAMP DEFAULT NOW();
      `
    });
  
  if (alterError) {
    console.warn('Could not alter table (might already exist):', alterError.message);
  }
  
  // Link the auth user to custom user
  const { error } = await supabaseAdmin
    .from('users')
    .update({ 
      auth_user_id: authUserId,
      migrated_at: new Date().toISOString()
    })
    .eq('id', customUserId);
  
  if (error) {
    throw new Error(`Failed to link auth user: ${error.message}`);
  }
}

/**
 * Migrate a single user
 */
async function migrateUser(user) {
  console.log(`\n🔄 Migrating ${user.email}...`);
  
  // Check if user already exists in auth
  const existingAuthUser = await checkExistingAuthUser(user.email);
  
  if (existingAuthUser) {
    console.log(`  ⚠️  Auth user already exists for ${user.email}`);
    
    if (!isForce) {
      console.log(`  ⏭️  Skipping (use --force to overwrite)`);
      return { status: 'skipped', reason: 'already_exists' };
    }
    
    console.log(`  🔄 Force mode: updating existing auth user...`);
    
    // Update existing user metadata
    const { error } = await supabaseAdmin.auth.admin.updateUserById(existingAuthUser.id, {
      user_metadata: {
        name: user.name,
        role: user.role,
        team: user.team,
        avatar: user.avatar,
        join_date: user.join_date,
        allowed_statuses: user.allowed_statuses,
        migrated_at: new Date().toISOString(),
        custom_user_id: user.id
      }
    });
    
    if (error) {
      throw error;
    }
    
    await linkAuthUser(user.id, existingAuthUser.id);
    console.log(`  ✅ Updated existing auth user`);
    return { status: 'updated', authUserId: existingAuthUser.id };
  }
  
  if (isDryRun) {
    console.log(`  🧪 DRY RUN: Would create auth user for ${user.email}`);
    return { status: 'dry_run' };
  }
  
  // Create new auth user
  const authUser = await createAuthUser(user);
  console.log(`  ✅ Created auth user: ${authUser.id}`);
  
  // Link to custom user
  await linkAuthUser(user.id, authUser.id);
  console.log(`  🔗 Linked to custom user record`);
  
  return { status: 'created', authUserId: authUser.id };
}

/**
 * Update AuthContext to use proper Supabase Auth
 */
async function updateAuthContext() {
  if (isDryRun) {
    console.log('\n🧪 DRY RUN: Would update AuthContext.tsx to use Supabase Auth');
    return;
  }
  
  console.log('\n📝 Would you like me to update AuthContext.tsx to use proper Supabase Auth?');
  console.log('   This will replace the custom authentication with standard Supabase Auth.');
  console.log('   (You should review and test this change carefully)');
  console.log('\n   For now, run this migration and test login manually.');
}

/**
 * Main migration function
 */
async function main() {
  console.log('🚀 USER MIGRATION TO SUPABASE AUTH');
  console.log('=====================================\n');
  
  if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    console.log('\nTo get your service role key:');
    console.log('1. Go to https://supabase.com/dashboard/project/ysfknpujqivkudhnhezx/settings/api');
    console.log('2. Copy the "service_role" key (starts with "eyJ...")');
    console.log('3. Set it as environment variable: export SUPABASE_SERVICE_ROLE_KEY="your_key_here"');
    console.log('4. Or add it to your .env file');
    process.exit(1);
  }
  
  if (isDryRun) {
    console.log('🧪 DRY RUN MODE - No changes will be made\n');
  }
  
  try {
    // Test connection
    console.log('🔌 Testing Supabase connection...');
    const { data: testData, error: testError } = await supabaseAnon
      .from('users')
      .select('count', { count: 'exact' })
      .limit(1);
    
    if (testError) {
      throw new Error(`Connection test failed: ${testError.message}`);
    }
    
    console.log('✅ Connection successful\n');
    
    // Get users to migrate
    const usersToMigrate = await getUsersToMigrate();
    
    if (usersToMigrate.length === 0) {
      console.log('🎉 No users need migration!');
      return;
    }
    
    if (!isDryRun && !isForce) {
      console.log(`\n⚠️  About to migrate ${usersToMigrate.length} users to Supabase Auth.`);
      console.log('   This will create auth accounts for each user.');
      console.log('   Add --dry-run to test without making changes.');
      console.log('   Add --force to overwrite existing auth users.');
      console.log('\n   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
      
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Migrate each user
    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0
    };
    
    for (const user of usersToMigrate) {
      try {
        const result = await migrateUser(user);
        results[result.status]++;
      } catch (error) {
        console.error(`  ❌ Error migrating ${user.email}:`, error.message);
        results.errors++;
      }
    }
    
    // Summary
    console.log('\n📊 MIGRATION SUMMARY');
    console.log('====================');
    console.log(`Created: ${results.created}`);
    console.log(`Updated: ${results.updated}`);
    console.log(`Skipped: ${results.skipped}`);
    console.log(`Errors: ${results.errors}`);
    
    if (results.errors === 0 && !isDryRun) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('\nNEXT STEPS:');
      console.log('1. Test login with migrated users');
      console.log('2. Update your AuthContext to use Supabase Auth (optional)');
      console.log('3. Remove hardcoded admin credentials from AuthContext');
      console.log('4. Consider updating password reset functionality');
    } else if (isDryRun) {
      console.log('\n🧪 Dry run completed. Use without --dry-run to perform migration.');
    }
    
    await updateAuthContext();
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the migration
main().catch(console.error); 