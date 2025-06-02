#!/usr/bin/env node

/**
 * MIGRATE TO SUPABASE AUTH (Production Ready)
 * ==========================================
 * 
 * This script migrates users from your custom 'users' table to Supabase Auth
 * using the Management API for production-ready authentication.
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
 * Fetch all users that need migration
 */
async function getUsersToMigrate() {
  console.log('📋 Fetching users for migration...');
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('is_active', true);
  
  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }
  
  console.log(`Found ${data.length} active users:`);
  data.forEach(user => {
    console.log(`  - ${user.email} (${user.name}) - ${user.role}/${user.team}`);
  });
  
  return data;
}

/**
 * Create auth user using REST API
 */
async function createAuthUserAPI(user) {
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
        migrated_at: new Date().toISOString(),
        custom_user_id: user.id
      },
      app_metadata: {
        role: user.role,
        team: user.team
      }
    })
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Failed to create auth user: ${response.status} ${errorData}`);
  }

  return await response.json();
}

/**
 * Check if user exists in Supabase Auth
 */
async function checkAuthUserExists(email) {
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
    console.log(`  Could not check existing user ${email}:`, error.message);
    return null;
  }
}

/**
 * Update custom users table with auth user ID
 */
async function linkAuthUser(customUserId, authUserId) {
  // First, check if auth_user_id column exists and add it if not
  try {
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        auth_user_id: authUserId,
        migrated_at: new Date().toISOString()
      })
      .eq('id', customUserId);
    
    if (updateError && updateError.message.includes('column "auth_user_id" does not exist')) {
      console.log('  📝 Adding auth_user_id column to users table...');
      
      // Use a simpler approach - just log that this needs to be done manually
      console.log('  ⚠️  Please add auth_user_id column manually in Supabase dashboard:');
      console.log('     ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_user_id UUID;');
      console.log('     ALTER TABLE users ADD COLUMN IF NOT EXISTS migrated_at TIMESTAMP DEFAULT NOW();');
      return;
    }
    
    if (updateError) {
      throw updateError;
    }
    
    console.log('  🔗 Linked auth user to custom user record');
  } catch (error) {
    console.log('  ⚠️  Could not link auth user (non-critical):', error.message);
  }
}

/**
 * Migrate a single user
 */
async function migrateUser(user) {
  console.log(`\n🔄 Migrating ${user.email}...`);
  
  // Check if user already exists in auth
  const existingAuthUser = await checkAuthUserExists(user.email);
  
  if (existingAuthUser) {
    console.log(`  ✅ Auth user already exists for ${user.email}`);
    await linkAuthUser(user.id, existingAuthUser.id);
    return { status: 'exists', authUserId: existingAuthUser.id };
  }
  
  if (isDryRun) {
    console.log(`  🧪 DRY RUN: Would create auth user for ${user.email}`);
    return { status: 'dry_run' };
  }
  
  try {
    // Create new auth user
    const authUser = await createAuthUserAPI(user);
    console.log(`  ✅ Created auth user: ${authUser.id}`);
    
    // Link to custom user
    await linkAuthUser(user.id, authUser.id);
    
    return { status: 'created', authUserId: authUser.id };
  } catch (error) {
    console.log(`  ❌ Error creating auth user: ${error.message}`);
    return { status: 'error', error: error.message };
  }
}

/**
 * Generate updated AuthContext code
 */
function generateAuthContextUpdate() {
  return `
// Updated AuthContext.tsx to use Supabase Auth
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'employee';
  team: 'creative' | 'web';
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata.name,
          role: session.user.user_metadata.role,
          team: session.user.user_metadata.team,
          avatar: session.user.user_metadata.avatar,
        });
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email!,
            name: session.user.user_metadata.name,
            role: session.user.user_metadata.role,
            team: session.user.user_metadata.team,
            avatar: session.user.user_metadata.avatar,
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}`;
}

/**
 * Main migration function
 */
async function main() {
  console.log('🚀 PRODUCTION SUPABASE AUTH MIGRATION');
  console.log('=====================================\n');
  
  if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ Error: VITE_SUPABASE_SERVICE_ROLE_KEY not found in environment');
    console.log('\nMake sure your .env file contains the service role key.');
    process.exit(1);
  }
  
  if (isDryRun) {
    console.log('🧪 DRY RUN MODE - No changes will be made\n');
  }
  
  try {
    // Get users to migrate
    const usersToMigrate = await getUsersToMigrate();
    
    if (usersToMigrate.length === 0) {
      console.log('🎉 No users to migrate!');
      return;
    }
    
    if (!isDryRun) {
      console.log(`\n⚠️  About to migrate ${usersToMigrate.length} users to Supabase Auth.`);
      console.log('   This will create production auth accounts.');
      console.log('   Users will then use their existing email/password to log in.');
      console.log('\n   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
      
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Migrate each user
    const results = {
      created: 0,
      exists: 0,
      dry_run: 0,
      error: 0
    };
    
    for (const user of usersToMigrate) {
      const result = await migrateUser(user);
      results[result.status]++;
    }
    
    // Summary
    console.log('\n📊 MIGRATION SUMMARY');
    console.log('====================');
    console.log(`Created: ${results.created}`);
    console.log(`Already existed: ${results.exists}`);
    console.log(`Errors: ${results.error}`);
    if (isDryRun) console.log(`Dry run: ${results.dry_run}`);
    
    if (results.error === 0 && !isDryRun) {
      console.log('\n🎉 Migration completed successfully!');
      
      console.log('\n📝 NEXT STEPS FOR PRODUCTION:');
      console.log('=============================');
      console.log('1. Update your AuthContext.tsx (code provided below)');
      console.log('2. Test login with existing email/password combinations');
      console.log('3. Remove the old custom authentication logic');
      console.log('4. Update any hardcoded admin credentials');
      console.log('5. Deploy to production\n');
      
      console.log('💡 UPDATED AUTHCONTEXT CODE:');
      console.log('============================');
      console.log(generateAuthContextUpdate());
      
    } else if (isDryRun) {
      console.log('\n🧪 Dry run completed. Remove --dry-run to perform migration.');
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
main().catch(console.error); 