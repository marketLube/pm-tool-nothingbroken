import { format } from 'date-fns';
import { updateCheckInOut, getDailyWorkEntry } from './dailyReportService';
import { supabase } from '../utils/supabase';

/**
 * Records the first login time of the day as check-in time
 * Only sets check-in if it hasn't been set already for the current date
 */
export const recordLoginAsCheckIn = async (userId: string): Promise<void> => {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');
    const currentTime = format(new Date(), 'HH:mm');
    
    // Check if user already has a check-in time for today
    const existingEntry = await getDailyWorkEntry(userId, today);
    
    // Only set check-in time if it hasn't been set already
    if (!existingEntry?.checkInTime) {
      await updateCheckInOut(userId, today, currentTime, undefined);
      console.log(`Auto check-in recorded for user ${userId} at ${currentTime} on ${today}`);
    } else {
      console.log(`User ${userId} already checked in today at ${existingEntry.checkInTime}`);
    }
  } catch (error) {
    console.error('Error recording login as check-in:', error);
    // Don't throw error to avoid disrupting login process
  }
};

/**
 * Manually sets check-out time for a user
 */
export const recordCheckOut = async (userId: string, checkOutTime?: string): Promise<void> => {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');
    const timeToRecord = checkOutTime || format(new Date(), 'HH:mm');
    
    await updateCheckInOut(userId, today, undefined, timeToRecord);
    console.log(`Check-out recorded for user ${userId} at ${timeToRecord} on ${today}`);
  } catch (error) {
    console.error('Error recording check-out:', error);
    throw error;
  }
};

/**
 * Gets the current attendance status for a user on a specific date
 */
export const getAttendanceStatus = async (userId: string, date?: string): Promise<{
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  isAbsent: boolean;
  totalHours?: number;
}> => {
  try {
    const targetDate = date || format(new Date(), 'yyyy-MM-dd');
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
    
    return {
      date: targetDate,
      checkInTime: workEntry?.checkInTime,
      checkOutTime: workEntry?.checkOutTime,
      isAbsent: workEntry?.isAbsent || false,
      totalHours
    };
  } catch (error) {
    console.error('Error getting attendance status:', error);
    return {
      date: date || format(new Date(), 'yyyy-MM-dd'),
      isAbsent: false
    };
  }
};

/**
 * Updates check-in time manually (for corrections)
 */
export const updateCheckInTime = async (userId: string, checkInTime: string, date?: string): Promise<void> => {
  try {
    const targetDate = date || format(new Date(), 'yyyy-MM-dd');
    await updateCheckInOut(userId, targetDate, checkInTime, undefined);
    console.log(`Check-in time updated for user ${userId} to ${checkInTime} on ${targetDate}`);
  } catch (error) {
    console.error('Error updating check-in time:', error);
    throw error;
  }
};

/**
 * Clears attendance for a specific date (admin function)
 */
export const clearAttendance = async (userId: string, date?: string): Promise<void> => {
  try {
    const targetDate = date || format(new Date(), 'yyyy-MM-dd');
    await updateCheckInOut(userId, targetDate, undefined, undefined);
    console.log(`Attendance cleared for user ${userId} on ${targetDate}`);
  } catch (error) {
    console.error('Error clearing attendance:', error);
    throw error;
  }
};

/**
 * Gets attendance data for multiple employees for a specific date
 */
export const getEmployeesAttendance = async (userIds: string[], date?: string): Promise<Array<{
  userId: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  isAbsent: boolean;
  totalHours?: number;
}>> => {
  try {
    const targetDate = date || format(new Date(), 'yyyy-MM-dd');
    const attendancePromises = userIds.map(userId => getAttendanceStatus(userId, targetDate));
    const attendanceData = await Promise.all(attendancePromises);
    
    return attendanceData.map((data, index) => ({
      userId: userIds[index],
      ...data
    }));
  } catch (error) {
    console.error('Error getting employees attendance:', error);
    return [];
  }
};

/**
 * Gets attendance statistics for a date range
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
  }>;
}> => {
  try {
    const { data: workEntries, error } = await supabase
      .from('daily_work_entries')
      .select('user_id, date, check_in_time, check_out_time, is_absent')
      .in('user_id', userIds)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) throw error;

    const employeeStats = userIds.map(userId => {
      const userEntries = workEntries?.filter(entry => entry.user_id === userId) || [];
      
      let presentDays = 0;
      let totalHours = 0;
      
      userEntries.forEach(entry => {
        if (!entry.is_absent && entry.check_in_time) {
          presentDays++;
          
          if (entry.check_out_time) {
            const [checkInHour, checkInMinute] = entry.check_in_time.split(':').map(Number);
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
        averageHours: presentDays > 0 ? Math.round((totalHours / presentDays) * 100) / 100 : 0
      };
    });

    const totalPresentDays = employeeStats.reduce((sum, stat) => sum + stat.presentDays, 0);
    const totalAbsentDays = employeeStats.reduce((sum, stat) => sum + stat.absentDays, 0);
    const totalHours = employeeStats.reduce((sum, stat) => sum + stat.totalHours, 0);
    
    return {
      totalWorkingDays: totalPresentDays + totalAbsentDays,
      totalPresentDays,
      totalAbsentDays,
      averageHours: totalPresentDays > 0 ? Math.round((totalHours / totalPresentDays) * 100) / 100 : 0,
      employeeStats
    };
  } catch (error) {
    console.error('Error getting attendance stats:', error);
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
 * Gets today's attendance overview for all employees
 */
export const getTodayAttendanceOverview = async (userIds: string[]): Promise<{
  present: number;
  absent: number;
  late: number;
  checkedOut: number;
  totalEmployees: number;
}> => {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');
    const attendanceData = await getEmployeesAttendance(userIds, today);
    
    let present = 0;
    let absent = 0;
    let late = 0;
    let checkedOut = 0;
    
    attendanceData.forEach(data => {
      if (data.isAbsent) {
        absent++;
      } else if (data.checkInTime) {
        present++;
        
        // Consider late if check-in is after 9:30 AM
        const [hour, minute] = data.checkInTime.split(':').map(Number);
        if (hour > 9 || (hour === 9 && minute > 30)) {
          late++;
        }
        
        if (data.checkOutTime) {
          checkedOut++;
        }
      } else {
        absent++;
      }
    });
    
    return {
      present,
      absent,
      late,
      checkedOut,
      totalEmployees: userIds.length
    };
  } catch (error) {
    console.error('Error getting today attendance overview:', error);
    return {
      present: 0,
      absent: 0,
      late: 0,
      checkedOut: 0,
      totalEmployees: userIds.length
    };
  }
}; 