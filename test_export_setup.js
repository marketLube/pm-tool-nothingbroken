// Simple test for calendar export setup
// Run this in browser console to test if export functionality works

async function testExportSetup() {
  console.log('Testing calendar export setup...');
  
  // Test 1: Check if supabase is available
  if (typeof supabase === 'undefined') {
    console.error('❌ Supabase not available');
    return;
  }
  console.log('✅ Supabase is available');
  
  // Test 2: Check if calendar_exports table exists
  try {
    const { data, error } = await supabase
      .from('calendar_exports')
      .select('count(*)')
      .limit(1);
    
    if (error) {
      console.error('❌ calendar_exports table issue:', error.message);
      console.log('💡 Solution: Run the create_calendar_exports_table.sql script in Supabase');
      return;
    }
    console.log('✅ calendar_exports table exists');
  } catch (err) {
    console.error('❌ Database connection error:', err);
    return;
  }
  
  // Test 3: Check authentication
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      console.log('✅ User authenticated:', user.email);
    } else {
      console.log('⚠️ User not authenticated - this might affect export permissions');
    }
  } catch (err) {
    console.error('❌ Auth check error:', err);
  }
  
  console.log('🎉 Export setup test complete!');
}

// Run the test
testExportSetup(); 