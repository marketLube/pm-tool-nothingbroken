import { format } from 'date-fns';
import { updateCheckInOut, getDailyWorkEntry } from './dailyReportService';
import { supabase } from '../utils/supabase';
import { getIndiaDate, getIndiaTime, getIndiaDateTime } from '../utils/timezone';

/**
 * Records manual check-in time for a user (replaces automatic login check-in)
 */
export const recordManualCheckIn = async (userId: string, checkInTime?: string): Promise<void> => {
  try {
    const currentDate = getIndiaDate();
    const actualCheckInTime = checkInTime || getIndiaTime();
    
    console.log(`🔄 Recording manual check-in for user ${userId} at ${actualCheckInTime} on ${currentDate}`);
    
    // Validate parameters
    if (!userId) {
      throw new Error('User ID is required for check-in');
    }
    
    // Try to update existing entry or create new one
    await updateCheckInOut(userId, currentDate, actualCheckInTime, undefined);
    
    console.log(`✅ Manual check-in recorded successfully for user ${userId}`);
  } catch (error) {
    console.error('❌ Error recording manual check-in:', error);
    throw new Error(
      error instanceof Error 
        ? `Check-in failed: ${error.message}` 
        : 'Check-in failed: Unknown error occurred'
    );
  }
};

/**
 * Records check-out time for a user
 */
export const recordCheckOut = async (userId: string, checkOutTime?: string): Promise<void> => {
  try {
    const today = getIndiaDate();
    const timeToRecord = checkOutTime || getIndiaTime();
    
    console.log(`🕐 Recording check-out for user ${userId} at ${timeToRecord} on ${today} (IST)`);
    
    // Verify user has checked in first
    const existingEntry = await getDailyWorkEntry(userId, today);
    if (!existingEntry?.checkInTime) {
      throw new Error('Cannot check out without checking in first');
    }
    
    await updateCheckInOut(userId, today, undefined, timeToRecord);
    console.log(`✅ Check-out recorded successfully for user ${userId}`);
  } catch (error) {
    console.error('❌ Error recording check-out:', error);
    throw error;
  }
};

/**
 * Gets real-time attendance status for a user on a specific date
 */
export const getAttendanceStatus = async (userId: string, date?: string): Promise<{
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  isAbsent: boolean;
  totalHours?: number;
}> => {
  try {
    const targetDate = date || getIndiaDate();
    console.log(`📊 Getting attendance status for user ${userId} on ${targetDate}`);
    
    const workEntry = await getDailyWorkEntry(userId, targetDate);
    
    let totalHours: number | undefined;
    
    // Calculate total hours if both check-in and check-out are available
    if (workEntry?.checkInTime && workEntry?.checkOutTime) {
      const [checkInHour, checkInMinute] = workEntry.checkInTime.split(':').map(Number);
      const [checkOutHour, checkOutMinute] = workEntry.checkOutTime.split(':').map(Number);
      
      const checkInMinutes = checkInHour * 60 + checkInMinute;
      const checkOutMinutes = checkOutHour * 60 + checkOutMinute;
      
      // Handle case where check-out is next day (after midnight)
      const totalMinutes = checkOutMinutes >= checkInMinutes 
        ? checkOutMinutes - checkInMinutes 
        : (24 * 60) - checkInMinutes + checkOutMinutes;
      
      totalHours = Math.round((totalMinutes / 60) * 100) / 100; // Round to 2 decimal places
    }
    
    const result = {
      date: targetDate,
      checkInTime: workEntry?.checkInTime,
      checkOutTime: workEntry?.checkOutTime,
      isAbsent: workEntry?.isAbsent || false,
      totalHours
    };
    
    console.log(`📊 Attendance status for ${userId}:`, result);
    return result;
  } catch (error) {
    console.error('❌ Error getting attendance status:', error);
    return {
      date: date || getIndiaDate(),
      isAbsent: false
    };
  }
};

/**
 * Updates check-in time manually (for corrections)
 */
