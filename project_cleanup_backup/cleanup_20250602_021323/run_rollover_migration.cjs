const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file if it exists
try {
  require('dotenv').config();
} catch (e) {
  // dotenv might not be installed, which is fine
}

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
    
    console.log('📋 SQL content loaded. Since RPC might not be available, please run the following SQL manually in your Supabase dashboard:');
    console.log('================================================================================');
    console.log(sqlContent);
    console.log('================================================================================');
    
    // Test if we can access the database
    console.log('\n🧪 Testing database connection...');
    try {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      if (usersError) {
        console.error('❌ Cannot access users table:', usersError);
      } else {
        console.log('✅ Database connection successful');
        
        // Try to access user_rollover table to see if it exists
        console.log('\n🔍 Checking if user_rollover table exists...');
        const { data: rolloverData, error: rolloverError } = await supabase
          .from('user_rollover')
          .select('*')
          .limit(1);
        
        if (rolloverError) {
          console.log('⚠️  user_rollover table not found. Please run the SQL above in Supabase dashboard.');
          console.log('Error:', rolloverError.message);
        } else {
          console.log('✅ user_rollover table already exists and is accessible!');
        }
      }
    } catch (testErr) {
      console.error('❌ Database connection test failed:', testErr.message);
    }
    
  } catch (error) {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration().catch(console.error); 