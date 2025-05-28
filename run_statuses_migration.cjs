const fs = require('fs');
const path = require('path');

// Import Supabase client
const { createClient } = require('@supabase/supabase-js');

// Use the same credentials as in the app
const supabaseUrl = 'https://ysfknpujqivkudhnhezx.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzZmtucHVqcWl2a3VkaG5oZXp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzU5NjExMywiZXhwIjoyMDYzMTcyMTEzfQ.7q0ONGSxRUvWJS_Vo3DcXnoZt6DSpBqsZhcnX9JTARI';

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function runStatusesMigration() {
  try {
    console.log('🚀 Starting Statuses table migration...');
    
    // Read the SQL file
    const sqlPath = path.join(process.cwd(), 'create_statuses_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 SQL ready for execution...');
    
    // Provide manual instructions since RPC might not work
    console.log('📋 Please execute the following SQL in your Supabase dashboard:');
    console.log('='.repeat(80));
    console.log(sql);
    console.log('='.repeat(80));
    
    // Test if the migration worked by fetching statuses
    console.log('\n🔍 Testing if statuses table exists...');
    try {
      const { data: statuses, error: fetchError } = await supabaseAdmin
        .from('statuses')
        .select('*')
        .limit(5);
      
      if (fetchError) {
        if (fetchError.code === '42P01') {
          console.log('❌ Statuses table does not exist yet.');
          console.log('📋 Please run the SQL above in your Supabase dashboard > SQL Editor');
          console.log('💡 After running the SQL, restart your application to see the changes.');
        } else {
          console.error('❌ Error fetching statuses:', fetchError);
        }
      } else {
        console.log('✅ Migration completed successfully!');
        console.log(`📊 Found ${statuses.length} statuses in database`);
        statuses.forEach(status => {
          console.log(`   - ${status.name} (${status.team}) - Order: ${status.order}`);
        });
        console.log('\n🎉 Database integration is ready!');
        console.log('💡 Your status configurations will now be saved to the database and shared across all users.');
      }
    } catch (testError) {
      console.error('❌ Error testing migration:', testError);
      console.log('📋 Please run the SQL manually in Supabase dashboard');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    
    // Provide manual instructions
    console.log('\n📋 Manual Setup Instructions:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the following SQL:');
    console.log('='.repeat(80));
    
    try {
      const sqlPath = path.join(process.cwd(), 'create_statuses_table.sql');
      const sql = fs.readFileSync(sqlPath, 'utf8');
      console.log(sql);
    } catch (readError) {
      console.log('Error reading SQL file:', readError);
    }
    
    console.log('='.repeat(80));
    console.log('4. Execute the SQL');
    console.log('5. Restart your application');
  }
}

// Test connection first
async function testConnection() {
  try {
    const { data, error } = await supabaseAdmin.from('users').select('count').limit(1);
    if (error) {
      console.log('⚠️  Cannot connect to database');
      return false;
    }
    console.log('✅ Database connection successful!');
    return true;
  } catch (error) {
    console.log('⚠️  Cannot connect to database');
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔍 Testing database connection...');
  const canConnect = await testConnection();
  
  if (canConnect) {
    await runStatusesMigration();
  } else {
    console.log('❌ Cannot connect to database. Please check your Supabase configuration.');
    
    // Still provide the SQL for manual execution
    try {
      const sqlPath = path.join(process.cwd(), 'create_statuses_table.sql');
      const sql = fs.readFileSync(sqlPath, 'utf8');
      console.log('\n📋 Manual SQL to execute in Supabase dashboard:');
      console.log('='.repeat(80));
      console.log(sql);
      console.log('='.repeat(80));
    } catch (readError) {
      console.log('Error reading SQL file:', readError);
    }
  }
}

main().catch(console.error); 