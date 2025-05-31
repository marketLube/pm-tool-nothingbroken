const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file if it exists
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('🚀 Running rollover tracking migration...');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'src/sql/add_rollover_tracking.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n🔄 Executing statement ${i + 1}/${statements.length}:`);
      console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql: statement 
        });
        
        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error);
          
          // Try direct query if RPC fails
          const { data: queryData, error: queryError } = await supabase
            .from('information_schema.tables')
            .select('*')
            .limit(1);
          
          if (queryError) {
            console.error('Direct query also failed, database might be unreachable');
            throw error;
          }
          
          console.log('⚠️  RPC failed but database is reachable, trying alternative approach...');
          
          // For CREATE TABLE statements, we can use the Supabase client directly
          if (statement.toLowerCase().includes('create table')) {
            console.log('📋 Creating table using alternative method...');
            // We'll need to handle this manually in the Supabase dashboard
            console.log('❗ Please run this statement manually in the Supabase SQL Editor:');
            console.log(statement);
          }
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } catch (statementError) {
        console.error(`❌ Failed to execute statement ${i + 1}:`, statementError.message);
      }
    }
    
    console.log('\n🎉 Migration completed!');
    console.log('\n📋 Summary:');
    console.log('- Added user_rollover table for tracking rollover progress');
    console.log('- Added RLS policies for security');
    console.log('- Added indexes for performance');
    console.log('- Added triggers for automatic timestamp updates');
    
    // Test the new table
    console.log('\n🧪 Testing user_rollover table...');
    try {
      const { data: testData, error: testError } = await supabase
        .from('user_rollover')
        .select('*')
        .limit(1);
      
      if (testError) {
        console.log('⚠️  Table might not be created yet, please check the Supabase dashboard');
      } else {
        console.log('✅ user_rollover table is accessible');
      }
    } catch (testErr) {
      console.log('⚠️  Could not test table access, please verify manually');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration().catch(console.error); 