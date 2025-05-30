import { supabase } from '../utils/supabase';
import { User } from '../types';

// Configuration for admin operations
const SUPABASE_URL = 'https://ysfknpujqivkudhnhezx.supabase.co';

/**
 * Get Supabase service role key from environment
 */
function getServiceRoleKey(): string {
  const key = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string;
  if (!key) {
    throw new Error('VITE_SUPABASE_SERVICE_ROLE_KEY not found in environment');
  }
  return key;
}

/**
 * Get auth user by email
 */
async function getAuthUser(email: string) {
  try {
    const serviceKey = getServiceRoleKey();
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey
      }
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.users && data.users.length > 0 ? data.users[0] : null;
  } catch (error) {
    console.error(`Could not fetch auth user ${email}:`, error);
    return null;
  }
}

/**
 * Update password in Supabase Auth
 */
async function updateAuthUserPassword(authUserId: string, newPassword: string, userData: User) {
  try {
    const serviceKey = getServiceRoleKey();
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${authUserId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'apikey': serviceKey
      },
      body: JSON.stringify({
        password: newPassword,
        user_metadata: {
          name: userData.name,
          role: userData.role,
          team: userData.team,
          avatar: userData.avatar,
          join_date: userData.joinDate,
          allowed_statuses: userData.allowedStatuses,
          custom_user_id: userData.id,
          updated_at: new Date().toISOString()
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to update auth user password: ${errorMessage}`);
  }
}

/**
 * Update user password in both custom table and Supabase Auth
 */
export async function updateUserPassword(user: User, newPassword: string): Promise<User> {
  console.log(`🔄 Updating password for: ${user.email}...`);

  try {
    // 1. Update password in custom table first
    console.log('  📝 Updating custom table password...');
    const { data, error } = await supabase
      .from('users')
      .update({ password: newPassword })
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update custom user password: ${error.message}`);
    }

    if (!data) {
      throw new Error('Failed to update user: No data returned');
    }

    console.log('  ✅ Custom table password updated');

    // 2. Update password in Supabase Auth
    console.log('  🔐 Checking auth user...');
    const authUser = await getAuthUser(user.email);
    
    if (!authUser) {
      console.log('  ⚠️  Auth user not found, skipping auth password update');
      return {
        ...user,
        password: newPassword
      };
    }

    console.log('  🔐 Updating auth password...');
    await updateAuthUserPassword(authUser.id, newPassword, {
      ...user,
      password: newPassword
    });

    console.log('  ✅ Auth password updated');
    console.log('  ✅ Password update completed successfully!');

    return {
      ...user,
      password: newPassword
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`  ❌ Error updating password: ${errorMessage}`);
    throw error instanceof Error ? error : new Error(errorMessage);
  }
}

/**
 * Test login with email and password
 */
export async function testLogin(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data.user) {
      // Sign out immediately after test
      await supabase.auth.signOut();
      return { success: true };
    }

    return { success: false, error: 'No user data returned' };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Create user in both custom table and Supabase Auth
 */
export async function createUserWithAuth(userData: Omit<User, 'id'>): Promise<User> {
  console.log(`🔄 Creating user with auth: ${userData.email}...`);

  try {
    // Generate UUID for custom table
    const customUserId = crypto.randomUUID();

    // 1. Create user in custom table first
    console.log('  📝 Creating custom user...');
    const { data: customUser, error: customError } = await supabase
      .from('users')
      .insert([{
        id: customUserId,
        name: userData.name,
        email: userData.email,
        team: userData.team,
        role: userData.role,
        password: userData.password,
        avatar: userData.avatar || null,
        join_date: userData.joinDate || new Date().toISOString().split('T')[0],
        is_active: userData.isActive !== undefined ? userData.isActive : true,
        allowed_statuses: userData.allowedStatuses || [],
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (customError) {
      throw new Error(`Failed to create custom user: ${customError.message}`);
    }

    if (!customUser) {
      throw new Error('Failed to create user: No data returned');
    }

    console.log('  ✅ Custom user created');

    // 2. Create user in Supabase Auth
    console.log('  🔐 Creating auth user...');
    try {
      const serviceKey = getServiceRoleKey();
      const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          'apikey': serviceKey
        },
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          email_confirm: true,
          user_metadata: {
            name: userData.name,
            role: userData.role,
            team: userData.team,
            avatar: userData.avatar,
            join_date: userData.joinDate,
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
        console.log(`  ⚠️  Auth user creation failed: ${response.status} ${errorData}`);
        console.log('  📝 Continuing with custom user only...');
      } else {
        console.log('  ✅ Auth user created');
      }
    } catch (authError: unknown) {
      const errorMessage = authError instanceof Error ? authError.message : 'Unknown error';
      console.log(`  ⚠️  Auth user creation failed: ${errorMessage}`);
      console.log('  📝 Continuing with custom user only...');
    }

    console.log('  ✅ User creation completed!');

    // Return the created user
    return {
      id: customUser.id,
      name: customUser.name,
      email: customUser.email,
      team: customUser.team,
      role: customUser.role,
      password: customUser.password,
      avatar: customUser.avatar,
      joinDate: customUser.join_date || customUser.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      isActive: customUser.is_active !== undefined ? customUser.is_active : true,
      allowedStatuses: customUser.allowed_statuses || []
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`  ❌ Error creating user: ${errorMessage}`);
    throw error instanceof Error ? error : new Error(errorMessage);
  }
} 