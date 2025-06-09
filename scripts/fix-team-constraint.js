#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://ysfknpujqivkudhnhezx.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzZmtucHVqcWl2a3VkaG5oZXp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzU5NjExMywiZXhwIjoyMDYzMTcyMTEzfQ.7q0ONGSxRUvWJS_Vo3DcXnoZt6DSpBqsZhcnX9JTARI';

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function fixTeamConstraint() {
  console.log('🔧 Fixing users_team_check constraint...');
  
  try {
    // Drop the existing constraint
    console.log('🗑️  Dropping existing constraint...');
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE users DROP CONSTRAINT IF EXISTS users_team_check;'
    });
    
    if (dropError) {
      console.log('⚠️  Could not drop constraint (might not exist):', dropError.message);
    } else {
      console.log('✅ Dropped existing constraint');
    }
    
    // Add the new constraint that includes 'all'
    console.log('➕ Adding new constraint with "all" team support...');
    const { error: addError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE users ADD CONSTRAINT users_team_check 
            CHECK (team IN ('creative', 'web', 'all'));`
    });
    
    if (addError) {
      console.error('❌ Error adding new constraint:', addError.message);
      console.log('\n💡 Alternative approach: You can run this SQL manually in your Supabase SQL editor:');
      console.log('   1. Go to https://ysfknpujqivkudhnhezx.supabase.co/project/default/sql');
      console.log('   2. Run: ALTER TABLE users DROP CONSTRAINT IF EXISTS users_team_check;');
      console.log('   3. Run: ALTER TABLE users ADD CONSTRAINT users_team_check CHECK (team IN (\'creative\', \'web\', \'all\'));');
      return;
    }
    
    console.log('✅ Successfully updated users_team_check constraint!');
    console.log('📝 Valid team values are now: creative, web, all');
    
    // Test the fix by checking if we can query admins
    console.log('\n🧪 Testing the fix...');
    const { data: admins, error: testError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'admin');
    
    if (testError) {
      console.error('❌ Error testing:', testError);
    } else {
      console.log(`✅ Found ${admins.length} admin users`);
      admins.forEach(admin => {
        console.log(`   - ${admin.full_name} (${admin.email}) - Team: ${admin.team}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting team constraint fix...');
  console.log('🔗 Connecting to Supabase...');
  
  // Test connection first
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .limit(1);
  
  if (error) {
    console.error('❌ Connection failed:', error);
    return;
  }
  
  console.log('✅ Connected to database successfully!');
  
  await fixTeamConstraint();
}

// Run the script
main().catch(console.error); 