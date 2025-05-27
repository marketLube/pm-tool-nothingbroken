import { supabaseAdmin } from './supabase';

/**
 * Update admin credentials in the database
 * This script should be run once to update the admin user credentials
 */
export const updateAdminCredentials = async () => {
  try {
    console.log('Updating admin credentials in database...');
    
    // First, check if the admin user exists with the old email
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', 'althameem@marketlube.com')
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error checking for existing user:', fetchError);
      return false;
    }
    
    if (existingUser) {
      // Update the existing user
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          email: 'althameem@marketlube.in',
          password: 'Mark@99'
        })
        .eq('id', existingUser.id);
      
      if (updateError) {
        console.error('Error updating existing admin user:', updateError);
        return false;
      }
      
      console.log('Successfully updated existing admin user credentials');
      return true;
    }
    
    // Check if user already exists with new email
    const { data: newEmailUser, error: newEmailError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', 'althameem@marketlube.in')
      .single();
    
    if (newEmailError && newEmailError.code !== 'PGRST116') {
      console.error('Error checking for user with new email:', newEmailError);
      return false;
    }
    
    if (newEmailUser) {
      // Update password for existing user with new email
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          password: 'Mark@99'
        })
        .eq('id', newEmailUser.id);
      
      if (updateError) {
        console.error('Error updating password for existing user:', updateError);
        return false;
      }
      
      console.log('Successfully updated password for existing admin user');
      return true;
    }
    
    // Create new admin user if none exists
    const { error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: '53419fb2-9e21-40f1-8bcc-9e4575548523',
        name: 'Althameem',
        email: 'althameem@marketlube.in',
        role: 'admin',
        team: 'creative',
        join_date: '2023-01-01',
        avatar: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=150',
        is_active: true,
        password: 'Mark@99',
        allowed_statuses: [
          'not_started', 'scripting', 'script_confirmed', 'shoot_pending',
          'shoot_finished', 'edit_pending', 'client_approval', 'approved',
          'proposal_awaiting', 'ui_started', 'ui_finished', 'development_started', 
          'development_finished', 'testing', 'handed_over', 'client_reviewing', 
          'completed', 'in_progress', 'done'
        ]
      });
    
    if (insertError) {
      console.error('Error creating new admin user:', insertError);
      return false;
    }
    
    console.log('Successfully created new admin user with updated credentials');
    return true;
    
  } catch (error) {
    console.error('Unexpected error updating admin credentials:', error);
    return false;
  }
};

/**
 * Run the admin credentials update
 */
export const runAdminCredentialsUpdate = async () => {
  console.log('Starting admin credentials update...');
  const success = await updateAdminCredentials();
  
  if (success) {
    console.log('✅ Admin credentials update completed successfully');
    console.log('New admin login:');
    console.log('Email: althameem@marketlube.in');
    console.log('Password: Mark@99');
  } else {
    console.log('❌ Admin credentials update failed');
  }
  
  return success;
}; 