import { format, parseISO, addDays } from 'date-fns';
import { getIndiaDateTime, getIndiaDate } from '../utils/timezone';
import * as dailyReportService from './dailyReportService';
import { supabase } from '../utils/supabase';

/**
 * SCHEDULED ROLLOVER SERVICE
 * 
 * This service handles automatic task rollover at 12 AM IST each day.
 * It should be called by a server-side cron job or edge function.
 * 
 * Rollover process:
 * 1. Runs at 12:00 AM IST every day
 * 2. Finds all active users
 * 3. Processes rollover for each user up to current date
 * 4. Moves unfinished tasks from previous days to current day
 */

/**
 * Process rollover for all active users
 * This should be called by a scheduled job at 12 AM IST
 */
export const processScheduledRollover = async (): Promise<void> => {
  try {
    const currentIST = getIndiaDateTime();
    const currentDateIST = getIndiaDate();
    
    console.log(`🕛 SCHEDULED ROLLOVER STARTED at ${currentIST.toISOString()} (IST)`);
    console.log(`📅 Processing rollover for date: ${currentDateIST}`);
    
    // Get all active users
    const { data: activeUsers, error: usersError } = await supabase
      .from('users')
      .select('id, name')
      .eq('isActive', true);
    
    if (usersError) {
      console.error('❌ Error fetching active users for rollover:', usersError);
      throw usersError;
    }
    
    if (!activeUsers || activeUsers.length === 0) {
      console.log('⚠️ No active users found for rollover');
      return;
    }
    
    console.log(`👥 Processing rollover for ${activeUsers.length} active users`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Process rollover for each user
    for (const user of activeUsers) {
      try {
        console.log(`🔄 Processing rollover for user: ${user.name} (${user.id})`);
        
        // Process comprehensive rollover up to current date
        await dailyReportService.processComprehensiveRollover(user.id, currentDateIST);
        
        successCount++;
        console.log(`✅ Rollover completed for user: ${user.name}`);
        
      } catch (userError) {
        errorCount++;
        console.error(`❌ Rollover failed for user ${user.name} (${user.id}):`, userError);
        // Continue with other users even if one fails
      }
    }
    
    console.log(`🎉 SCHEDULED ROLLOVER COMPLETED:`, {
      timestamp: currentIST.toISOString(),
      date: currentDateIST,
      totalUsers: activeUsers.length,
      successful: successCount,
      failed: errorCount
    });
    
    // Log rollover completion to database for monitoring
    await logRolloverExecution(currentDateIST, successCount, errorCount);
    
  } catch (error) {
    console.error('❌ SCHEDULED ROLLOVER FAILED:', error);
    throw error;
  }
};

/**
 * Log rollover execution for monitoring and debugging
 */
const logRolloverExecution = async (date: string, successCount: number, errorCount: number): Promise<void> => {
  try {
    const { error } = await supabase
      .from('rollover_logs')
      .insert([{
        execution_date: date,
        success_count: successCount,
        error_count: errorCount,
        executed_at: getIndiaDateTime().toISOString()
      }]);
    
    if (error) {
      console.error('Error logging rollover execution:', error);
      // Don't throw - this is just for monitoring
    } else {
      console.log(`📝 Rollover execution logged successfully`);
    }
  } catch (error) {
    console.error('Error in logRolloverExecution:', error);
    // Don't throw - this is just for monitoring
  }
};

/**
 * Check if rollover should run based on IST time
 * Returns true if current time is between 12:00 AM and 12:05 AM IST
 */
export const shouldRunRollover = (): boolean => {
  const currentIST = getIndiaDateTime();
  const hours = currentIST.getHours();
  const minutes = currentIST.getMinutes();
  
  // Run rollover between 12:00 AM and 12:05 AM IST
  return hours === 0 && minutes <= 5;
};

/**
 * Manual rollover trigger for testing/debugging
 * This mimics what the scheduled job would do
 */
export const triggerManualRollover = async (): Promise<void> => {
  console.log('🧪 MANUAL ROLLOVER TRIGGER (for testing only)');
  await processScheduledRollover();
};

/**
 * Get rollover status for monitoring
 */
export const getRolloverStatus = async (): Promise<{
  lastExecution?: string;
  successCount?: number;
  errorCount?: number;
}> => {
  try {
    const { data: lastLog, error } = await supabase
      .from('rollover_logs')
      .select('execution_date, success_count, error_count, executed_at')
      .order('executed_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching rollover status:', error);
      return {};
    }
    
    if (!lastLog) {
      return {};
    }
    
    return {
      lastExecution: lastLog.executed_at,
      successCount: lastLog.success_count,
      errorCount: lastLog.error_count
    };
  } catch (error) {
    console.error('Error in getRolloverStatus:', error);
    return {};
  }
};

// Export for edge function/cron job usage
export default {
  processScheduledRollover,
  shouldRunRollover,
  triggerManualRollover,
  getRolloverStatus
}; 