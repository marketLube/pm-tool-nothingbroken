#!/usr/bin/env node

/**
 * CREATE NEW USER
 * ===============
 * 
 * This script creates a new user in both your custom users table and Supabase Auth
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const SUPABASE_URL = 'https://ysfknpujqivkudhnhezx.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Generate a UUID (simple version)
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Create user in custom table
 */
async function createCustomUser(userData) {
  const customUserData = {
    id: generateUUID(),
    email: userData.email,
    name: userData.name,
    password: userData.password,
    role: userData.role,
    team: userData.team,
    join_date: new Date().toISOString().split('T')[0],
    allowed_statuses: userData.allowedStatuses,
    avatar_url: userData.avatarUrl || null,
    is_active: true,
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('users')
    .insert([customUserData])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create custom user: ${error.message}`);
  }

  return data;
}

/**
 * Create user in Supabase Auth
 */
async function createAuthUser(userData, customUserId) {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY
      },
      body: JSON.stringify({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          name: userData.name,
          role: userData.role,
          team: userData.team,
          avatar_url: userData.avatarUrl,
          join_date: new Date().toISOString().split('T')[0],
          allowed_statuses: userData.allowedStatuses,
          custom_user_id: customUserId,
          created_at: new Date().toISOString()
        },
        app_metadata: {
          role: userData.role,
          team: userData.team
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
 * Test login with new user
 */
async function testNewUserLogin(email, password) {
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
      return { success: true, user: data.user };
    }

    return { success: false, error: 'No user returned' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Create a complete user (custom table + auth)
 */
async function createCompleteUser(userData) {
  console.log(`🔄 Creating user: ${userData.email}...`);

  try {
    // 1. Create in custom table first
    console.log('  📝 Creating user in custom table...');
    const customUser = await createCustomUser(userData);
    console.log(`  ✅ Custom user created with ID: ${customUser.id}`);

    // 2. Create in Supabase Auth
    console.log('  🔐 Creating user in Supabase Auth...');
    const authUser = await createAuthUser(userData, customUser.id);
    console.log(`  ✅ Auth user created with ID: ${authUser.id}`);

    // 3. Test login
    console.log('  🧪 Testing login...');
    const loginTest = await testNewUserLogin(userData.email, userData.password);
    
    if (loginTest.success) {
      console.log('  ✅ Login test successful!');
    } else {
      console.log(`  ⚠️  Login test failed: ${loginTest.error}`);
    }

    return {
      success: true,
      customUser,
      authUser,
      loginWorks: loginTest.success
    };

  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Interactive user creation
 */
async function interactiveCreate() {
  console.log('🚀 INTERACTIVE USER CREATION');
  console.log('============================\n');

  // Get user input (in a real app, this would come from a form)
  const userData = {
    email: process.argv[2] || 'test@example.com',
    name: process.argv[3] || 'Test User',
    password: process.argv[4] || 'password123',
    role: process.argv[5] || 'employee',  // admin, manager, employee
    team: process.argv[6] || 'creative',   // creative, web
    avatarUrl: process.argv[7] || null,
    allowedStatuses: process.argv[8] ? process.argv[8].split(',') : ['not_started','scripting','script_confirmed','shoot_pending','shoot_finished','edit_pending','client_approval','approved']
  };

  console.log('📋 User data to create:');
  console.log(`  Email: ${userData.email}`);
  console.log(`  Name: ${userData.name}`);
  console.log(`  Password: ${userData.password}`);
  console.log(`  Role: ${userData.role}`);
  console.log(`  Team: ${userData.team}`);
  console.log('');

  // Validate required fields
  if (!userData.email || !userData.name || !userData.password) {
    console.error('❌ Error: Email, name, and password are required');
    console.log('\nUsage: node create_new_user.js <email> <name> <password> [role] [team] [avatarUrl] [allowedStatuses]');
    console.log('Example: node create_new_user.js john@example.com "John Doe" securepass123 manager web');
    process.exit(1);
  }

  // Validate role and team
  const validRoles = ['admin', 'manager', 'employee'];
  const validTeams = ['creative', 'web'];

  if (!validRoles.includes(userData.role)) {
    console.error(`❌ Error: Role must be one of: ${validRoles.join(', ')}`);
    process.exit(1);
  }

  if (!validTeams.includes(userData.team)) {
    console.error(`❌ Error: Team must be one of: ${validTeams.join(', ')}`);
    process.exit(1);
  }

  try {
    const result = await createCompleteUser(userData);

    if (result.success) {
      console.log('\n🎉 USER CREATED SUCCESSFULLY!');
      console.log('=============================');
      console.log(`Email: ${userData.email}`);
      console.log(`Password: ${userData.password}`);
      console.log(`Custom User ID: ${result.customUser.id}`);
      console.log(`Auth User ID: ${result.authUser.id}`);
      console.log(`Login Works: ${result.loginWorks ? 'Yes' : 'No'}`);
      console.log('\n💡 User can now log in to your application!');
    } else {
      console.log('\n❌ USER CREATION FAILED');
      console.log('=======================');
      console.log(`Error: ${result.error}`);
    }

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

// Check if service key is available
if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: VITE_SUPABASE_SERVICE_ROLE_KEY not found in environment');
  process.exit(1);
}

// Run interactive creation
interactiveCreate().catch(console.error); 