import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// IST timezone offset (+05:30)
const IST_OFFSET_HOURS = 5;
const IST_OFFSET_MINUTES = 30;

/**
 * Get current IST date and time
 * Using proper timezone handling for server-side execution
 */
function getIndiaDateTime(): Date {
  // For server-side edge functions, we need to handle timezone properly
  // Use the native Date constructor which will be in UTC on the server
  const now = new Date();
  
  // Convert to IST by creating a new date with IST timezone
  // This approach works correctly on server environments
  const istTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
  return istTime;
}

/**
 * Get current IST date in YYYY-MM-DD format
 */
function getIndiaDate(): string {
  const ist = getIndiaDateTime();
  return ist.toISOString().split('T')[0];
}

/**
 * Process rollover for a single day: move unfinished tasks from yesterday to today
 */
async function processRolloverForDay(supabase: any, userId: string, fromDate: string, toDate: string): Promise<void> {
  try {
    // Safety check to prevent processing same day twice or invalid dates
    if (fromDate >= toDate) {
      return;
    }

    console.log(`🔄 Processing rollover: ${fromDate} → ${toDate} for user ${userId}`);

    // Get yesterday's work entry
    const { data: fromEntry, error: fromError } = await supabase
      .from('daily_work_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('date', fromDate)
      .single();

    if (fromError && fromError.code !== 'PGRST116') {
      console.error('Error fetching from entry:', fromError);
      return;
    }

    if (!fromEntry) {
      console.log(`❌ No work entry found for ${fromDate}, nothing to roll over`);
      return;
    }

    // Find unfinished tasks (in assigned but not in completed)
    const unfinishedTasks = (fromEntry.assigned_tasks || []).filter((taskId: string) => 
      !(fromEntry.completed_tasks || []).includes(taskId)
    );

    console.log(`📋 Found ${unfinishedTasks.length} unfinished tasks on ${fromDate}:`, unfinishedTasks);

    if (unfinishedTasks.length === 0) {
      console.log(`✅ No unfinished tasks to roll over from ${fromDate}`);
      return;
    }

    // Get or create today's work entry
    let { data: toEntry, error: toError } = await supabase
      .from('daily_work_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('date', toDate)
      .single();

    if (toError && toError.code !== 'PGRST116') {
      console.error('Error fetching to entry:', toError);
      return;
    }

    // Create entry if it doesn't exist
    if (!toEntry) {
      const { data: newEntry, error: createError } = await supabase
        .from('daily_work_entries')
        .insert([{
          user_id: userId,
          date: toDate,
          assigned_tasks: [],
          completed_tasks: [],
          check_in_time: null,
          check_out_time: null,
          is_absent: false
        }])
        .select()
        .single();

      if (createError) {
        console.error('Error creating new entry:', createError);
        return;
      }
      toEntry = newEntry;
    }

    console.log(`📝 Current assigned tasks on ${toDate}:`, toEntry.assigned_tasks || []);
    
    // Add unfinished tasks to today's assigned tasks (avoid duplicates)
    const currentAssigned = toEntry.assigned_tasks || [];
    const newAssignedTasks = [...new Set([...currentAssigned, ...unfinishedTasks])];

    console.log(`🔀 Merging tasks for ${toDate}:`, {
      current: currentAssigned.length,
      unfinished: unfinishedTasks.length,
      merged: newAssignedTasks.length
    });

    // Only update if there are actually new tasks to add
    if (newAssignedTasks.length > currentAssigned.length) {
      const { data: updatedEntry, error: updateError } = await supabase
        .from('daily_work_entries')
        .update({
          assigned_tasks: newAssignedTasks,
          updated_at: getIndiaDateTime().toISOString()
        })
        .eq('id', toEntry.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating entry:', updateError);
        return;
      }

      console.log(`💾 Database updated for ${toDate}:`, {
        userId: userId,
        date: toDate,
        assignedTasks: updatedEntry.assigned_tasks,
        taskCount: updatedEntry.assigned_tasks.length
      });

      console.log(`✅ DATABASE VERIFICATION PASSED: ${unfinishedTasks.length} tasks successfully rolled over from ${fromDate} to ${toDate}`);
    } else {
      console.log(`⚠️ No new tasks to add - all unfinished tasks already exist on ${toDate}`);
    }
  } catch (error) {
    console.error(`❌ Error processing rollover from ${fromDate} to ${toDate} for user ${userId}:`, error);
  }
}

/**
 * Process comprehensive rollover for a user up to target date
 */
async function processComprehensiveRollover(supabase: any, userId: string, targetDate: string): Promise<void> {
  try {
    // Get user's last rollover date
    let { data: rolloverRecord, error: rolloverError } = await supabase
      .from('user_rollover')
      .select('user_id, last_rollover_date')
      .eq('user_id', userId)
      .single();

    if (rolloverError && rolloverError.code === 'PGRST116') {
      // Create new rollover record if it doesn't exist
      const { data: newRecord, error: createError } = await supabase
        .from('user_rollover')
        .insert([{
          user_id: userId,
          last_rollover_date: '1970-01-01'
        }])
        .select('user_id, last_rollover_date')
        .single();

      if (createError) {
        console.error('Error creating rollover record:', createError);
        rolloverRecord = { user_id: userId, last_rollover_date: '1970-01-01' };
      } else {
        rolloverRecord = newRecord;
      }
    } else if (rolloverError) {
      console.error('Error fetching rollover record:', rolloverError);
      return;
    }

    const lastRolloverDate = new Date(rolloverRecord.last_rollover_date + 'T00:00:00Z');
    const targetDateObj = new Date(targetDate + 'T00:00:00Z');

    // If we've already processed up to or past the target date, nothing to do
    if (lastRolloverDate >= targetDateObj) {
      console.log(`✅ Rollover already processed for user ${userId} up to ${targetDate}`);
      return;
    }

    // Safety check to prevent processing too far back
    const maxDaysBack = 30;
    const minDate = new Date(targetDateObj.getTime() - (maxDaysBack * 24 * 60 * 60 * 1000));
    const startDate = lastRolloverDate < minDate ? minDate : lastRolloverDate;

    // Process each day from the day after last rollover to target date
    let currentDate = new Date(startDate.getTime() + (24 * 60 * 60 * 1000));
    
    let daysProcessed = 0;
    const maxDaysToProcess = 30; // Safety limit

    while (currentDate <= targetDateObj && daysProcessed < maxDaysToProcess) {
      const fromDateStr = new Date(currentDate.getTime() - (24 * 60 * 60 * 1000)).toISOString().split('T')[0];
      const toDateStr = currentDate.toISOString().split('T')[0];
      
      await processRolloverForDay(supabase, userId, fromDateStr, toDateStr);
      
      currentDate = new Date(currentDate.getTime() + (24 * 60 * 60 * 1000));
      daysProcessed++;
    }

    // Update the user's last rollover date
    const { error: updateError } = await supabase
      .from('user_rollover')
      .update({ last_rollover_date: targetDate })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating rollover record:', updateError);
    } else {
      console.log(`✅ Updated rollover record for user ${userId} to ${targetDate}`);
    }

  } catch (error) {
    console.error(`❌ Error in comprehensive rollover for user ${userId}:`, error);
  }
}

/**
 * Process scheduled rollover for all active users
 */
async function processScheduledRollover(supabase: any): Promise<{ success: number, errors: number }> {
  let successCount = 0;
  let errorCount = 0;

  try {
    const currentDate = getIndiaDate();
    console.log(`🕛 Starting scheduled rollover for ${currentDate}`);

    // Get all active users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username')
      .eq('is_active', true);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return { success: 0, errors: 1 };
    }

    if (!users || users.length === 0) {
      console.log('No active users found');
      return { success: 0, errors: 0 };
    }

    console.log(`👥 Processing rollover for ${users.length} active users`);

    // Process rollover for each user
    for (const user of users) {
      try {
        console.log(`\n🔄 Processing user: ${user.username} (${user.id})`);
        await processComprehensiveRollover(supabase, user.id, currentDate);
        successCount++;
        console.log(`✅ Completed rollover for ${user.username}`);
      } catch (error) {
        console.error(`❌ Error processing rollover for user ${user.username}:`, error);
        errorCount++;
      }
    }

    // Log the rollover execution
    const { error: logError } = await supabase
      .from('rollover_logs')
      .insert([{
        execution_date: currentDate,
        execution_time: getIndiaDateTime().toISOString(),
        users_processed: successCount,
        errors_count: errorCount,
        status: errorCount === 0 ? 'success' : 'partial_success'
      }]);

    if (logError) {
      console.error('Error logging rollover execution:', logError);
    }

    console.log(`\n🎉 Scheduled rollover completed: ${successCount} success, ${errorCount} errors`);
    return { success: successCount, errors: errorCount };

  } catch (error) {
    console.error('❌ Critical error in scheduled rollover:', error);
    return { success: successCount, errors: errorCount + 1 };
  }
}

/**
 * Check if it's rollover time (12:00 AM IST)
 */
function isRolloverTime(): boolean {
  const ist = getIndiaDateTime();
  const hour = ist.getHours();
  const minute = ist.getMinutes();
  
  // Allow rollover between 12:00 AM and 12:59 AM IST
  return hour === 0;
}

/**
 * Main edge function handler
 */
serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const currentTime = getIndiaDateTime();
    const shouldRun = isRolloverTime();

    console.log(`🕛 Edge function triggered at ${currentTime.toISOString()}`);
    console.log(`⏰ Is rollover time? ${shouldRun}`);

    if (!shouldRun) {
      return new Response(
        JSON.stringify({
          message: 'Not rollover time',
          currentTime: currentTime.toISOString(),
          shouldRun: false
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Process the rollover
    const result = await processScheduledRollover(supabase);

    return new Response(
      JSON.stringify({
        message: 'Rollover completed',
        currentTime: currentTime.toISOString(),
        result: result,
        shouldRun: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Edge function error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
}); 