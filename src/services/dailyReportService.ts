import { supabase } from '../utils/supabase';
import { DailyWorkEntry, TaskCompletion, DailyReport, WeeklyAnalytics, TeamAnalyticsData, TeamType, Task } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from 'date-fns';

// Daily Work Entry CRUD Operations
export const createDailyWorkEntry = async (entry: Omit<DailyWorkEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<DailyWorkEntry> => {
  const newEntry: DailyWorkEntry = {
    ...entry,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('daily_work_entries')
    .insert([newEntry])
    .select()
    .single();

  if (error) {
    console.error('Error creating daily work entry:', error);
    throw error;
  }

  return data;
};

export const updateDailyWorkEntry = async (entry: DailyWorkEntry): Promise<DailyWorkEntry> => {
  const updatedEntry = {
    ...entry,
    updatedAt: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('daily_work_entries')
    .update(updatedEntry)
    .eq('id', entry.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating daily work entry:', error);
    throw error;
  }

  return data;
};

export const getDailyWorkEntry = async (userId: string, date: string): Promise<DailyWorkEntry | null> => {
  const { data, error } = await supabase
    .from('daily_work_entries')
    .select('*')
    .eq('userId', userId)
    .eq('date', date)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
    console.error('Error fetching daily work entry:', error);
    throw error;
  }

  return data || null;
};

export const getDailyWorkEntries = async (filters?: {
  userId?: string;
  startDate?: string;
  endDate?: string;
  team?: TeamType;
}): Promise<DailyWorkEntry[]> => {
  let query = supabase.from('daily_work_entries').select('*');

  if (filters?.userId) {
    query = query.eq('userId', filters.userId);
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

  let entries = data || [];

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
  // Get work entry for the day
  const workEntry = await getDailyWorkEntry(userId, date);
  
  if (!workEntry) {
    return null;
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
    throw assignedError;
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
    throw completedError;
  }

  return {
    id: `${userId}-${date}`,
    userId,
    date,
    workEntry,
    tasks: {
      assigned: assignedTasks || [],
      completed: completedTasks || [],
    },
  };
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
  let entry = await getDailyWorkEntry(userId, date);
  
  if (!entry) {
    // Create a new entry for the day
    entry = await createDailyWorkEntry({
      userId,
      date,
      isAbsent: false,
      assignedTasks: [],
      completedTasks: [],
    });
  }
  
  return entry;
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
  const entry = await getOrCreateDailyWorkEntry(userId, date);
  
  // Remove from assigned if present
  entry.assignedTasks = entry.assignedTasks.filter(id => id !== taskId);
  
  // Add to completed if not already there
  if (!entry.completedTasks.includes(taskId)) {
    entry.completedTasks.push(taskId);
  }
  
  // Mark task as completed in the system
  await markTaskCompleted(taskId, userId);
  
  return await updateDailyWorkEntry(entry);
};

export const moveTaskToAssigned = async (userId: string, date: string, taskId: string): Promise<DailyWorkEntry> => {
  const entry = await getOrCreateDailyWorkEntry(userId, date);
  
  // Remove from completed if present
  entry.completedTasks = entry.completedTasks.filter(id => id !== taskId);
  
  // Add to assigned if not already there
  if (!entry.assignedTasks.includes(taskId)) {
    entry.assignedTasks.push(taskId);
  }
  
  // Unmark task as completed in the system
  await unmarkTaskCompleted(taskId, userId);
  
  return await updateDailyWorkEntry(entry);
};

export const updateCheckInOut = async (
  userId: string, 
  date: string, 
  checkInTime?: string, 
  checkOutTime?: string
): Promise<DailyWorkEntry> => {
  const entry = await getOrCreateDailyWorkEntry(userId, date);
  
  if (checkInTime !== undefined) {
    entry.checkInTime = checkInTime;
  }
  
  if (checkOutTime !== undefined) {
    entry.checkOutTime = checkOutTime;
  }
  
  return await updateDailyWorkEntry(entry);
};

export const markAbsent = async (userId: string, date: string, isAbsent: boolean): Promise<DailyWorkEntry> => {
  const entry = await getOrCreateDailyWorkEntry(userId, date);
  entry.isAbsent = isAbsent;
  
  // Clear check-in/out times if marking absent
  if (isAbsent) {
    entry.checkInTime = undefined;
    entry.checkOutTime = undefined;
  }
  
  return await updateDailyWorkEntry(entry);
}; 