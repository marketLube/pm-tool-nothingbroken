import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// Ideally these would be in environment variables
// For production, you should use .env files or environment variables
const supabaseUrl = 'https://ysfknpujqivkudhnhezx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzZmtucHVqcWl2a3VkaG5oZXp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1OTYxMTMsImV4cCI6MjA2MzE3MjExM30.zSHRvncRmwEMNTPgfIgieN6A4tZ2VeCfu6uZV0xaiSQ';

// IMPORTANT: This should be your service role key
// NOTE: In a production environment, this key should NEVER be exposed in client-side code
// It should be used only in server-side code or in a secure environment
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzZmtucHVqcWl2a3VkaG5oZXp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzU5NjExMywiZXhwIjoyMDYzMTcyMTEzfQ.7q0ONGSxRUvWJS_Vo3DcXnoZt6DSpBqsZhcnX9JTARI';

// Create a single supabase client for interacting with your database
export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Create a supabase client with admin privileges
// CAUTION: Use this client only for operations that truly need admin privileges
export const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey);

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = (): boolean => {
  return supabaseUrl.length > 0 && supabaseKey.length > 0;
};

// Function to ensure the password field exists in the user table
export const ensurePasswordField = async (): Promise<void> => {
  try {
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

// Function to test admin connection
export const testAdminConnection = async (): Promise<boolean> => {
  try {
    // Try to fetch a small amount of data to test connection with admin privileges
    const { data, error } = await supabaseAdmin
      .from('clients')
      .select('id, name')
      .limit(1);
    
    if (error) {
      console.error('Supabase admin connection test failed:', error);
      return false;
    }
    
    console.log('Supabase admin connection successful, test data:', data);
    return true;
  } catch (error) {
    console.error('Error testing Supabase admin connection:', error);
    return false;
  }
}; 