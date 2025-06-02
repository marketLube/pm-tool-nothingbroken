const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.log('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

// Get current India date in YYYY-MM-DD format
function getIndiaDate() {
  const now = new Date();
  const indiaTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000)); // Add 5.5 hours for IST
  return indiaTime.toISOString().split('T')[0];
}

async function clearAllAttendanceToday() {
  console.log('🗑️ ADMIN: Clearing all attendance entries for today...\n');
  
  try {
    const today = getIndiaDate();
    console.log(`📅 Target date: ${today} (IST)`);
    
    // First, check existing entries for today
    const { data: existingEntries, error: fetchError } = await supabase
      .from('daily_work_entries')
      .select('id, user_id, check_in_time, check_out_time, is_absent')
      .eq('date', today);
    
    if (fetchError) {
      console.log('❌ Error fetching existing entries:', fetchError.message);
      return;
    }
    
    console.log(`📊 Found ${existingEntries?.length || 0} attendance entries for today:`);
    
    if (existingEntries && existingEntries.length > 0) {
      existingEntries.forEach((entry, index) => {
        console.log(`  ${index + 1}. User ID: ${entry.user_id} | Check-in: ${entry.check_in_time || 'None'} | Check-out: ${entry.check_out_time || 'None'} | Absent: ${entry.is_absent}`);
      });
      
      // Clear check-in and check-out times for today's entries
      const { data: updateResult, error: updateError } = await supabase
        .from('daily_work_entries')
        .update({
          check_in_time: null,
          check_out_time: null,
          is_absent: false,
          notes: `Attendance cleared by admin on ${new Date().toISOString()}`
        })
        .eq('date', today);
      
      if (updateError) {
        console.log('❌ Error clearing attendance:', updateError.message);
        return;
      }
      
      console.log(`\n✅ Successfully cleared attendance for ${existingEntries.length} entries`);
      console.log('📋 All users now show as "Not checked in" for today');
      console.log('🔄 Users can now manually check-in via the Attendance module');
      
    } else {
      console.log('📝 No attendance entries found for today - nothing to clear');
    }
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Users should now see "Not checked in" status');
    console.log('2. Users can manually check-in using the "Check In Now" button');
    console.log('3. Only manual check-ins will be recorded (no automatic login check-ins)');
    
  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

async function main() {
  console.log('🔧 PM Tool - Clear Today\'s Attendance (Admin)\n');
  console.log('⚠️  WARNING: This will clear all attendance entries for today!');
  console.log('This action will remove check-in/check-out times but preserve user records.\n');
  
  await clearAllAttendanceToday();
  
  console.log('\n✅ Operation completed!');
  process.exit(0);
}

if (require.main === module) {
  main();
} 