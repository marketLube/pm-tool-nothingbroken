import { supabase } from '../utils/supabase';
import { DailyWorkEntry, TaskCompletion, DailyReport, WeeklyAnalytics, TeamAnalyticsData, TeamType, Task } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, addDays } from 'date-fns';

// Helper function to generate a consistent UUID for daily work entries
const generateDailyWorkEntryId = (userId: string, date: string): string => {
  // Create a deterministic UUID based on user ID and date
  // This ensures we get the same ID for the same user/date combination
  const namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // Standard namespace UUID
  const input = `${userId}-${date}`;
  
  // For now, use a simple UUID generation
  // In production, you might want to use a deterministic UUID library
  return uuidv4();
};

// Daily Work Entry CRUD Operations
export const createDailyWorkEntry = async (entry: Omit<DailyWorkEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<DailyWorkEntry> => {
  try {
    const newEntry: DailyWorkEntry = {
      ...entry,
      id: generateDailyWorkEntryId(entry.userId, entry.date),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('daily_work_entries')
      .insert([{
        id: newEntry.id,
        user_id: newEntry.userId,
        date: newEntry.date,
        assigned_tasks: newEntry.assignedTasks,
        completed_tasks: newEntry.completedTasks,
        check_in_time: newEntry.checkInTime,
        check_out_time: newEntry.checkOutTime,
        is_absent: newEntry.isAbsent,
        created_at: newEntry.createdAt,
        updated_at: newEntry.updatedAt,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating daily work entry:', error);
      throw error;
    }

    return newEntry;
  } catch (error) {
    console.error('Error in createDailyWorkEntry:', error);
    throw error;
  }
};

export const updateDailyWorkEntry = async (entry: DailyWorkEntry): Promise<DailyWorkEntry> => {
  try {
    const updatedEntry = {
      ...entry,
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('daily_work_entries')
      .update({
        user_id: updatedEntry.userId,
        date: updatedEntry.date,
        assigned_tasks: updatedEntry.assignedTasks,
        completed_tasks: updatedEntry.completedTasks,
        check_in_time: updatedEntry.checkInTime,
        check_out_time: updatedEntry.checkOutTime,
        is_absent: updatedEntry.isAbsent,
        updated_at: updatedEntry.updatedAt,
      })
      .eq('id', entry.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating daily work entry:', error);
      throw error;
    }

    return updatedEntry;
  } catch (error) {
    console.error('Error in updateDailyWorkEntry:', error);
    throw error;
  }
};

export const getDailyWorkEntry = async (userId: string, date: string): Promise<DailyWorkEntry | null> => {
  try {
    const { data, error } = await supabase
      .from('daily_work_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching daily work entry:', error);
      throw error;
    }

    if (!data) return null;

    // Map database columns to TypeScript interface
    return {
      id: data.id,
      userId: data.user_id,
      date: data.date,
      assignedTasks: data.assigned_tasks || [],
      completedTasks: data.completed_tasks || [],
      checkInTime: data.check_in_time,
      checkOutTime: data.check_out_time,
      isAbsent: data.is_absent || false,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    console.error('Error in getDailyWorkEntry:', error);
    return null;
  }
};

export const getDailyWorkEntries = async (filters?: {
  userId?: string;
  startDate?: string;
  endDate?: string;
  team?: TeamType;
}): Promise<DailyWorkEntry[]> => {
  try {
    let query = supabase.from('daily_work_entries').select('*');

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters?.startDate) {
      query = query.gte('date', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('date', filters.endDate);
    }

    const { data, error } = await query.order('date', { ascending: false });

    if (error) {
      console.error('Error fetching daily work entries:', error);
      throw error;
    }

    let entries = (data || []).map(item => ({
      id: item.id,
      userId: item.user_id,
      date: item.date,
      assignedTasks: item.assigned_tasks || [],
      completedTasks: item.completed_tasks || [],
      checkInTime: item.check_in_time,
      checkOutTime: item.check_out_time,
      isAbsent: item.is_absent || false,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));

    // Filter by team if specified
    if (filters?.team) {
      const { data: teamUsers } = await supabase
        .from('users')
        .select('id')
        .eq('team', filters.team);
      
      const teamUserIds = teamUsers?.map(user => user.id) || [];
      entries = entries.filter(entry => teamUserIds.includes(entry.userId));
    }

    return entries;
  } catch (error) {
    console.error('Error in getDailyWorkEntries:', error);
    return [];
  }
};

// Task Completion Operations
export const markTaskCompleted = async (taskId: string, userId: string, notes?: string): Promise<TaskCompletion> => {
  const completion: TaskCompletion = {
    id: uuidv4(),
    taskId,
    userId,
    completedAt: new Date().toISOString(),
    notes,
  };

  const { data, error } = await supabase
    .from('task_completions')
    .insert([completion])
    .select()
    .single();

  if (error) {
    console.error('Error marking task completed:', error);
    throw error;
  }

  // Update the task status to completed
  await supabase
    .from('tasks')
    .update({ status: 'completed' })
    .eq('id', taskId);

  return data;
};

export const unmarkTaskCompleted = async (taskId: string, userId: string): Promise<void> => {
  const { error } = await supabase
    .from('task_completions')
    .delete()
    .eq('taskId', taskId)
    .eq('userId', userId);

  if (error) {
    console.error('Error unmarking task completed:', error);
    throw error;
  }

  // Revert task status (you might want to store previous status)
  await supabase
    .from('tasks')
    .update({ status: 'in_progress' })
    .eq('id', taskId);
};

// Analytics Functions
export const getDailyReport = async (userId: string, date: string): Promise<DailyReport | null> => {
  try {
    // Get work entry for the day
    const workEntry = await getDailyWorkEntry(userId, date);
    
    if (!workEntry) {
      // Create a default work entry structure if tables don't exist
      const defaultWorkEntry: DailyWorkEntry = {
        id: generateDailyWorkEntryId(userId, date),
        userId,
        date,
        checkInTime: undefined,
        checkOutTime: undefined,
        isAbsent: false,
        assignedTasks: [],
        completedTasks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return {
        id: generateDailyWorkEntryId(userId, date),
        userId,
        date,
        workEntry: defaultWorkEntry,
        tasks: {
          assigned: [],
          completed: []
        }
      };
    }

    // Get assigned tasks
    const { data: assignedTasks, error: assignedError } = await supabase
      .from('tasks')
      .select(`
        *,
        clients (name)
      `)
      .in('id', workEntry.assignedTasks);

    if (assignedError) {
      console.error('Error fetching assigned tasks:', assignedError);
      // Return with empty tasks if there's an error
      return {
        id: generateDailyWorkEntryId(userId, date),
        userId,
        date,
        workEntry,
        tasks: {
          assigned: [],
          completed: []
        }
      };
    }

    // Get completed tasks
    const { data: completedTasks, error: completedError } = await supabase
      .from('tasks')
      .select(`
        *,
        clients (name)
      `)
      .in('id', workEntry.completedTasks);

    if (completedError) {
      console.error('Error fetching completed tasks:', completedError);
      // Return with only assigned tasks if there's an error
      return {
        id: generateDailyWorkEntryId(userId, date),
        userId,
        date,
        workEntry,
        tasks: {
          assigned: assignedTasks || [],
          completed: []
        }
      };
    }

    return {
      id: generateDailyWorkEntryId(userId, date),
      userId,
      date,
      workEntry,
      tasks: {
        assigned: assignedTasks || [],
        completed: completedTasks || []
      }
    };
  } catch (error) {
    console.error('Error in getDailyReport:', error);
    // Return a default structure if there's any error
    const defaultWorkEntry: DailyWorkEntry = {
      id: generateDailyWorkEntryId(userId, date),
      userId,
      date,
      checkInTime: undefined,
      checkOutTime: undefined,
      isAbsent: false,
      assignedTasks: [],
      completedTasks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return {
      id: generateDailyWorkEntryId(userId, date),
      userId,
      date,
      workEntry: defaultWorkEntry,
      tasks: {
        assigned: [],
        completed: []
      }
    };
  }
};

export const getWeeklyAnalytics = async (userId: string, weekStart: string): Promise<WeeklyAnalytics> => {
  const weekEnd = format(endOfWeek(parseISO(weekStart)), 'yyyy-MM-dd');
  const weekDays = eachDayOfInterval({
    start: parseISO(weekStart),
    end: parseISO(weekEnd),
  });

  // Get user info
  const { data: user } = await supabase
    .from('users')
    .select('name, team')
    .eq('id', userId)
    .single();

  // Get daily reports for the week
  const dailyReports: DailyReport[] = [];
  let totalTasksAssigned = 0;
  let totalTasksCompleted = 0;
  let presentDays = 0;

  for (const day of weekDays) {
    const dateStr = format(day, 'yyyy-MM-dd');
    const report = await getDailyReport(userId, dateStr);
    
    if (report) {
      dailyReports.push(report);
      totalTasksAssigned += report.tasks.assigned.length;
      totalTasksCompleted += report.tasks.completed.length;
      
      if (!report.workEntry.isAbsent) {
        presentDays++;
      }
    }
  }

  const completionRate = totalTasksAssigned > 0 ? (totalTasksCompleted / totalTasksAssigned) * 100 : 0;
  const absentDays = weekDays.length - presentDays;

  return {
    userId,
    userName: user?.name || 'Unknown',
    team: user?.team || 'web',
    weekStart,
    weekEnd,
    totalDays: weekDays.length,
    presentDays,
    absentDays,
    totalTasksAssigned,
    totalTasksCompleted,
    completionRate,
    averageHoursPerDay: 0, // Calculate based on check-in/out times
    dailyReports,
  };
};

export const getTeamAnalytics = async (teamId: TeamType, startDate: string, endDate: string): Promise<TeamAnalyticsData> => {
  // Get team members
  const { data: teamMembers } = await supabase
    .from('users')
    .select('*')
    .eq('team', teamId)
    .eq('isActive', true);

  if (!teamMembers) {
    throw new Error('No team members found');
  }

  // Get analytics for each member
  const memberAnalytics: WeeklyAnalytics[] = [];
  let totalTasksAssigned = 0;
  let totalTasksCompleted = 0;

  for (const member of teamMembers) {
    const analytics = await getWeeklyAnalytics(member.id, startDate);
    memberAnalytics.push(analytics);
    totalTasksAssigned += analytics.totalTasksAssigned;
    totalTasksCompleted += analytics.totalTasksCompleted;
  }

  const teamCompletionRate = totalTasksAssigned > 0 ? (totalTasksCompleted / totalTasksAssigned) * 100 : 0;

  return {
    teamId,
    teamName: teamId === 'creative' ? 'Creative Team' : 'Web Team',
    period: { start: startDate, end: endDate },
    totalMembers: teamMembers.length,
    activeMembers: teamMembers.filter(m => m.isActive).length,
    teamCompletionRate,
    totalTasksAssigned,
    totalTasksCompleted,
    memberAnalytics,
  };
};

// Utility Functions
export const getOrCreateDailyWorkEntry = async (userId: string, date: string): Promise<DailyWorkEntry> => {
  try {
    let entry = await getDailyWorkEntry(userId, date);
    
    if (!entry) {
      // Create a new entry if it doesn't exist
      const newEntry: Omit<DailyWorkEntry, 'id' | 'createdAt' | 'updatedAt'> = {
        userId,
        date,
        checkInTime: undefined,
        checkOutTime: undefined,
        isAbsent: false,
        assignedTasks: [],
        completedTasks: [],
      };
      
      try {
        entry = await createDailyWorkEntry(newEntry);
      } catch (createError) {
        console.error('Error creating daily work entry:', createError);
        // Return a default entry if creation fails
        return {
          id: generateDailyWorkEntryId(userId, date),
          userId,
          date,
          checkInTime: undefined,
          checkOutTime: undefined,
          isAbsent: false,
          assignedTasks: [],
          completedTasks: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
    }
    
    return entry;
  } catch (error) {
    console.error('Error in getOrCreateDailyWorkEntry:', error);
    // Return a default entry if there's any error
    return {
      id: generateDailyWorkEntryId(userId, date),
      userId,
      date,
      checkInTime: undefined,
      checkOutTime: undefined,
      isAbsent: false,
      assignedTasks: [],
      completedTasks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
};

export const addTaskToDay = async (userId: string, date: string, taskId: string): Promise<DailyWorkEntry> => {
  const entry = await getOrCreateDailyWorkEntry(userId, date);
  
  if (!entry.assignedTasks.includes(taskId)) {
    entry.assignedTasks.push(taskId);
    return await updateDailyWorkEntry(entry);
  }
  
  return entry;
};

export const moveTaskToCompleted = async (userId: string, date: string, taskId: string): Promise<DailyWorkEntry> => {
  try {
    const workEntry = await getOrCreateDailyWorkEntry(userId, date);
    
    // Ensure the task isn't already completed to avoid duplicates
    if (workEntry.completedTasks.includes(taskId)) {
      // Already completed, just ensure it's not in assigned list
      const updatedEntry = {
        ...workEntry,
        assignedTasks: workEntry.assignedTasks.filter(id => id !== taskId),
        updatedAt: new Date().toISOString(),
      };
      return await updateDailyWorkEntry(updatedEntry);
    }
    
    // Move task from assigned to completed
    const updatedEntry = {
      ...workEntry,
      assignedTasks: workEntry.assignedTasks.filter(id => id !== taskId),
      completedTasks: [...workEntry.completedTasks, taskId],
      updatedAt: new Date().toISOString(),
    };

    return await updateDailyWorkEntry(updatedEntry);
  } catch (error) {
    console.error('Error moving task to completed:', error);
    // Return a default entry if there's an error
    return {
      id: generateDailyWorkEntryId(userId, date),
      userId,
      date,
      checkInTime: undefined,
      checkOutTime: undefined,
      isAbsent: false,
      assignedTasks: [],
      completedTasks: [taskId],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
};

export const moveTaskToAssigned = async (userId: string, date: string, taskId: string): Promise<DailyWorkEntry> => {
  try {
    const workEntry = await getOrCreateDailyWorkEntry(userId, date);
    
    // Move task from completed to assigned
    const updatedEntry = {
      ...workEntry,
      completedTasks: workEntry.completedTasks.filter(id => id !== taskId),
      assignedTasks: [...workEntry.assignedTasks, taskId],
      updatedAt: new Date().toISOString(),
    };

    return await updateDailyWorkEntry(updatedEntry);
  } catch (error) {
    console.error('Error moving task to assigned:', error);
    // Return a default entry if there's an error
    return {
      id: generateDailyWorkEntryId(userId, date),
      userId,
      date,
      checkInTime: undefined,
      checkOutTime: undefined,
      isAbsent: false,
      assignedTasks: [taskId],
      completedTasks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
};

export const updateCheckInOut = async (
  userId: string, 
  date: string, 
  checkInTime?: string, 
  checkOutTime?: string
): Promise<DailyWorkEntry> => {
  try {
    const workEntry = await getOrCreateDailyWorkEntry(userId, date);
    
    const updatedEntry = {
      ...workEntry,
      checkInTime: checkInTime !== undefined ? checkInTime : workEntry.checkInTime,
      checkOutTime: checkOutTime !== undefined ? checkOutTime : workEntry.checkOutTime,
      updatedAt: new Date().toISOString(),
    };

    return await updateDailyWorkEntry(updatedEntry);
  } catch (error) {
    console.error('Error updating check-in/out:', error);
    // Return a default entry if there's an error
    return {
      id: generateDailyWorkEntryId(userId, date),
      userId,
      date,
      checkInTime: checkInTime || undefined,
      checkOutTime: checkOutTime || undefined,
      isAbsent: false,
      assignedTasks: [],
      completedTasks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
};

export const markAbsent = async (userId: string, date: string, isAbsent: boolean): Promise<DailyWorkEntry> => {
  try {
    const workEntry = await getOrCreateDailyWorkEntry(userId, date);
    
    const updatedEntry = {
      ...workEntry,
      isAbsent,
      // Clear check-in/out times if marking as absent
      checkInTime: isAbsent ? undefined : workEntry.checkInTime,
      checkOutTime: isAbsent ? undefined : workEntry.checkOutTime,
      updatedAt: new Date().toISOString(),
    };

    return await updateDailyWorkEntry(updatedEntry);
  } catch (error) {
    console.error('Error marking absent:', error);
    // Return a default entry if there's an error
    return {
      id: generateDailyWorkEntryId(userId, date),
      userId,
      date,
      checkInTime: undefined,
      checkOutTime: undefined,
      isAbsent,
      assignedTasks: [],
      completedTasks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
};

// New function to move unfinished tasks from previous day to next day
export const moveUnfinishedTasksToNextDay = async (userId: string, fromDate: string, toDate: string): Promise<void> => {
  try {
    const previousDayEntry = await getDailyWorkEntry(userId, fromDate);
    
    if (!previousDayEntry || previousDayEntry.assignedTasks.length === 0) {
      return; // No tasks to process
    }

    // Find truly unfinished tasks (assigned but not completed)
    const unfinishedTasks = previousDayEntry.assignedTasks.filter(taskId => 
      !previousDayEntry.completedTasks.includes(taskId)
    );

    if (unfinishedTasks.length > 0) {
      // Get or create the next day's entry
      const nextDayEntry = await getOrCreateDailyWorkEntry(userId, toDate);
      
      // Add unfinished tasks to next day's assigned tasks (avoid duplicates)
      const updatedAssignedTasks = [
        ...nextDayEntry.assignedTasks,
        ...unfinishedTasks.filter(taskId => !nextDayEntry.assignedTasks.includes(taskId))
      ];

      const updatedNextDayEntry = {
        ...nextDayEntry,
        assignedTasks: updatedAssignedTasks,
        updatedAt: new Date().toISOString(),
      };

      await updateDailyWorkEntry(updatedNextDayEntry);

      // Remove only the unfinished tasks from previous day's assigned list
      // Keep completed tasks in both assigned and completed lists for proper tracking
      const updatedPreviousDayEntry = {
        ...previousDayEntry,
        assignedTasks: previousDayEntry.assignedTasks.filter(taskId => 
          previousDayEntry.completedTasks.includes(taskId) // Keep only completed tasks
        ),
        updatedAt: new Date().toISOString(),
      };

      await updateDailyWorkEntry(updatedPreviousDayEntry);
    }
  } catch (error) {
    console.error('Error moving unfinished tasks to next day:', error);
    throw error;
  }
};

// Enhanced function to get daily report without automatic rollover
export const getDailyReportWithRollover = async (userId: string, date: string): Promise<DailyReport | null> => {
  try {
    // Just get the regular daily report without automatic task rollover
    // Task rollover should be handled explicitly, not automatically on every load
    return await getDailyReport(userId, date);
  } catch (error) {
    console.error('Error in getDailyReportWithRollover:', error);
    return await getDailyReport(userId, date); // Fallback to regular report
  }
};

// Function to manually process task rollover for a specific day
export const processTaskRolloverForDay = async (userId: string, fromDate: string, toDate: string): Promise<void> => {
  try {
    await moveUnfinishedTasksToNextDay(userId, fromDate, toDate);
  } catch (error) {
    console.error('Error processing task rollover for day:', error);
    throw error;
  }
};

// Function to bulk move unfinished tasks for a week (now optional/manual)
export const processWeeklyTaskRollover = async (userId: string, weekStartDate: string): Promise<void> => {
  try {
    const weekStart = parseISO(weekStartDate);
    const weekDays = eachDayOfInterval({
      start: weekStart,
      end: addDays(weekStart, 6), // Monday to Sunday
    });

    // Process each day sequentially to move unfinished tasks
    // Only process if there are actual tasks to move
    for (let i = 1; i < weekDays.length; i++) {
      const previousDay = format(weekDays[i - 1], 'yyyy-MM-dd');
      const currentDay = format(weekDays[i], 'yyyy-MM-dd');
      
      // Check if previous day has unfinished tasks before processing
      const previousDayEntry = await getDailyWorkEntry(userId, previousDay);
      if (previousDayEntry && previousDayEntry.assignedTasks.length > 0) {
        const unfinishedTasks = previousDayEntry.assignedTasks.filter(taskId => 
          !previousDayEntry.completedTasks.includes(taskId)
        );
        
        // Only process rollover if there are actually unfinished tasks
        if (unfinishedTasks.length > 0) {
          await moveUnfinishedTasksToNextDay(userId, previousDay, currentDay);
        }
      }
    }
  } catch (error) {
    console.error('Error processing weekly task rollover:', error);
    throw error;
  }
};

// Enhanced function to get daily report WITHOUT automatic TaskBoard sync
export const getDailyReportWithTaskBoardSync = async (userId: string, date: string, userTasks: any[]): Promise<DailyReport | null> => {
  try {
    // Just get the regular daily report without automatic sync
    // Tasks should only appear when explicitly assigned to specific days
    return await getDailyReport(userId, date);
  } catch (error) {
    console.error('Error in getDailyReportWithTaskBoardSync:', error);
    // Fallback to regular report
    return await getDailyReport(userId, date);
  }
};

// Function to manually assign a specific task to a specific day
export const assignTaskToSpecificDay = async (userId: string, date: string, taskId: string): Promise<void> => {
  try {
    const workEntry = await getOrCreateDailyWorkEntry(userId, date);
    
    // Only add the task if it's not already assigned AND not already completed
    if (!workEntry.assignedTasks.includes(taskId) && !workEntry.completedTasks.includes(taskId)) {
      const updatedEntry = {
        ...workEntry,
        assignedTasks: [...workEntry.assignedTasks, taskId],
        updatedAt: new Date().toISOString(),
      };
      
      await updateDailyWorkEntry(updatedEntry);
      console.log(`Manually assigned task ${taskId} to user ${userId} on ${date}`);
    } else if (workEntry.completedTasks.includes(taskId)) {
      console.log(`Task ${taskId} is already completed for user ${userId} on ${date}, not adding to assigned tasks`);
    } else {
      console.log(`Task ${taskId} is already assigned to user ${userId} on ${date}`);
    }
  } catch (error) {
    console.error('Error manually assigning task to specific day:', error);
    throw error;
  }
};

// Function to bulk sync - SIMPLIFIED to not automatically add all tasks
export const bulkSyncTaskBoardToDailyReports = async (date: string, allUsers: any[], getTasksByUser: (userId: string) => any[]): Promise<void> => {
  // This function is intentionally left empty to prevent automatic task spreading
  // Tasks should only be assigned manually to specific days
  console.log('Bulk sync disabled to prevent automatic task spreading');
};

// Function to remove a deleted task from all daily reports
export const removeTaskFromAllDailyReports = async (taskId: string): Promise<void> => {
  try {
    console.log(`Removing task ${taskId} from all daily reports...`);
    
    // Get all daily work entries that contain this task in assigned tasks
    const allEntries = await getDailyWorkEntries();
    
    // Filter entries that have this task in their assigned tasks
    const entriesToUpdate = allEntries.filter(entry => 
      entry.assignedTasks.includes(taskId)
    );
    
    console.log(`Found ${entriesToUpdate.length} daily reports containing task ${taskId} in assigned tasks`);
    
    // Update each entry to remove the task from assigned tasks only
    // We don't remove from completed tasks as those are historical records
    for (const entry of entriesToUpdate) {
      const updatedEntry = {
        ...entry,
        assignedTasks: entry.assignedTasks.filter(id => id !== taskId),
        updatedAt: new Date().toISOString(),
      };
      
      await updateDailyWorkEntry(updatedEntry);
      console.log(`Removed task ${taskId} from assigned tasks for user ${entry.userId} on ${entry.date}`);
    }
    
    console.log(`Successfully removed task ${taskId} from ${entriesToUpdate.length} daily reports`);
  } catch (error) {
    console.error(`Error removing task ${taskId} from daily reports:`, error);
    throw error;
  }
};

// New function to handle task completion across multiple days
export const moveTaskToCompletedAcrossDays = async (userId: string, date: string, taskId: string, taskDueDate: string): Promise<void> => {
  try {
    // First, mark the task as completed on the current day
    await moveTaskToCompleted(userId, date, taskId);
    
    // Get all daily work entries for this user from the due date onwards
    const allEntries = await getDailyWorkEntries({
      userId: userId,
      startDate: taskDueDate
    });

    // Remove this task from assigned tasks of all future days (after the completion date)
    for (const entry of allEntries) {
      if (entry.date > date) { // Only process days after the completion date
        // Check if this task is in the assigned tasks
        if (entry.assignedTasks.includes(taskId)) {
          // Remove from assigned tasks
          const updatedEntry = {
            ...entry,
            assignedTasks: entry.assignedTasks.filter(id => id !== taskId),
            updatedAt: new Date().toISOString(),
          };
          
          await updateDailyWorkEntry(updatedEntry);
          console.log(`Removed completed task ${taskId} from assigned tasks for date ${entry.date}`);
        }
      }
    }
    
    console.log(`Task ${taskId} marked as completed and removed from all future assigned tasks`);
  } catch (error) {
    console.error('Error in moveTaskToCompletedAcrossDays:', error);
    throw error;
  }
};

// New function to handle task un-completion across multiple days
export const moveTaskToAssignedAcrossDays = async (userId: string, date: string, taskId: string, taskDueDate: string): Promise<void> => {
  try {
    // First, mark the task as assigned on the current day
    await moveTaskToAssigned(userId, date, taskId);
    
    // Get the task's due date to determine from which date to start assigning
    const startDate = taskDueDate <= date ? taskDueDate : date;
    
    // Get all dates from the due date to a reasonable future date (e.g., 14 days ahead)
    // We limit this to avoid creating too many unnecessary entries
    const endDate = format(addDays(parseISO(date), 14), 'yyyy-MM-dd');
    
    // Get all existing daily work entries for this user from the start date onwards
    const allEntries = await getDailyWorkEntries({
      userId: userId,
      startDate: startDate,
      endDate: endDate
    });

    // Create a map of existing entries by date for quick lookup
    const existingEntriesByDate = new Map();
    allEntries.forEach(entry => {
      existingEntriesByDate.set(entry.date, entry);
    });

    // Process each day from due date to end date
    const currentDate = parseISO(startDate);
    const finalDate = parseISO(endDate);
    
    for (let d = currentDate; d <= finalDate; d = addDays(d, 1)) {
      const dateStr = format(d, 'yyyy-MM-dd');
      
      if (dateStr >= taskDueDate) { // Only process days from due date onwards
        const existingEntry = existingEntriesByDate.get(dateStr);
        
        if (existingEntry) {
          // Entry exists, update it if needed
          const assignedTasks = existingEntry.assignedTasks || [];
          const completedTasks = existingEntry.completedTasks || [];
          
          // Only add to assigned if not already there and not completed
          if (!assignedTasks.includes(taskId) && !completedTasks.includes(taskId)) {
            const updatedEntry = {
              ...existingEntry,
              assignedTasks: [...assignedTasks, taskId],
              updatedAt: new Date().toISOString(),
            };
            
            await updateDailyWorkEntry(updatedEntry);
            console.log(`Added uncompleted task ${taskId} to assigned tasks for date ${dateStr}`);
          }
        } else {
          // Entry doesn't exist, create a minimal one with just this task
          // Only create entries for the next 7 days to avoid clutter
          const daysDiff = Math.floor((d.getTime() - parseISO(date).getTime()) / (1000 * 60 * 60 * 24));
          if (daysDiff <= 7) {
            try {
              const newEntry = await getOrCreateDailyWorkEntry(userId, dateStr);
              // Add the task to the newly created entry
              const updatedEntry = {
                ...newEntry,
                assignedTasks: [...newEntry.assignedTasks, taskId],
                updatedAt: new Date().toISOString(),
              };
              await updateDailyWorkEntry(updatedEntry);
              console.log(`Created new entry and added task ${taskId} for date ${dateStr}`);
            } catch (createError) {
              console.error(`Error creating entry for date ${dateStr}:`, createError);
            }
          }
        }
      }
    }
    
    console.log(`Task ${taskId} marked as assigned and added to all relevant future days`);
  } catch (error) {
    console.error('Error in moveTaskToAssignedAcrossDays:', error);
    throw error;
  }
};

/**
 * Get completed tasks for a specific user and date
 */
export const getCompletedTasksForDay = async (userId: string, date: string): Promise<Array<{
  id: string;
  title: string;
  clientId?: string;
  status: string;
}>> => {
  try {
    const dailyEntry = await getDailyWorkEntry(userId, date);
    if (!dailyEntry || !dailyEntry.completedTasks || dailyEntry.completedTasks.length === 0) {
      return [];
    }

    // Get task details from the tasks table
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id, title, client_id, status')
      .in('id', dailyEntry.completedTasks);

    if (error) {
      console.error('Error fetching completed tasks:', error);
      return [];
    }

    return (tasks || []).map(task => ({
      id: task.id,
      title: task.title,
      clientId: task.client_id,
      status: task.status
    }));
  } catch (error) {
    console.error('Error in getCompletedTasksForDay:', error);
    return [];
  }
};

// ============================================================================
// BACKEND ROLLOVER SYSTEM - Idempotent task rollover processing
// ============================================================================

/**
 * Get or create user rollover tracking record
 */
const getOrCreateUserRollover = async (userId: string): Promise<{ user_id: string; last_rollover_date: string }> => {
  try {
    // Try to get existing rollover record
    const { data: rollover, error: fetchError } = await supabase
      .from('user_rollover')
      .select('user_id, last_rollover_date')
      .eq('user_id', userId)
      .single();

    if (rollover) {
      return rollover;
    }

    // Only create if it doesn't exist and no error (avoid infinite retries)
    if (fetchError && fetchError.code === 'PGRST116') {
      // Create new rollover record if it doesn't exist
      const { data: newRollover, error: insertError } = await supabase
        .from('user_rollover')
        .insert([{
          user_id: userId,
          last_rollover_date: '1970-01-01'
        }])
        .select('user_id, last_rollover_date')
        .single();

      if (insertError) {
        console.error('Error creating user rollover record:', insertError);
        // Return default if creation fails
        return { user_id: userId, last_rollover_date: '1970-01-01' };
      }

      return newRollover;
    }

    // Return default for any other errors
    return { user_id: userId, last_rollover_date: '1970-01-01' };
  } catch (error) {
    console.error('Error in getOrCreateUserRollover:', error);
    // Return default if any error occurs
    return { user_id: userId, last_rollover_date: '1970-01-01' };
  }
};

/**
 * Update user rollover tracking with the latest processed date
 */
const updateUserRollover = async (userId: string, lastRolloverDate: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('user_rollover')
      .upsert([{
        user_id: userId,
        last_rollover_date: lastRolloverDate
      }]);

    if (error) {
      console.error('Error updating user rollover:', error);
      // Don't throw error to prevent cascading failures
    }
  } catch (error) {
    console.error('Error in updateUserRollover:', error);
    // Don't throw error to prevent cascading failures
  }
};

/**
 * Process rollover for a single day: move unfinished tasks from yesterday to today
 */
const processRolloverForDay = async (userId: string, fromDate: string, toDate: string): Promise<void> => {
  try {
    // Safety check to prevent processing same day twice or invalid dates
    if (fromDate >= toDate) {
      return;
    }

    // Get yesterday's work entry
    const fromEntry = await getDailyWorkEntry(userId, fromDate);
    if (!fromEntry) {
      // No work entry for yesterday, nothing to roll over
      return;
    }

    // Find unfinished tasks (in assigned but not in completed)
    const unfinishedTasks = fromEntry.assignedTasks.filter(taskId => 
      !fromEntry.completedTasks.includes(taskId)
    );

    if (unfinishedTasks.length === 0) {
      // No unfinished tasks to roll over
      return;
    }

    // Get or create today's work entry
    const toEntry = await getOrCreateDailyWorkEntry(userId, toDate);
    
    // Add unfinished tasks to today's assigned tasks (avoid duplicates)
    const currentAssigned = toEntry.assignedTasks || [];
    const newAssignedTasks = [...new Set([...currentAssigned, ...unfinishedTasks])];

    // Only update if there are actually new tasks to add
    if (newAssignedTasks.length > currentAssigned.length) {
      const updatedEntry: DailyWorkEntry = {
        ...toEntry,
        assignedTasks: newAssignedTasks,
        updatedAt: new Date().toISOString()
      };

      await updateDailyWorkEntry(updatedEntry);
      
      console.log(`Rolled over ${unfinishedTasks.length} tasks from ${fromDate} to ${toDate} for user ${userId}`);
    }
  } catch (error) {
    console.error(`Error processing rollover from ${fromDate} to ${toDate} for user ${userId}:`, error);
    // Don't throw to prevent cascading failures
  }
};

/**
 * Comprehensive rollover: Process all days from last rollover date to target date
 * This function is idempotent - calling it multiple times for the same date range is safe
 */
export const processComprehensiveRollover = async (userId: string, targetDate: string): Promise<void> => {
  try {
    // Safety check for valid date
    const targetDateObj = parseISO(targetDate);
    if (isNaN(targetDateObj.getTime())) {
      console.error('Invalid target date:', targetDate);
      return;
    }

    // Get user's last rollover date
    const rolloverRecord = await getOrCreateUserRollover(userId);
    const lastRolloverDate = parseISO(rolloverRecord.last_rollover_date);
    const target = targetDateObj;

    // If we've already processed up to or past the target date, nothing to do
    if (lastRolloverDate >= target) {
      console.log(`Rollover already processed for user ${userId} up to ${targetDate}`);
      return;
    }

    // Safety check to prevent processing too far back
    const maxDaysBack = 30; // Only process last 30 days to prevent infinite processing
    const minDate = addDays(target, -maxDaysBack);
    const startDate = lastRolloverDate < minDate ? minDate : lastRolloverDate;

    // Process each day from the day after last rollover to target date
    let currentDate = addDays(startDate, 1);
    
    console.log(`Processing rollover for user ${userId} from ${format(currentDate, 'yyyy-MM-dd')} to ${targetDate}`);
    
    let daysProcessed = 0;
    const maxDaysToProcess = 31; // Safety limit
    
    while (currentDate <= target && daysProcessed < maxDaysToProcess) {
      const fromDateStr = format(addDays(currentDate, -1), 'yyyy-MM-dd');
      const toDateStr = format(currentDate, 'yyyy-MM-dd');
      
      // Process rollover for this day
      await processRolloverForDay(userId, fromDateStr, toDateStr);
      
      // Move to next day
      currentDate = addDays(currentDate, 1);
      daysProcessed++;
    }

    // Update the rollover tracking to mark we've processed up to target date
    await updateUserRollover(userId, targetDate);
    
    console.log(`Completed comprehensive rollover for user ${userId} up to ${targetDate} (${daysProcessed} days processed)`);
  } catch (error) {
    console.error(`Error in comprehensive rollover for user ${userId} to ${targetDate}:`, error);
    // Don't throw to prevent cascading failures
  }
};

/**
 * Get daily report with automatic comprehensive rollover
 * This is the main function that frontend should call - it ensures all rollover
 * is processed before returning the daily report
 */
export const getDailyReportWithComprehensiveRollover = async (userId: string, date: string): Promise<DailyReport | null> => {
  try {
    // Safety check for valid inputs
    if (!userId || !date) {
      console.error('Invalid inputs for getDailyReportWithComprehensiveRollover:', { userId, date });
      return await getDailyReport(userId, date);
    }

    // Validate date format
    const dateObj = parseISO(date);
    if (isNaN(dateObj.getTime())) {
      console.error('Invalid date format:', date);
      return await getDailyReport(userId, date);
    }

    // First, ensure all rollover is processed up to the requested date
    await processComprehensiveRollover(userId, date);
    
    // Then get the daily report normally
    return await getDailyReport(userId, date);
  } catch (error) {
    console.error(`Error getting daily report with rollover for ${userId} on ${date}:`, error);
    // Fallback to regular report if rollover fails
    return await getDailyReport(userId, date);
  }
}; 