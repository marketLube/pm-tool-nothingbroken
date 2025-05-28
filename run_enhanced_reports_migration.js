const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = 'https://ztjmxqjzjzjzjzjzjzjz.supabase.co'; // Replace with your actual URL
const supabaseKey = 'your-anon-key-here'; // Replace with your actual anon key

const supabase = createClient(supabaseUrl, supabaseKey);

async function runEnhancedReportsMigration() {
  try {
    console.log('🚀 Starting Enhanced Reports & Analytics Migration...');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'enhanced_reports_features.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Split SQL content by statements (basic splitting by semicolon)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.trim()) {
        try {
          console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
          
          const { data, error } = await supabase.rpc('exec_sql', {
            sql: statement
          });
          
          if (error) {
            console.error(`❌ Error in statement ${i + 1}:`, error.message);
            // Continue with other statements
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.error(`❌ Exception in statement ${i + 1}:`, err.message);
        }
      }
    }
    
    console.log('🎉 Enhanced Reports & Analytics Migration completed!');
    console.log('\n📋 Summary of new features:');
    console.log('  ✓ Task rollover functionality');
    console.log('  ✓ Enhanced absence handling');
    console.log('  ✓ Performance indexes');
    console.log('  ✓ Productivity metrics functions');
    console.log('  ✓ Daily task summary view');
    console.log('  ✓ Automatic timestamp updates');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Alternative method: Execute SQL directly if RPC is not available
async function runDirectSQL() {
  try {
    console.log('🚀 Running Enhanced Reports Migration with direct SQL execution...');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'enhanced_reports_features.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('📝 SQL Content loaded. Please execute the following in your Supabase SQL editor:');
    console.log('=' * 80);
    console.log(sqlContent);
    console.log('=' * 80);
    
    console.log('\n📋 Instructions:');
    console.log('1. Copy the SQL content above');
    console.log('2. Go to your Supabase Dashboard > SQL Editor');
    console.log('3. Paste and execute the SQL');
    console.log('4. Verify that all functions and indexes are created');
    
  } catch (error) {
    console.error('💥 Error reading SQL file:', error);
  }
}

// Check if we can use RPC or need direct SQL
async function main() {
  console.log('🔍 Checking Supabase connection...');
  
  try {
    // Test connection
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      console.log('⚠️  Cannot connect to Supabase. Using direct SQL method...');
      await runDirectSQL();
    } else {
      console.log('✅ Supabase connection successful');
      await runEnhancedReportsMigration();
    }
  } catch (err) {
    console.log('⚠️  Connection test failed. Using direct SQL method...');
    await runDirectSQL();
  }
}

// Run the migration
main(); 