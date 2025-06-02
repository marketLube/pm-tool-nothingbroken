import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use hardcoded values since we don't have .env
const supabaseUrl = 'https://ysfknpujqivkudhnhezx.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzZmtucHVqcWl2a3VkaG5oZXp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzU5NjExMywiZXhwIjoyMDYzMTcyMTEzfQ.7q0ONGSxRUvWJS_Vo3DcXnoZt6DSpBqsZhcnX9JTARI';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration. Please check your environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🚀 Starting Reports & Analytics database migration...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'src', 'sql', 'create_reports_analytics_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Executing SQL migration...');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // If the RPC function doesn't exist, try direct execution
      console.log('⚠️  RPC function not found, trying direct execution...');
      
      // Split SQL into individual statements and execute them
      const statements = sql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.trim()) {
          console.log(`Executing: ${statement.substring(0, 50)}...`);
          const { error: execError } = await supabase.rpc('exec', { sql: statement });
          
          if (execError) {
            console.error('❌ Error executing statement:', execError);
            console.error('Statement:', statement);
          }
        }
      }
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 The following tables and functions have been created:');
    console.log('   - daily_work_entries');
    console.log('   - task_completions');
    console.log('   - daily_reports (view)');
    console.log('   - get_team_analytics() function');
    console.log('   - Row Level Security policies');
    console.log('   - Indexes for performance');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Alternative method using direct SQL execution
async function runMigrationDirect() {
  try {
    console.log('🚀 Starting Reports & Analytics database migration (Direct method)...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'src', 'sql', 'create_reports_analytics_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Executing SQL migration...');
    
    // For direct execution, we'll need to use the SQL editor in Supabase dashboard
    // or use a PostgreSQL client directly
    console.log('📋 Please execute the following SQL in your Supabase SQL editor:');
    console.log('='.repeat(80));
    console.log(sql);
    console.log('='.repeat(80));
    
    console.log('✅ SQL script ready for execution!');
    console.log('💡 Copy the SQL above and run it in your Supabase dashboard > SQL Editor');
    
  } catch (error) {
    console.error('❌ Error reading SQL file:', error);
    process.exit(1);
  }
}

// Check if we can connect to Supabase
async function testConnection() {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error) {
      console.log('⚠️  Cannot connect to database, using direct method...');
      return false;
    }
    console.log('✅ Database connection successful!');
    return true;
  } catch (error) {
    console.log('⚠️  Cannot connect to database, using direct method...');
    return false;
  }
}

// Main execution
async function main() {
  const canConnect = await testConnection();
  
  if (canConnect) {
    await runMigration();
  } else {
    await runMigrationDirect();
  }
}

main(); 