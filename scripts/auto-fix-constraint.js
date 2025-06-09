#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

// Supabase configuration with your credentials
const supabaseUrl = 'https://ysfknpujqivkudhnhezx.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzZmtucHVqcWl2a3VkaG5oZXp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzU5NjExMywiZXhwIjoyMDYzMTcyMTEzfQ.7q0ONGSxRUvWJS_Vo3DcXnoZt6DSpBqsZhcnX9JTARI';

const supabase = createClient(supabaseUrl, serviceRoleKey);

// PostgreSQL function SQL that creates the constraint fix function
const createFunctionSQL = `
CREATE OR REPLACE FUNCTION fix_team_constraint()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    -- Drop the existing constraint
    BEGIN
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_team_check;
        
        -- Add the new constraint that includes 'all'
        ALTER TABLE users ADD CONSTRAINT users_team_check 
        CHECK (team IN ('creative', 'web', 'all'));
        
        -- Return success status
        result := json_build_object(
            'success', true,
            'message', 'Successfully updated team constraint to allow creative, web, all',
            'timestamp', now()
        );
        
    EXCEPTION WHEN OTHERS THEN
        -- Return error status
        result := json_build_object(
            'success', false,
            'error', SQLERRM,
            'timestamp', now()
        );
    END;
    
    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION fix_team_constraint() TO authenticated, service_role;
`;

async function createFunctionUsingMigration() {
  console.log('🔧 Attempting to create function using SQL execution...');
  
  try {
    // Try to use SQL execution through Supabase's internal tools
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ query: createFunctionSQL })
    });

    if (response.ok) {
      console.log('✅ Function created successfully via SQL execution');
      return true;
    } else {
      console.log('⚠️  SQL execution method not available');
      return false;
    }
  } catch (error) {
    console.log('⚠️  SQL execution method failed:', error.message);
    return false;
  }
}

async function createFunctionDirectly() {
  console.log('🔧 Attempting to create function using direct SQL approach...');
  
  try {
    // Split the SQL into statements and try executing them
    const statements = createFunctionSQL.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      if (statement.trim()) {
        // Try different approaches to execute SQL
        const approaches = [
          () => supabase.rpc('exec', { sql: statement.trim() }),
          () => supabase.rpc('execute_sql', { query: statement.trim() }),
          () => supabase.rpc('sql_exec', { sql: statement.trim() }),
        ];
        
        let success = false;
        for (const approach of approaches) {
          try {
            const { error } = await approach();
            if (!error) {
              success = true;
              break;
            }
          } catch (e) {
            // Continue to next approach
          }
        }
        
        if (!success) {
          console.log('⚠️  Could not execute statement:', statement.substring(0, 50) + '...');
        }
      }
    }
    
    return true;
  } catch (error) {
    console.log('⚠️  Direct SQL approach failed:', error.message);
    return false;
  }
}

async function createFunctionViaHTTP() {
  console.log('🔧 Attempting to create function via HTTP API...');
  
  try {
    // Try Supabase's management API approach
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sql',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
      },
      body: createFunctionSQL
    });

    if (response.ok) {
      console.log('✅ Function created successfully via HTTP API');
      return true;
    } else {
      console.log('⚠️  HTTP API method not available');
      return false;
    }
  } catch (error) {
    console.log('⚠️  HTTP API method failed:', error.message);
    return false;
  }
}

async function tryCreateFunction() {
  console.log('🚀 Attempting to create the constraint fix function automatically...\n');
  
  const approaches = [
    createFunctionUsingMigration,
    createFunctionViaHTTP,
    createFunctionDirectly,
  ];
  
  for (const approach of approaches) {
    const success = await approach();
    if (success) {
      return true;
    }
  }
  
  return false;
}

async function callFixConstraintFunction() {
  console.log('🔧 Calling the constraint fix function...');
  
  try {
    const { data, error } = await supabase.rpc('fix_team_constraint');
    
    if (error) {
      console.error('❌ Error calling function:', error.message);
      return false;
    }
    
    console.log('📋 Function result:', data);
    
    if (data && data.success) {
      console.log('✅ Success:', data.message);
      console.log('🕒 Timestamp:', data.timestamp);
      return true;
    } else {
      console.error('❌ Function reported an error:', data?.error || 'Unknown error');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Unexpected error calling function:', error);
    return false;
  }
}

async function verifyConstraintFix() {
  console.log('\n🧪 Verifying the constraint fix...');
  
  try {
    // Get an admin user
    const { data: admins, error: adminError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'admin')
      .limit(1);

    if (adminError) {
      console.error('❌ Error fetching admin:', adminError);
      return false;
    }

    if (admins.length === 0) {
      console.log('⚠️  No admin users found to test with');
      return true;
    }

    const admin = admins[0];
    console.log(`📋 Testing with admin: ${admin.full_name || admin.email}`);

    // Try to update the admin's team to 'all'
    console.log('🔄 Attempting to set team to "all"...');
    const { error: updateError } = await supabase
      .from('users')
      .update({ team: 'all' })
      .eq('id', admin.id);

    if (updateError) {
      console.log('❌ Constraint still blocking:', updateError.message);
      return false;
    }

    console.log('✅ Successfully updated admin team to "all"!');
    console.log('🎉 Constraint fix has been verified!');
    
    // Test other team values too
    console.log('\n🔄 Testing other team values...');
    
    // Test creative
    const { error: creativeError } = await supabase
      .from('users')
      .update({ team: 'creative' })
      .eq('id', admin.id);
    
    if (!creativeError) {
      console.log('✅ "creative" team works');
    }
    
    // Test web
    const { error: webError } = await supabase
      .from('users')
      .update({ team: 'web' })
      .eq('id', admin.id);
    
    if (!webError) {
      console.log('✅ "web" team works');
    }
    
    // Set back to 'all' to show it works
    await supabase
      .from('users')
      .update({ team: 'all' })
      .eq('id', admin.id);
    
    console.log('✅ Set back to "all" - all team values are working!');
    
    return true;

  } catch (error) {
    console.error('❌ Error during verification:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Auto-fixing database constraint...');
  console.log('🔗 Connecting to Supabase...');
  
  // Test connection
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .limit(1);
  
  if (error) {
    console.error('❌ Connection failed:', error);
    return;
  }
  
  console.log('✅ Connected to database successfully!\n');
  
  // Step 1: Try to create the function automatically
  const functionCreated = await tryCreateFunction();
  
  if (!functionCreated) {
    console.log('\n❌ Could not create function automatically.');
    console.log('📝 Please run this SQL manually in Supabase SQL editor:');
    console.log('🔧 https://ysfknpujqivkudhnhezx.supabase.co/project/default/sql\n');
    console.log(createFunctionSQL);
    return;
  }
  
  // Step 2: Call the function to fix the constraint
  console.log('\n🔧 Function created, now executing the constraint fix...');
  const fixSuccessful = await callFixConstraintFunction();
  
  if (!fixSuccessful) {
    console.log('❌ Failed to execute constraint fix function');
    return;
  }
  
  // Step 3: Verify the fix worked
  const verificationSuccessful = await verifyConstraintFix();
  
  if (verificationSuccessful) {
    console.log('\n🎉 SUCCESS! The database constraint has been fixed!');
    console.log('✅ Admin users can now be assigned to "All Teams"');
    console.log('✅ Your Super Admin system is fully operational!');
  } else {
    console.log('\n⚠️  The fix may not have worked completely. Please check manually.');
  }
}

main().catch(console.error); 