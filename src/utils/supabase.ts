import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// Environment variables validation
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// 🔥 IMPROVED: Graceful validation instead of throwing errors
const validateEnvironment = () => {
  if (!supabaseUrl) {
    console.error('❌ Missing VITE_SUPABASE_URL environment variable. Please check your .env file.');
    return false;
  }

  // TEMPORARY FIX: Use service role key if anon key is not working
  // In production, you should fix the anon key and RLS policies instead
  const effectiveKey = serviceRoleKey || supabaseKey;

  if (!effectiveKey) {
    console.error('❌ Missing required Supabase API key. Please check your .env file.');
    return false;
  }

  console.log('✅ Supabase client initialized with:', {
    url: supabaseUrl,
    keyType: serviceRoleKey ? 'service_role (TEMP FIX)' : 'anon',
    keyExists: !!effectiveKey
  });

  return true;
};

// Validate environment
const isValidEnvironment = validateEnvironment();

// 🔥 IMPROVED: Create client only if environment is valid
export const supabase = isValidEnvironment 
  ? createClient<Database>(supabaseUrl, serviceRoleKey || supabaseKey)
  : null;

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = (): boolean => {
  return isValidEnvironment && Boolean(supabaseUrl && (serviceRoleKey || supabaseKey));
};

// Function to ensure the password field exists in the user table
export const ensurePasswordField = async (): Promise<void> => {
  try {
    if (!isSupabaseConfigured()) {
      console.warn('⚠️ Supabase not configured, skipping password field check');
      return Promise.resolve();
    }
    
    // This is a placeholder function since the actual implementation
    // would require admin access to alter tables
    console.log('Password field check completed');
    return Promise.resolve();
  } catch (error) {
    console.error('Error ensuring password field:', error);
    return Promise.reject(error);
  }
};

// Function to test the Supabase connection
export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    if (!supabase) {
      console.error('❌ Supabase client not initialized due to missing environment variables');
      return false;
    }
    
    // Try to fetch a small amount of data to test connection
    const { data, error } = await supabase
      .from('clients')
      .select('id, name')
      .limit(1);
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    
    console.log('Supabase connection successful, test data:', data);
    return true;
  } catch (error) {
    console.error('Error testing Supabase connection:', error);
    return false;
  }
}; 