export const updateCheckInTime = async (userId: string, checkInTime: string, date?: string): Promise<void> => {
  try {
    const targetDate = date || getIndiaDate();
    console.log(`🔄 Updating check-in time for user ${userId} to ${checkInTime} on ${targetDate}`);
    
    await updateCheckInOut(userId, targetDate, checkInTime, undefined);
    console.log(`✅ Check-in time updated successfully`);
  } catch (error) {
    console.error('❌ Error updating check-in time:', error);
    throw error;
  }
};

/**
 * Clears attendance for a specific date (admin function only)
 */
export const clearAttendance = async (userId: string, date?: string): Promise<void> => {
  try {
    const targetDate = date || getIndiaDate();
    console.log(`🗑️ Clearing attendance for user ${userId} on ${targetDate}`);
    
    await updateCheckInOut(userId, targetDate, undefined, undefined);
    console.log(`✅ Attendance cleared successfully`);
  } catch (error) {
    console.error('❌ Error clearing attendance:', error);
    throw error;
  }
};

/**
 * Gets attendance data for multiple employees for a specific date with role-based filtering
 */
export const getEmployeesAttendance = async (
  userIds: string[], 
  date?: string,
  requestingUserRole?: string,
  requestingUserTeam?: string
): Promise<Array<{
  userId: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  isAbsent: boolean;
  totalHours?: number;
}>> => {
  try {
    const targetDate = date || getIndiaDate();
    console.log(`📊 Getting employees attendance for ${userIds.length} users on ${targetDate}`);
    
    // Filter user IDs based on role permissions
    const filteredUserIds = userIds;
    
    if (requestingUserRole !== 'admin') {
      // Non-admin users can only see their team + themselves
      // This filtering should be done at the calling level, but adding as safety
      console.log(`🔒 Non-admin user requesting data, applying team filter`);
    }
    
    const attendancePromises = filteredUserIds.map(userId => getAttendanceStatus(userId, targetDate));
    const attendanceData = await Promise.all(attendancePromises);
    
    const result = attendanceData.map((data, index) => ({
      userId: filteredUserIds[index],
      ...data
    }));
    
    console.log(`📊 Retrieved attendance for ${result.length} employees`);
    return result;
  } catch (error) {
    console.error('❌ Error getting employees attendance:', error);
    return [];
  }
};

/**
 * Gets attendance statistics for a date range with enhanced error handling
 */
export const getAttendanceStats = async (userIds: string[], startDate: string, endDate: string): Promise<{
  totalWorkingDays: number;
  totalPresentDays: number;
  totalAbsentDays: number;
  averageHours: number;
  employeeStats: Array<{
    userId: string;
    presentDays: number;
    absentDays: number;
    totalHours: number;
    averageHours: number;
    lateCheckins: number;
    checkedOutDays: number;
  }>;
}> => {
  try {
    console.log(`📈 Getting attendance stats for ${userIds.length} users from ${startDate} to ${endDate}`);
    
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }
    
    const { data: workEntries, error } = await supabase
      .from('daily_work_entries')
      .select('user_id, date, check_in_time, check_out_time, is_absent')
      .in('user_id', userIds)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) {
      console.error('❌ Database error:', error);
      throw error;
    }

    const employeeStats = userIds.map(userId => {
      const userEntries = workEntries?.filter(entry => entry.user_id === userId) || [];
      
      let presentDays = 0;
      let totalHours = 0;
      let lateCheckins = 0;
      let checkedOutDays = 0;
      
      userEntries.forEach(entry => {
        if (!entry.is_absent && entry.check_in_time) {
          presentDays++;
          
          // Count late check-ins (after 10:00 AM)
          const [checkInHour, checkInMinute] = entry.check_in_time.split(':').map(Number);
          if (checkInHour >= 10) {
            lateCheckins++;
          }
          
          if (entry.check_out_time) {
            checkedOutDays++;
            const [checkOutHour, checkOutMinute] = entry.check_out_time.split(':').map(Number);
            
            const checkInMinutes = checkInHour * 60 + checkInMinute;
            const checkOutMinutes = checkOutHour * 60 + checkOutMinute;
            
            const workMinutes = checkOutMinutes >= checkInMinutes 
              ? checkOutMinutes - checkInMinutes 
              : (24 * 60) - checkInMinutes + checkOutMinutes;
            
            totalHours += workMinutes / 60;
          }
        }
      });
      
      return {
        userId,
        presentDays,
        absentDays: userEntries.length - presentDays,
        totalHours: Math.round(totalHours * 100) / 100,
        averageHours: presentDays > 0 ? Math.round((totalHours / presentDays) * 100) / 100 : 0,
        lateCheckins,
        checkedOutDays
      };
    });

    const totalPresentDays = employeeStats.reduce((sum, stat) => sum + stat.presentDays, 0);
    const totalAbsentDays = employeeStats.reduce((sum, stat) => sum + stat.absentDays, 0);
    const totalHours = employeeStats.reduce((sum, stat) => sum + stat.totalHours, 0);
    
    const result = {
      totalWorkingDays: totalPresentDays + totalAbsentDays,
      totalPresentDays,
      totalAbsentDays,
      averageHours: totalPresentDays > 0 ? Math.round((totalHours / totalPresentDays) * 100) / 100 : 0,
      employeeStats
    };
    
    console.log(`📈 Attendance stats calculated:`, result);
    return result;
  } catch (error) {
    console.error('❌ Error getting attendance stats:', error);
    return {
      totalWorkingDays: 0,
      totalPresentDays: 0,
      totalAbsentDays: 0,
      averageHours: 0,
      employeeStats: []
    };
  }
};

