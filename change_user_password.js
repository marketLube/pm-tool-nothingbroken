#!/usr/bin/env node

/**
 * CHANGE USER PASSWORD
 * ====================
 * 
 * This script changes a user's password in both your custom users table and Supabase Auth
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
 * Get user from custom table
 */
async function getCustomUser(email) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // No rows returned
    }
    throw new Error(`Failed to fetch user: ${error.message}`);
  }

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
 * Update password in custom table
 */
async function updateCustomUserPassword(email, newPassword) {
  const { error } = await supabase
    .from('users')
    .update({ 
      password: newPassword
    })
    .eq('email', email);

  if (error) {
    throw new Error(`Failed to update custom user password: ${error.message}`);
  }
}

/**
 * Update password in Supabase Auth
 */
async function updateAuthUserPassword(authUserId, newPassword) {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${authUserId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY
      },
      body: JSON.stringify({
        password: newPassword
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorData}`);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Failed to update auth user password: ${error.message}`);
  }
}

/**
 * Test login with new password
 */
async function testPasswordLogin(email, password) {
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
 * Change user password completely
 */
async function changeUserPassword(email, newPassword) {
  console.log(`🔄 Changing password for: ${email}...`);

  try {
    // 1. Check if user exists in custom table
    console.log('  📋 Checking custom user...');
    const customUser = await getCustomUser(email);
    
    if (!customUser) {
      throw new Error('User not found in custom table');
    }
    
    console.log(`  ✅ Found custom user: ${customUser.name} (${customUser.role}/${customUser.team})`);

    // 2. Check if user exists in auth
    console.log('  🔐 Checking auth user...');
    const authUser = await getAuthUser(email);
    
    if (!authUser) {
      throw new Error('User not found in Supabase Auth');
    }
    
    console.log(`  ✅ Found auth user: ${authUser.id}`);

    // 3. Update custom table password
    console.log('  📝 Updating custom table password...');
    await updateCustomUserPassword(email, newPassword);
    console.log('  ✅ Custom table password updated');

    // 4. Update auth password
    console.log('  🔐 Updating auth password...');
    await updateAuthUserPassword(authUser.id, newPassword);
    console.log('  ✅ Auth password updated');

    // 5. Test login
    console.log('  🧪 Testing new password...');
    const loginTest = await testPasswordLogin(email, newPassword);
    
    if (loginTest.success) {
      console.log('  ✅ Password test successful!');
    } else {
      console.log(`  ⚠️  Password test failed: ${loginTest.error}`);
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
 * Interactive password change
 */
async function interactivePasswordChange() {
  console.log('🚀 INTERACTIVE PASSWORD CHANGE');
  console.log('==============================\n');

  // Get input from command line arguments
  const email = process.argv[2];
  const newPassword = process.argv[3];

  console.log('📋 Password change request:');
  console.log(`  Email: ${email || 'Not provided'}`);
  console.log(`  New Password: ${newPassword || 'Not provided'}`);
  console.log('');

  // Validate required fields
  if (!email || !newPassword) {
    console.error('❌ Error: Email and new password are required');
    console.log('\nUsage: node change_user_password.js <email> <new_password>');
    console.log('Example: node change_user_password.js john@example.com newSecurePass123');
    process.exit(1);
  }

  // Basic email validation
  if (!email.includes('@') || !email.includes('.')) {
    console.error('❌ Error: Please provide a valid email address');
    process.exit(1);
  }

  // Basic password validation
  if (newPassword.length < 6) {
    console.error('❌ Error: Password must be at least 6 characters long');
    process.exit(1);
  }

  try {
    const result = await changeUserPassword(email, newPassword);

    if (result.success) {
      console.log('\n🎉 PASSWORD CHANGED SUCCESSFULLY!');
      console.log('=================================');
      console.log(`Email: ${email}`);
      console.log(`New Password: ${newPassword}`);
      console.log(`User: ${result.customUser.name} (${result.customUser.role}/${result.customUser.team})`);
      console.log(`Login Works: ${result.loginWorks ? 'Yes' : 'No'}`);
      console.log('\n💡 User can now log in with the new password!');
    } else {
      console.log('\n❌ PASSWORD CHANGE FAILED');
      console.log('=========================');
      console.log(`Error: ${result.error}`);
      
      if (result.error.includes('not found')) {
        console.log('\n💡 Tips:');
        console.log('- Check that the email address is correct');
        console.log('- Ensure the user exists and is active');
        console.log('- Run "node simple_auth_fix.js" to see all available users');
      }
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

// Run interactive password change
interactivePasswordChange().catch(console.error); 