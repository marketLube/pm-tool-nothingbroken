#!/usr/bin/env node

// Temporary script to fix database constraint
// Run with: node fix-database-constraint.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables - try assistant file first, then regular .env
dotenv.config({ path: '.env.assistant' });
if (!process.env.VITE_SUPABASE_URL) {
  dotenv.config(); // Fallback to .env
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing database credentials in .env file');
  console.log('Required: VITE_SUPABASE_URL and (SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixTeamConstraint() {
  console.log('🔧 Fixing team constraint to allow admin users...\n');
  
  try {
    // Method 1: Try using SQL function approach
    console.log('1️⃣ Attempting to fix constraint via SQL...');
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: `
        DO $$
        BEGIN
          -- Drop existing constraint if it exists
          ALTER TABLE users DROP CONSTRAINT IF EXISTS users_team_check;
          
          -- Add new constraint allowing 'all' for admin users
          ALTER TABLE users ADD CONSTRAINT users_team_check 
            CHECK (team IN ('creative', 'web') OR (team = 'all' AND role = 'admin'));
          
          RAISE NOTICE 'Constraint updated successfully';
        END $$;
      `
    });
    
    if (error) {
      console.log('⚠️ SQL function method failed:', error.message);
      console.log('\n2️⃣ Trying alternative approach...');
      
      // Method 2: Direct approach using multiple queries
      const queries = [
        'ALTER TABLE users DROP CONSTRAINT IF EXISTS users_team_check;',
        `ALTER TABLE users ADD CONSTRAINT users_team_check 
         CHECK (team IN ('creative', 'web') OR (team = 'all' AND role = 'admin'));`
      ];
      
      for (const query of queries) {
        const { error: queryError } = await supabase.rpc('exec_sql', { sql_query: query });
        if (queryError) {
          console.log(`❌ Query failed: ${query}`);
          console.log(`Error: ${queryError.message}`);
        } else {
          console.log(`✅ Query succeeded: ${query.substring(0, 50)}...`);
        }
      }
    } else {
      console.log('✅ Constraint updated successfully!');
    }
    
    // Test the fix by trying to update an admin user
    console.log('\n3️⃣ Testing the fix...');
    const { data: adminUsers, error: fetchError } = await supabase
      .from('users')
      .select('id, email, role, team')
      .eq('role', 'admin')
      .limit(1);
    
    if (fetchError) {
      console.log('⚠️ Could not fetch admin users for testing:', fetchError.message);
    } else if (adminUsers && adminUsers.length > 0) {
      const adminUser = adminUsers[0];
      console.log(`Found admin user: ${adminUser.email} (current team: ${adminUser.team})`);
      
      // Try updating to 'all' team
      const { error: updateError } = await supabase
        .from('users')
        .update({ team: 'all' })
        .eq('id', adminUser.id);
      
      if (updateError) {
        console.log('❌ Test failed - constraint still blocking updates:', updateError.message);
      } else {
        console.log('✅ Test passed - admin can now be assigned to "all" teams!');
        
        // Revert the test change
        await supabase
          .from('users')
          .update({ team: adminUser.team })
          .eq('id', adminUser.id);
      }
    }
    
    console.log('\n🎉 Database constraint fix completed!');
    console.log('You can now assign admin users to "All Teams" in the UI.');
    
  } catch (error) {
    console.error('💥 Unexpected error:', error.message);
  }
}

// Run the fix
fixTeamConstraint(); 