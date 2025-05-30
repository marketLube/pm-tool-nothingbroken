import React, { useState, useEffect, useRef } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, addDays, startOfDay, isSameDay } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  Calendar,
  Clock,
  Plus,
  CheckCircle,
  Circle,
  Users,
  Filter,
  BarChart3,
  TrendingUp,
  AlertCircle,
  User,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Target,
  Activity,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { TeamType, DailyReport, Task, DailyWorkEntry } from '../types';
import * as dailyReportService from '../services/dailyReportService';

interface DailyCardProps {
  userId: string;
  date: string;
  report: DailyReport | null;
  onTaskToggle: (taskId: string, completed: boolean) => void;
  onAddTask: () => void;
  onAbsentToggle: (isAbsent: boolean) => void;
  onCheckInOut: (checkIn?: string, checkOut?: string) => void;
  isAdmin: boolean;
  userTasks: Task[];
  allDailyReports: { [key: string]: DailyReport | null };
  weekDays: Date[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  isToday: boolean;
  isLoading?: boolean;
  isLoaded?: boolean;
}

const DailyCard: React.FC<DailyCardProps> = ({
  userId,
  date,
  report,
  onTaskToggle,
  onAddTask,
  onAbsentToggle,
  onCheckInOut,
  isAdmin,
  userTasks,
  allDailyReports,
  weekDays,
  isExpanded,
  onToggleExpand,
  isToday,
  isLoading,
  isLoaded
}) => {
  const { getUserById, getClientById } = useData();
  const [warningMessage, setWarningMessage] = useState<string>('');
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const user = getUserById(userId);
  const isAbsent = report?.workEntry.isAbsent || false;
  
  // Get actual tasks assigned to this user from TaskBoard
  const assignedTaskIds = report?.workEntry.assignedTasks || [];
  const completedTaskIds = report?.workEntry.completedTasks || [];
  
  // Only show tasks that are explicitly assigned for this specific day
  // Don't show all user tasks - only show what's in the daily report
  const assignedTasks = userTasks.filter(task => 
    assignedTaskIds.includes(task.id)
  );
  
  const completedTasks = userTasks.filter(task => 
    completedTaskIds.includes(task.id)
  );

  // Function to check if a task is still open/incomplete on current or previous days
  const isTaskOpenOnEarlierDays = (taskId: string, currentDate: string): string | null => {
    const currentDateObj = parseISO(currentDate);
    const today = new Date();
    
    // Check all days from the beginning of the week up to (but not including) the current date
    for (const day of weekDays) {
      const dayStr = format(day, 'yyyy-MM-dd');
      
      // Skip if this is the current date or later
      if (dayStr >= currentDate) continue;
      
      // Skip future dates beyond today
      if (day > today) continue;
      
      const reportKey = `${userId}-${dayStr}`;
      const dayReport = allDailyReports[reportKey];
      
      if (dayReport) {
        // Check if task is assigned (incomplete) on this earlier day
        if (dayReport.workEntry.assignedTasks.includes(taskId)) {
          return dayStr;
        }
      }
    }
    
    return null;
  };

  // Function to check if current date is in the future
  const isFutureDate = (dateStr: string): boolean => {
    const date = parseISO(dateStr);
    const today = startOfDay(new Date());
    return date > today;
  };

  const handleTaskToggleWithValidation = (taskId: string, completed: boolean) => {
    if (completed) {
      // For future dates, check if task is still open on earlier days
      if (isFutureDate(date)) {
        const openOnDay = isTaskOpenOnEarlierDays(taskId, date);
        
        if (openOnDay) {
          const task = userTasks.find(t => t.id === taskId);
          const earlierDateFormatted = format(parseISO(openOnDay), 'EEEE, MMM d');
          
          setWarningMessage(
            `Cannot complete "${task?.title || 'this task'}" on ${format(parseISO(date), 'EEEE, MMM d')}. The task is still open on ${earlierDateFormatted}. Please complete it on that day first.`
          );
          setShowWarning(true);
          
          // Auto-hide warning after 6 seconds
          setTimeout(() => {
            setShowWarning(false);
            setWarningMessage('');
          }, 6000);
          
          return;
        }
      }
    }
    
    // If validation passes, proceed with task toggle
    onTaskToggle(taskId, completed);
  };

  const formatTime = (time?: string) => {
    if (!time) return '--:--';
    return time;
  };

  // Check if it's Sunday and set default absent
  const dayOfWeek = new Date(date).getDay();
  const isSunday = dayOfWeek === 0;
  const defaultAbsent = isSunday && !report?.workEntry.isAbsent;

  return (
    <div className="space-y-3 animate-fadeIn">
      {/* Collapsible Header */}
      <div 
        onClick={onToggleExpand}
        className={`cursor-pointer transition-all duration-300 ${
          isExpanded 
            ? isToday 
              ? 'bg-blue-100 border-blue-300 shadow-lg' 
              : 'bg-blue-50 border-blue-200 shadow-md'
            : isToday
              ? 'bg-blue-50 border-blue-200 hover:bg-blue-100 hover:shadow-md'
              : 'bg-white border-gray-200 hover:bg-gray-50 hover:shadow-sm'
        } border rounded-lg p-4`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CalendarDays className={`h-5 w-5 ${
              isExpanded 
                ? isToday ? 'text-blue-700' : 'text-blue-600'
                : isToday ? 'text-blue-600' : 'text-gray-600'
            }`} />
            <div>
              <div className="flex items-center space-x-2">
                <h3 className={`text-lg font-semibold ${
                  isExpanded 
                    ? isToday ? 'text-blue-900' : 'text-blue-900'
                    : isToday ? 'text-blue-900' : 'text-gray-900'
                }`}>
                  {format(parseISO(date), 'EEEE, MMM d')}
                </h3>
                {isToday && (
                  <Badge 
                    variant="info" 
                    className="text-xs px-2 py-1 bg-blue-600 text-white animate-pulse"
                  >
                    Today
                  </Badge>
                )}
              </div>
              {!isExpanded && (
                <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                  {isLoading ? (
                    <div className="flex items-center text-blue-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                      Loading...
                    </div>
                  ) : !isLoaded ? (
                    <span className="text-gray-500 italic">Click to load</span>
                  ) : isAbsent || defaultAbsent ? (
                    <span className="flex items-center text-red-600">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      Absent
                    </span>
                  ) : (
                    <>
                      <span className="flex items-center">
                        <Target className="h-4 w-4 mr-1 text-blue-500" />
                        {assignedTasks.length} assigned
                      </span>
                      <span className="flex items-center">
                        <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                        {completedTasks.length} completed
                      </span>
                      {report?.workEntry.checkInTime && (
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1 text-gray-500" />
                          {formatTime(report.workEntry.checkInTime)} - {formatTime(report.workEntry.checkOutTime)}
                        </span>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {!isExpanded && isAdmin && user && (
              <div className="flex items-center space-x-2">
                <Avatar name={user.name} size="sm" />
                <span className="text-sm font-medium text-gray-700">{user.name}</span>
              </div>
            )}
            <div className={`transition-transform duration-300 ${
              isExpanded ? 'rotate-180' : ''
            }`}>
              <ChevronDown className={`h-5 w-5 ${
                isToday ? 'text-blue-500' : 'text-gray-400'
              }`} />
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="space-y-3 pl-4 border-l-2 border-blue-200">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Loading {format(parseISO(date), 'EEEE')}'s data...</p>
              </div>
            </div>
          ) : !isLoaded ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center text-gray-500">
                <p className="text-sm">Click to load {format(parseISO(date), 'EEEE')}'s data</p>
              </div>
            </div>
          ) : (
            <>
              {/* Warning Alert */}
              {showWarning && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 animate-slideIn">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-red-800">Cannot Complete Task</h4>
                      <p className="text-sm text-red-700 mt-1">{warningMessage}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowWarning(false);
                        setWarningMessage('');
                      }}
                      className="text-red-400 hover:text-red-600 transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* User Header (for admin view) */}
              {isAdmin && (
                <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100 transition-all duration-200 hover:shadow-sm">
                  <Avatar name={user?.name} size="sm" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900">{user?.name}</h3>
                    <p className="text-xs text-gray-600 capitalize flex items-center">
                      <Users className="h-3 w-3 mr-1" />
                      {user?.team} Team • {user?.role}
                    </p>
                  </div>
                </div>
              )}

              {/* Absent/Present Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-sm font-medium text-gray-700">Attendance</span>
                <label className="flex items-center space-x-2 text-xs cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={isAbsent || defaultAbsent}
                    onChange={(e) => onAbsentToggle(e.target.checked)}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500 transition-all duration-200"
                  />
                  <span className="text-gray-700 group-hover:text-gray-900 transition-colors">
                    {isSunday && !report ? 'Sunday (Default Absent)' : 'Mark Absent'}
                  </span>
                </label>
              </div>

              {/* Check-in/Check-out Times */}
              {!isAbsent && !defaultAbsent && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-green-50 rounded-lg border border-green-100 transition-all duration-300">
                  <div className="space-y-1">
                    <label className="flex items-center text-xs font-medium text-gray-700">
                      <Clock className="h-3 w-3 mr-1 text-green-600" />
                      Check In
                    </label>
                    <input
                      type="time"
                      value={report?.workEntry.checkInTime || ''}
                      onChange={(e) => onCheckInOut(e.target.value, undefined)}
                      className="w-full text-xs border border-gray-300 rounded-md px-2 py-1.5 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="flex items-center text-xs font-medium text-gray-700">
                      <Clock className="h-3 w-3 mr-1 text-green-600" />
                      Check Out
                    </label>
                    <input
                      type="time"
                      value={report?.workEntry.checkOutTime || ''}
                      onChange={(e) => onCheckInOut(undefined, e.target.value)}
                      className="w-full text-xs border border-gray-300 rounded-md px-2 py-1.5 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                    />
                  </div>
                </div>
              )}

              {/* Task Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* Tasks Assigned */}
                <Card className={`transition-all duration-300 hover:shadow-md ${(isAbsent || defaultAbsent) ? 'opacity-60 grayscale' : ''}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="flex items-center text-gray-800">
                        <Target className="h-4 w-4 mr-2 text-blue-600" />
                        Tasks Assigned
                      </span>
                      <Badge variant="info" className="text-xs px-2 py-1">{assignedTasks.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                      {assignedTasks.map((task, index) => {
                        const client = task.clientId ? getClientById(task.clientId) : null;
                        const hasConflict = isFutureDate(date) && isTaskOpenOnEarlierDays(task.id, date);
                        const conflictDay = hasConflict ? isTaskOpenOnEarlierDays(task.id, date) : null;
                        
                        return (
                          <div
                            key={task.id}
                            className={`flex items-start space-x-2 p-2 border rounded-md transition-all duration-200 group animate-slideIn ${
                              hasConflict 
                                ? 'border-amber-200 bg-amber-50 hover:bg-amber-100' 
                                : 'border-gray-200 hover:bg-blue-50 hover:border-blue-200'
                            }`}
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTaskToggleWithValidation(task.id, true);
                              }}
                              className={`mt-0.5 transition-all duration-200 hover:scale-110 ${
                                hasConflict 
                                  ? 'text-amber-500 hover:text-amber-600' 
                                  : 'text-gray-400 hover:text-green-600'
                              }`}
                              disabled={isAbsent || defaultAbsent}
                              title={hasConflict 
                                ? `Cannot complete - task is still open on ${format(parseISO(conflictDay!), 'MMM d')}` 
                                : "Mark as completed"
                              }
                            >
                              {hasConflict ? (
                                <AlertCircle className="h-4 w-4" />
                              ) : (
                                <Circle className="h-4 w-4" />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <h4 className={`text-xs font-medium truncate transition-colors ${
                                  hasConflict 
                                    ? 'text-amber-900 group-hover:text-amber-800' 
                                    : 'text-gray-900 group-hover:text-blue-900'
                                }`}>
                                  {task.title}
                                </h4>
                                {hasConflict && (
                                  <Badge variant="warning" size="sm" className="text-xs px-1.5 py-0.5 flex-shrink-0">
                                    Conflict
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 truncate">
                                {client?.name || 'Unknown Client'}
                              </p>
                              {hasConflict && (
                                <p className="text-xs text-amber-600 mt-1">
                                  Open on {format(parseISO(conflictDay!), 'MMM d')} - complete there first
                                </p>
                              )}
                              <div className="flex items-center justify-between mt-1">
                                <p className="text-xs text-gray-500">
                                  Due: {format(parseISO(task.dueDate), 'MMM d')}
                                </p>
                                <div className="flex space-x-1">
                                  <Badge 
                                    variant={
                                      task.priority === 'high' ? 'danger' : 
                                      task.priority === 'medium' ? 'warning' : 'info'
                                    }
                                    size="sm"
                                    className="text-xs px-1.5 py-0.5"
                                  >
                                    {task.priority}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      
                      {assignedTasks.length === 0 && (
                        <div className="text-center py-4 text-gray-500">
                          <Circle className="h-6 w-6 mx-auto mb-2 opacity-50" />
                          <p className="text-xs">No tasks assigned</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Tasks Completed */}
                <Card className={`transition-all duration-300 hover:shadow-md ${(isAbsent || defaultAbsent) ? 'opacity-60 grayscale' : ''}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="flex items-center text-gray-800">
                        <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                        Tasks Completed
                      </span>
                      <Badge variant="success" className="text-xs px-2 py-1">{completedTasks.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                      {(isAbsent || defaultAbsent) && completedTasks.length > 0 ? (
                        <div className="text-center py-6">
                          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                          <p className="text-gray-600 font-medium text-sm">Absent</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {completedTasks.length} task{completedTasks.length !== 1 ? 's' : ''} completed while absent
                          </p>
                        </div>
                      ) : (
                        <>
                          {completedTasks.map((task, index) => {
                            const client = task.clientId ? getClientById(task.clientId) : null;
                            return (
                              <div
                                key={task.id}
                                className="flex items-start space-x-2 p-2 border border-green-200 rounded-md bg-green-50 hover:bg-green-100 transition-all duration-200 group animate-slideIn"
                                style={{ animationDelay: `${index * 50}ms` }}
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTaskToggleWithValidation(task.id, false);
                                  }}
                                  className="mt-0.5 text-green-600 hover:text-gray-400 transition-all duration-200 hover:scale-110"
                                  disabled={isAbsent || defaultAbsent}
                                  title="Move back to assigned"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-xs font-medium text-gray-900 truncate group-hover:text-green-900 transition-colors">
                                    {task.title}
                                  </h4>
                                  <p className="text-xs text-gray-600 truncate">
                                    {client?.name || 'Unknown Client'}
                                  </p>
                                  <div className="flex items-center justify-between mt-1">
                                    <p className="text-xs text-gray-500">
                                      Due: {format(parseISO(task.dueDate), 'MMM d')}
                                    </p>
                                    <div className="flex space-x-1">
                                      <Badge 
                                        variant={
                                          task.priority === 'high' ? 'danger' : 
                                          task.priority === 'medium' ? 'warning' : 'info'
                                        }
                                        size="sm"
                                        className="text-xs px-1.5 py-0.5"
                                      >
                                        {task.priority}
                                      </Badge>
                                      <Badge variant="success" size="sm" className="text-xs px-1.5 py-0.5">
                                        Completed
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </>
                      )}
                      
                      {completedTasks.length === 0 && (
                        <div className="text-center py-4 text-gray-500">
                          <CheckCircle className="h-6 w-6 mx-auto mb-2 opacity-50" />
                          <p className="text-xs">No tasks completed</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const ReportsAnalytics: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const { users, tasks, addTask, getTasksByUser, getTasksByTeam } = useData();
  
  // State management
  const [selectedTeam, setSelectedTeam] = useState<TeamType>('creative');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [weekStart, setWeekStart] = useState<string>(
    format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd') // Start from Monday
  );
  const [dailyReports, setDailyReports] = useState<{ [key: string]: DailyReport | null }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [dayLoadingStates, setDayLoadingStates] = useState<{ [key: string]: boolean }>({});
  const [loadedDays, setLoadedDays] = useState<Set<string>>(new Set());
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [addTaskForUser, setAddTaskForUser] = useState<string>('');
  const [addTaskForDate, setAddTaskForDate] = useState<string>('');

  // Refs for scrolling to today
  const todayRef = useRef<HTMLDivElement>(null);

  // Early return if essential data is not loaded
  if (!currentUser || !users || users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  // Get week days (Monday to Sunday)
  const weekDays = eachDayOfInterval({
    start: parseISO(weekStart),
    end: addDays(parseISO(weekStart), 6), // Monday to Sunday
  });

  // Get filtered users with safety check
  const filteredUsers = users.filter(user => 
    user && user.isActive && 
    (isAdmin ? (user.team === selectedTeam || user.role === 'admin') : user.id === currentUser?.id)
  );

  // Set default user (first user in the team instead of 'all')
  useEffect(() => {
    if (filteredUsers.length > 0 && !selectedUser) {
      if (isAdmin) {
        setSelectedUser(filteredUsers[0].id); // Set first user as default
      } else {
        setSelectedUser(currentUser.id);
      }
    }
  }, [filteredUsers, selectedUser, isAdmin, currentUser]);

  // Get users to display
  const usersToDisplay = isAdmin 
    ? (selectedUser === 'all' ? filteredUsers : filteredUsers.filter(u => u.id === selectedUser))
    : filteredUsers;

  // Load daily reports - optimized to load today first, then on-demand
  useEffect(() => {
    if (filteredUsers.length > 0 && weekDays.length > 0 && selectedUser) {
      // Reset loaded days when week/team/user changes
      setLoadedDays(new Set());
      setDayLoadingStates({});
      loadTodayReports();
    }
  }, [selectedTeam, selectedUser, weekStart]);

  // Add effect to reload reports when tasks change - but only reload already loaded days
  useEffect(() => {
    if (filteredUsers.length > 0 && weekDays.length > 0 && selectedUser && loadedDays.size > 0) {
      reloadLoadedDays();
    }
  }, [tasks]);

  // Load today's reports first for immediate display
  const loadTodayReports = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    setIsLoading(true);
    
    try {
      await loadSpecificDay(today);
      setSelectedDate(today); // Ensure today is expanded
    } catch (error) {
      console.error('Error loading today reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Reload only the days that have been loaded before (when tasks change)
  const reloadLoadedDays = async () => {
    const daysToReload = Array.from(loadedDays);
    
    for (const dateStr of daysToReload) {
      try {
        await loadSpecificDay(dateStr, false); // false = don't show loading state for silent reload
      } catch (error) {
        console.error(`Error reloading day ${dateStr}:`, error);
      }
    }
  };

  // Load a specific day's data (used for both initial today load and on-demand loading)
  const loadSpecificDay = async (dateStr: string, showLoadingState: boolean = true) => {
    if (showLoadingState) {
      setDayLoadingStates(prev => ({ ...prev, [dateStr]: true }));
    }

    try {
      const reports: { [key: string]: DailyReport | null } = {};
      const dayIndex = weekDays.findIndex(day => format(day, 'yyyy-MM-dd') === dateStr);
      
      // Calculate usersToDisplay inside the function to avoid dependency issues
      const currentUsersToDisplay = isAdmin 
        ? (selectedUser === 'all' ? filteredUsers : filteredUsers.filter(u => u.id === selectedUser))
        : filteredUsers;
      
      for (const user of currentUsersToDisplay) {
        const key = `${user.id}-${dateStr}`;

        // Rollover unfinished tasks from previous day (preserve existing logic)
        if (dayIndex > 0) {
          const prevDateStr = format(weekDays[dayIndex - 1], 'yyyy-MM-dd');
          await dailyReportService.moveUnfinishedTasksToNextDay(user.id, prevDateStr, dateStr);
        }

        // Sync tasks due on this day from TaskBoard into this day's entry (preserve existing logic)
        const boardTasks = getTasksByUser(user.id);
        for (const task of boardTasks) {
          // Define all possible completed statuses
          const completedStatuses = [
            'done', 
            'approved', 
            'creative_approved',
            'completed',
            'web_completed',
            'handed_over',
            'web_handed_over'
          ];
          
          const isTaskCompleted = completedStatuses.includes(task.status);
          
          // Only assign tasks whose due date matches this date
          const taskDueDate = format(parseISO(task.dueDate), 'yyyy-MM-dd');
          if (taskDueDate === dateStr) {
            // Don't assign completed tasks to current or future days
            if (!isTaskCompleted || dateStr < format(new Date(), 'yyyy-MM-dd')) {
              await dailyReportService.assignTaskToSpecificDay(user.id, dateStr, task.id);
            } else if (isTaskCompleted && dateStr >= format(new Date(), 'yyyy-MM-dd')) {
              // If task is completed but exists in assigned list, remove it
              const existingReport = await dailyReportService.getDailyReport(user.id, dateStr);
              if (existingReport?.workEntry.assignedTasks.includes(task.id)) {
                // Move it to completed if not already there
                if (!existingReport.workEntry.completedTasks.includes(task.id)) {
                  await dailyReportService.moveTaskToCompleted(user.id, dateStr, task.id);
                }
              }
            }
          }
        }

        try {
          const report = await dailyReportService.getDailyReport(user.id, dateStr);
          reports[key] = report;
        } catch (error) {
          console.error(`Error loading report for ${user.name} on ${dateStr}:`, error);
          reports[key] = null;
        }
      }
      
      // Update the daily reports with new data for this specific day
      setDailyReports(prev => ({ ...prev, ...reports }));
      
      // Mark this day as loaded
      setLoadedDays(prev => new Set([...prev, dateStr]));
      
    } catch (error) {
      console.error(`Error loading day ${dateStr}:`, error);
    } finally {
      if (showLoadingState) {
        setDayLoadingStates(prev => ({ ...prev, [dateStr]: false }));
      }
    }
  };

  // Enhanced toggle function that loads day data on-demand
  const handleDayToggle = async (dateStr: string) => {
    // If clicking the same day that's already expanded, collapse it
    if (selectedDate === dateStr) {
      setSelectedDate('');
      return;
    }

    // If this day hasn't been loaded yet, load it
    if (!loadedDays.has(dateStr)) {
      await loadSpecificDay(dateStr);
    }

    // Expand this day
    setSelectedDate(dateStr);
  };

  const handleTaskToggle = async (userId: string, date: string, taskId: string, completed: boolean) => {
    try {
      // Get the task details to find its due date
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        console.error('Task not found:', taskId);
        return;
      }
      
      const taskDueDate = format(parseISO(task.dueDate), 'yyyy-MM-dd');
      
      if (completed) {
        // Use the new cross-day completion function
        await dailyReportService.moveTaskToCompletedAcrossDays(userId, date, taskId, taskDueDate);
      } else {
        // Use the new cross-day assignment function
        await dailyReportService.moveTaskToAssignedAcrossDays(userId, date, taskId, taskDueDate);
      }
      
      // Only reload the affected days that are already loaded (more efficient)
      const affectedDays = [date, taskDueDate];
      const uniqueAffectedDays = [...new Set(affectedDays)];
      
      for (const affectedDate of uniqueAffectedDays) {
        if (loadedDays.has(affectedDate)) {
          await loadSpecificDay(affectedDate, false); // Silent reload
        }
      }
      
      // Show success feedback (optional)
      console.log(`Task ${completed ? 'completed' : 'moved back to assigned'} successfully across all relevant days`);
    } catch (error) {
      console.error('Error toggling task:', error);
      // You could add a toast notification here for better UX
    }
  };

  const handleAbsentToggle = async (userId: string, date: string, isAbsent: boolean) => {
    try {
      await dailyReportService.markAbsent(userId, date, isAbsent);
      
      // Reload the specific report
      const report = await dailyReportService.getDailyReport(userId, date);
      setDailyReports(prev => ({
        ...prev,
        [`${userId}-${date}`]: report
      }));
    } catch (error) {
      console.error('Error marking absent:', error);
    }
  };

  const handleCheckInOut = async (userId: string, date: string, checkIn?: string, checkOut?: string) => {
    try {
      await dailyReportService.updateCheckInOut(userId, date, checkIn, checkOut);
      
      // Reload the specific report
      const report = await dailyReportService.getDailyReport(userId, date);
      setDailyReports(prev => ({
        ...prev,
        [`${userId}-${date}`]: report
      }));
    } catch (error) {
      console.error('Error updating check-in/out:', error);
    }
  };

  const handleAddTask = (userId: string, date: string) => {
    setAddTaskForUser(userId);
    setAddTaskForDate(date);
    setShowAddTaskModal(true);
  };

  // Function to manually assign a task to a specific day
  const handleAssignTaskToDay = async (userId: string, date: string, taskId: string) => {
    try {
      await dailyReportService.assignTaskToSpecificDay(userId, date, taskId);
      
      // Reload the specific report to show the new task
      const report = await dailyReportService.getDailyReport(userId, date);
      setDailyReports(prev => ({
        ...prev,
        [`${userId}-${date}`]: report
      }));
      
      console.log(`Task assigned to ${date} successfully`);
    } catch (error) {
      console.error('Error assigning task to day:', error);
      alert('Error assigning task. Please try again.');
    }
  };

  const setThisWeek = () => {
    setWeekStart(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  };

  const scrollToToday = () => {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const currentWeek = parseISO(weekStart);
    const newWeek = direction === 'next' 
      ? addDays(currentWeek, 7)
      : addDays(currentWeek, -7);
    setWeekStart(format(newWeek, 'yyyy-MM-dd'));
  };

  return (
    <div className="space-y-4 p-4 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center">
            <BarChart3 className="h-6 w-6 mr-3 text-blue-600" />
            Reports & Analytics
          </h1>
          <p className="text-sm text-gray-600 mt-1">Track daily work progress and team performance</p>
        </div>
        
        <div className="flex items-center space-x-3 text-sm">
          <div className="flex items-center space-x-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-900">
              Week of {format(parseISO(weekStart), 'MMM d, yyyy')}
            </span>
          </div>
        </div>
      </div>

      {/* Fixed Filter Panel */}
      <Card className="sticky top-4 z-10 bg-white shadow-md border border-gray-200">
        <CardContent className="py-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {/* Team Selector */}
            {isAdmin && (
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Team
                </label>
                <select
                  value={selectedTeam}
                  onChange={(e) => {
                    setSelectedTeam(e.target.value as TeamType);
                    setSelectedUser(''); // Reset user selection
                  }}
                  className="w-full text-xs border border-gray-300 rounded-md px-2 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                >
                  <option value="creative">Creative Team</option>
                  <option value="web">Web Team</option>
                </select>
              </div>
            )}

            {/* User Selector (Admin only) */}
            {isAdmin && (
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  User
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded-md px-2 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                >
                  {filteredUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.role})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Week Navigation */}
            <div className={`${isAdmin ? 'md:col-span-3' : 'md:col-span-8'}`}>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Week Selection
              </label>
              <div className="flex space-x-2">
                <Button
                  variant="secondary"
                  onClick={() => navigateWeek('prev')}
                  className="px-3 py-2 hover:bg-gray-100 transition-all duration-200"
                  size="sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <input
                  type="date"
                  value={weekStart}
                  onChange={(e) => setWeekStart(e.target.value)}
                  className="flex-1 text-xs border border-gray-300 rounded-md px-2 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
                <Button
                  variant="secondary"
                  onClick={() => navigateWeek('next')}
                  className="px-3 py-2 hover:bg-gray-100 transition-all duration-200"
                  size="sm"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Admin Actions - REMOVED SYNC BUTTON */}
            {/* Tasks should be manually assigned to specific days, not auto-synced */}

            {/* This Week and Today Buttons */}
            <div className={`${isAdmin ? 'md:col-span-3' : 'md:col-span-4'} flex space-x-2`}>
              <Button
                onClick={setThisWeek}
                className="flex-1 text-xs py-2 bg-blue-600 hover:bg-blue-700 transition-all duration-200"
                size="sm"
              >
                This Week
              </Button>
              <Button
                onClick={scrollToToday}
                variant="secondary"
                className="flex-1 text-xs py-2 hover:bg-gray-100 transition-all duration-200"
                size="sm"
              >
                Today
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily View */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-600 mt-2">Loading reports...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {weekDays.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const isToday = isSameDay(day, new Date());
            
            return (
              <div key={dateStr} ref={isToday ? todayRef : undefined}>
                {usersToDisplay.map((user) => {
                  const reportKey = `${user.id}-${dateStr}`;
                  const report = dailyReports[reportKey];
                  const userTasks = getTasksByUser(user.id);

                  return (
                    <DailyCard
                      key={reportKey}
                      userId={user.id}
                      date={dateStr}
                      report={report}
                      onTaskToggle={(taskId, completed) => handleTaskToggle(user.id, dateStr, taskId, completed)}
                      onAddTask={() => handleAddTask(user.id, dateStr)}
                      onAbsentToggle={(isAbsent) => handleAbsentToggle(user.id, dateStr, isAbsent)}
                      onCheckInOut={(checkIn, checkOut) => handleCheckInOut(user.id, dateStr, checkIn, checkOut)}
                      isAdmin={isAdmin}
                      userTasks={userTasks}
                      allDailyReports={dailyReports}
                      weekDays={weekDays}
                      isExpanded={dateStr === selectedDate}
                      onToggleExpand={() => handleDayToggle(dateStr)}
                      isToday={isToday}
                      isLoading={dayLoadingStates[dateStr]}
                      isLoaded={loadedDays.has(dateStr)}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Task Modal would go here if needed */}
    </div>
  );
};

export default ReportsAnalytics; 