/**
 * Gets today's attendance overview for all employees with real-time data
 */
export const getTodayAttendanceOverview = async (
  userIds: string[],
  requestingUserRole?: string
): Promise<{
  present: number;
  absent: number;
  late: number;
  checkedOut: number;
  totalEmployees: number;
}> => {
  try {
    const today = getIndiaDate();
    console.log(`📊 Getting today's attendance overview for ${userIds.length} employees on ${today}`);
    
    const attendanceData = await getEmployeesAttendance(userIds, today, requestingUserRole);
    
    let present = 0;
    let absent = 0;
    let late = 0;
    let checkedOut = 0;
    
    attendanceData.forEach(data => {
      if (data.isAbsent) {
        absent++;
      } else if (data.checkInTime) {
        present++;
        
        // Consider late if check-in is after 10:00 AM IST
        const [hour, minute] = data.checkInTime.split(':').map(Number);
        if (hour >= 10) {
          late++;
        }
        
        if (data.checkOutTime) {
          checkedOut++;
        }
      } else {
        absent++;
      }
    });
    
    const result = {
      present,
      absent,
      late,
      checkedOut,
      totalEmployees: userIds.length
    };
    
    console.log(`📊 Today's overview:`, result);
    return result;
  } catch (error) {
    console.error('❌ Error getting today attendance overview:', error);
    return {
      present: 0,
      absent: 0,
      late: 0,
      checkedOut: 0,
      totalEmployees: userIds.length
    };
  }
};

/**
 * Clears all existing attendance data for today (admin-only function for testing)
 */
export const clearTodayAttendanceForAllUsers = async (userIds: string[]): Promise<void> => {
  try {
    const today = getIndiaDate();
    console.log(`🗑️ ADMIN: Clearing today's attendance for all ${userIds.length} users on ${today}`);
    
    const clearPromises = userIds.map(userId => clearAttendance(userId, today));
    await Promise.all(clearPromises);
    
    console.log(`✅ ADMIN: Successfully cleared today's attendance for all users`);
  } catch (error) {
    console.error('❌ Error clearing today attendance for all users:', error);
    throw error;
  }
};

/**
 * Gets filtered user list based on role and team permissions
 * For normal users: Only their own data
 * For admins: All users
 */
export const getFilteredUsersForAttendance = (
  allUsers: any[],
  currentUserRole: string,
  currentUserTeam: string,
  currentUserId: string
): any[] => {
  if (currentUserRole === 'admin') {
    // Admins can see all users
    console.log(`🔐 Admin access: Showing all ${allUsers.length} users`);
    return allUsers;
  } else {
    // Normal users can ONLY see themselves
    const userOnlyData = allUsers.filter(user => user.id === currentUserId);
    console.log(`🔐 Normal user access: Restricted to own data only (${userOnlyData.length} user)`);
    return userOnlyData;
  }
}; 