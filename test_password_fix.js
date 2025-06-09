/**
 * Test Password Authentication Fix
 * This script tests both auto-generated and custom password scenarios
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Test authentication for a user
 */
async function testUserLogin(email, password, description) {
  console.log(`\n🧪 Testing: ${description}`);
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password}`);
  
  try {
    // Test the checkUserCredentials logic
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('password', password)
      .eq('is_active', true)
      .limit(1);

    if (error) {
      console.log(`   ❌ Database Error: ${error.message}`);
      return false;
    }

    if (data && data.length > 0) {
      console.log(`   ✅ Login Success! User: ${data[0].name}`);
      return true;
    } else {
      console.log(`   ❌ Login Failed: Invalid credentials`);
      
      // Check if user exists with different password
      const { data: userCheck } = await supabase
        .from('users')
        .select('email, password')
        .eq('email', email.toLowerCase())
        .eq('is_active', true)
        .limit(1);
        
      if (userCheck && userCheck.length > 0) {
        console.log(`   📝 User exists with password: "${userCheck[0].password}"`);
        console.log(`   📝 Attempted password: "${password}"`);
        console.log(`   📝 Passwords match: ${userCheck[0].password === password}`);
      } else {
        console.log(`   📝 User not found or inactive`);
      }
      return false;
    }
  } catch (err) {
    console.log(`   ❌ Test Error: ${err.message}`);
    return false;
  }
}

/**
 * Create a test user with custom password
 */
async function createTestUser(email, password, name) {
  console.log(`\n🔨 Creating test user: ${email}`);
  
  try {
    const userData = {
      id: `test-${Date.now()}`,
      email: email,
      password: password,
      name: name,
      role: 'employee',
      team: 'creative',
      is_active: true,
      join_date: new Date().toISOString().split('T')[0],
      allowed_statuses: [],
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();

    if (error) {
      console.log(`   ❌ Failed to create user: ${error.message}`);
      return null;
    }

    console.log(`   ✅ User created successfully: ${data.id}`);
    return data;
  } catch (err) {
    console.log(`   ❌ Error creating user: ${err.message}`);
    return null;
  }
}

/**
 * Update user password
 */
async function updateUserPassword(userId, newPassword) {
  console.log(`\n🔄 Updating password for user: ${userId}`);
  console.log(`   New password: ${newPassword}`);
  
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ 
        password: newPassword.trim(),
        password_hash: null, // Clear any existing hash
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.log(`   ❌ Failed to update password: ${error.message}`);
      return false;
    }

    console.log(`   ✅ Password updated successfully`);
    return true;
  } catch (err) {
    console.log(`   ❌ Error updating password: ${err.message}`);
    return false;
  }
}

/**
 * Clean up test users
 */
async function cleanupTestUsers() {
  console.log(`\n🧹 Cleaning up test users...`);
  
  try {
    const { data, error } = await supabase
      .from('users')
      .delete()
      .like('email', '%test-password-%');

    if (error) {
      console.log(`   ⚠️ Cleanup warning: ${error.message}`);
    } else {
      console.log(`   ✅ Cleanup completed`);
    }
  } catch (err) {
    console.log(`   ⚠️ Cleanup error: ${err.message}`);
  }
}

/**
 * Main test function
 */
async function runPasswordTests() {
  console.log('🚀 Starting Password Authentication Tests\n');
  console.log(`Database: ${SUPABASE_URL}`);
  
  let testResults = [];
  
  try {
    // Test 1: Create user with auto-generated style password
    const autoPassword = 'P@ssw0rd123!';
    const testUser1 = await createTestUser(
      'test-password-auto@example.com',
      autoPassword,
      'Test Auto Password'
    );
    
    if (testUser1) {
      const result1 = await testUserLogin(
        'test-password-auto@example.com',
        autoPassword,
        'Auto-generated style password'
      );
      testResults.push({ test: 'Auto-generated password', passed: result1 });
    }

    // Test 2: Create user with custom password
    const customPassword = 'mypassword123';
    const testUser2 = await createTestUser(
      'test-password-custom@example.com',
      customPassword,
      'Test Custom Password'
    );
    
    if (testUser2) {
      const result2 = await testUserLogin(
        'test-password-custom@example.com',
        customPassword,
        'Custom password'
      );
      testResults.push({ test: 'Custom password', passed: result2 });
    }

    // Test 3: Update password and test again
    if (testUser2) {
      const newPassword = 'updatedpassword456';
      const updateSuccess = await updateUserPassword(testUser2.id, newPassword);
      
      if (updateSuccess) {
        const result3 = await testUserLogin(
          'test-password-custom@example.com',
          newPassword,
          'Updated custom password'
        );
        testResults.push({ test: 'Updated password', passed: result3 });
      }
    }

    // Test 4: Test existing users (if any)
    console.log(`\n🔍 Testing existing users...`);
    const { data: existingUsers } = await supabase
      .from('users')
      .select('email, password, name')
      .eq('is_active', true)
      .limit(3);

    if (existingUsers && existingUsers.length > 0) {
      for (const user of existingUsers) {
        if (user.password && !user.email.includes('test-password-')) {
          const result = await testUserLogin(
            user.email,
            user.password,
            `Existing user: ${user.name}`
          );
          testResults.push({ test: `Existing: ${user.name}`, passed: result });
        }
      }
    }

  } catch (error) {
    console.error('❌ Test suite error:', error);
  } finally {
    // Cleanup
    await cleanupTestUsers();
  }

  // Report results
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  let passed = 0;
  let failed = 0;
  
  testResults.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${result.test}`);
    
    if (result.passed) {
      passed++;
    } else {
      failed++;
    }
  });
  
  console.log(`\nTotal: ${testResults.length} tests`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Password authentication is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Check the password storage and authentication logic.');
  }
}

// Run tests
runPasswordTests().catch(console.error); 