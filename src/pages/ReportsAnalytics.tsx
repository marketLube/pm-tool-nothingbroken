import React, { useState, useEffect, useRef } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, addDays, startOfDay, isSameDay, isBefore } from 'date-fns';
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

// Helper to check "future date"
const isFutureDate = (dateStr: string): boolean => {
  return parseISO(dateStr) > startOfDay(new Date());
};

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
  isLoading
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
    // only show it as "assigned" if it's not also in the completed list
    assignedTaskIds.includes(task.id) &&
    !completedTaskIds.includes(task.id)
  );
  
  const completedTasks = userTasks.filter(task => 
    completedTaskIds.includes(task.id)
  );

  const handleTaskToggleWithValidation = (taskId: string, completed: boolean) => {
    const task = userTasks.find(t => t.id === taskId);
    const dateObj = parseISO(date);
    const today = startOfDay(new Date());
    const formattedDate = format(dateObj, 'EEEE, MMM d');

    // 🔒 Prevent un-completing on any day before today
    if (!completed && dateObj < today) {
      setWarningMessage(
        `You can't revert "${task?.title || 'this task'}" on ${formattedDate} — it was already completed. Please contact an admin if you need to change it.`
      );
      setShowWarning(true);
      setTimeout(() => {
        setShowWarning(false);
        setWarningMessage('');
      }, 8000);
      return;
    }

    if (completed) {
      // 1) Block future dates
      if (isFutureDate(date)) {
        const currentDateFormatted = format(parseISO(date), 'EEEE, MMM d');
        setWarningMessage(
          `Cannot complete tasks scheduled for ${currentDateFormatted} because that's a future date.`
        );
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 8000);
        return;
      }

      // 2) Block any completed attempt unless you're viewing TODAY
      if (!isToday) {
        const todayFormatted = format(startOfDay(new Date()), 'EEEE, MMM d');
        setWarningMessage(
          `Tasks can only be completed on ${todayFormatted}. Switch to today's view to finish it.`
        );
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 8000);
        return;
      }
    }

    // All clear: proceed
    onTaskToggle(taskId, completed);
  };

  const formatTime = (time?: string) => {
    if (!time) return '--:--';
    return time;
  };

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
                    className="!bg-blue-600 !text-white text-xs px-3 py-1.5 font-semibold shadow-sm rounded-full animate-pulse border-0"
                  >
                    Today
                  </Badge>
                )}
              </div>
              {!isExpanded && (
                <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                  {isAbsent ? (
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
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-sm text-gray-600 mt-2">Loading day data...</p>
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
                    checked={isAbsent}
                    onChange={(e) => onAbsentToggle(e.target.checked)}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500 transition-all duration-200"
                  />
                  <span className="text-gray-700 group-hover:text-gray-900 transition-colors">
                    Mark Absent
                  </span>
                </label>
              </div>

              {/* Check-in/Check-out Times */}
              {!isAbsent && (
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
                <Card className={`transition-all duration-300 hover:shadow-md ${(isAbsent) ? 'opacity-60 grayscale' : ''}`}>
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
                        // Simple conflict detection: show warning if future date OR not today
                        const hasConflict = isFutureDate(date) || !isToday;
                        const conflictType = isFutureDate(date) ? 'future' : 'not-today';
                        
                        // Overdue detection: task due date is before card date (and not a future date)
                        const taskDue = parseISO(task.dueDate);
                        const cardDateStart = startOfDay(parseISO(date));
                        const isOverdue = isBefore(taskDue, cardDateStart) && !isFutureDate(date);
                        
                        return (
                          <div
                            key={task.id}
                            className={`flex items-start space-x-2 p-2 border rounded-md transition-all duration-200 group animate-slideIn ${
                              hasConflict 
                                ? 'border-amber-200 bg-amber-50 hover:bg-amber-100'
                                : isOverdue
                                  ? 'border-red-300 bg-red-50 hover:bg-red-100'
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
                                  : isOverdue
                                    ? 'text-red-500 hover:text-red-600'
                                    : 'text-gray-400 hover:text-green-600'
                              }`}
                              disabled={isAbsent}
                              title={hasConflict 
                                ? conflictType === 'future' 
                                  ? `Cannot complete - future date` 
                                  : `Can only complete on today`
                                : isOverdue
                                  ? `Task is overdue - due ${format(taskDue, 'MMM d')}`
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
                                    : isOverdue
                                      ? 'text-red-900 group-hover:text-red-800'
                                      : 'text-gray-900 group-hover:text-blue-900'
                                }`}>
                                  {task.title}
                                </h4>
                                {isOverdue && (
                                  <Badge variant="danger" size="sm" className="text-xs px-1.5 py-0.5 flex-shrink-0">
                                    Overdue
                                  </Badge>
                                )}
                                {hasConflict && (
                                  <Badge variant="warning" size="sm" className="text-xs px-1.5 py-0.5 flex-shrink-0">
                                    {conflictType === 'future' ? 'Future Date' : 'Use Today'}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 truncate">
                                {client?.name || 'Unknown Client'}
                              </p>
                              {hasConflict && (
                                <p className="text-xs text-amber-600 mt-1">
                                  {conflictType === 'future' 
                                    ? 'Wait until this date becomes current'
                                    : 'Switch to today\'s view to complete'
                                  }
                                </p>
                              )}
                              <div className="flex items-center justify-between mt-1">
                                <p className={`text-xs ${
                                  isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'
                                }`}>
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
                <Card className={`transition-all duration-300 hover:shadow-md ${(isAbsent) ? 'opacity-60 grayscale' : ''}`}>
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
                      {(isAbsent) && completedTasks.length > 0 ? (
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
                                  disabled={isAbsent}
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
  const [dayLoadingStates, setDayLoadingStates] = useState<{ [dateStr: string]: boolean }>({});
  const [isInitialLoading, setIsInitialLoading] = useState(false);
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

  // Load only today's data initially for fast startup
  const loadTodayData = async () => {
    setIsInitialLoading(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Get users to process rollover for
      const currentUsersToDisplay = isAdmin 
        ? (selectedUser === 'all' ? filteredUsers : filteredUsers.filter(u => u.id === selectedUser))
        : filteredUsers;
      
      // 1) Roll every day's unfinished forward up to today for all users
      await Promise.all(
        currentUsersToDisplay.map(u => runRolloverChain(u.id, today))
      );
      
      // 2) Then fetch just today's reports
      await loadSpecificDay(today);
    } catch (error) {
      console.error('Error loading today data:', error);
    } finally {
      setIsInitialLoading(false);
    }
  };

  // Helper to run rollover chain from week start up to target date
  const runRolloverChain = async (userId: string, upToDate: string) => {
    // find index of upToDate in weekDays
    const idx = weekDays.findIndex(d => format(d, 'yyyy-MM-dd') === upToDate);
    // for each day from Monday (i=1) through idx, move unfinished from day[i-1] → day[i]
    for (let i = 1; i <= idx; i++) {
      const from = format(weekDays[i - 1], 'yyyy-MM-dd');
      const to = format(weekDays[i], 'yyyy-MM-dd');
      await dailyReportService.moveUnfinishedTasksToNextDay(userId, from, to);
    }
  };

  // Load data for a specific day when user expands it
  const loadSpecificDay = async (dateStr: string) => {
    // Set loading state for this specific day
    setDayLoadingStates(prev => ({ ...prev, [dateStr]: true }));
    
    try {
      const currentUsersToDisplay = isAdmin 
        ? (selectedUser === 'all' ? filteredUsers : filteredUsers.filter(u => u.id === selectedUser))
        : filteredUsers;
      
      const dayReports: { [key: string]: DailyReport | null } = {};
      
      for (const user of currentUsersToDisplay) {
        const key = `${user.id}-${dateStr}`;
        
        // Get the index of this date in the week for rollover logic
        const dayIndex = weekDays.findIndex(day => format(day, 'yyyy-MM-dd') === dateStr);
        
        // Sync tasks due on this day from TaskBoard into this day's entry
        const boardTasks = getTasksByUser(user.id);
        for (const task of boardTasks) {
          const taskDueDate = format(parseISO(task.dueDate), 'yyyy-MM-dd');
          if (taskDueDate !== dateStr) continue; // Only process tasks due on this specific date

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

          if (!isTaskCompleted) {
            // Only assign tasks that are still incomplete/open
            await dailyReportService.assignTaskToSpecificDay(user.id, dateStr, task.id);
          } else {
            // For completed tasks, ensure they stay in the completed list
            const existingReport = await dailyReportService.getDailyReport(user.id, dateStr);
            if (existingReport?.workEntry.assignedTasks.includes(task.id)) {
              // Move from assigned to completed if not already there
              if (!existingReport.workEntry.completedTasks.includes(task.id)) {
                await dailyReportService.moveTaskToCompleted(user.id, dateStr, task.id);
              }
            }
          }
        }

        try {
          const report = await dailyReportService.getDailyReport(user.id, dateStr);
          dayReports[key] = report;
          
          // *** NEW: if this is Sunday and there's never been an entry in the DB, persist the default ***
          const dayOfWeek = new Date(dateStr).getDay();
          if (dayOfWeek === 0 && report?.workEntry.isAbsent === false && 
              (!report?.tasks.assigned || report.tasks.assigned.length === 0) && 
              (!report?.tasks.completed || report.tasks.completed.length === 0)) {
            // this means "no one has ever touched this Sunday before"
            await dailyReportService.markAbsent(user.id, dateStr, true);
            // re-fetch so UI will see the persisted isAbsent
            dayReports[key] = await dailyReportService.getDailyReport(user.id, dateStr);
          }
        } catch (error) {
          console.error(`Error loading report for ${user.name} on ${dateStr}:`, error);
          dayReports[key] = null;
        }
      }
      
      // Update only this day's data
      setDailyReports(prev => ({ ...prev, ...dayReports }));
      
    } catch (error) {
      console.error(`Error loading day ${dateStr}:`, error);
    } finally {
      // Clear loading state for this specific day
      setDayLoadingStates(prev => ({ ...prev, [dateStr]: false }));
    }
  };

  // Handle day expansion - load data when user clicks to expand
  const handleDayToggle = async (dateStr: string) => {
    const isCurrentlyExpanded = selectedDate === dateStr;
    
    if (isCurrentlyExpanded) {
      // Collapse - just update UI state
      setSelectedDate('');
    } else {
      // Expand - run rollover chain then load data for this day
      const currentUsersToDisplay = isAdmin 
        ? (selectedUser === 'all' ? filteredUsers : filteredUsers.filter(u => u.id === selectedUser))
        : filteredUsers;
      
      // 1) Roll forward all missing days up to target date
      await Promise.all(
        currentUsersToDisplay.map(u => runRolloverChain(u.id, dateStr))
      );
      
      // 2) Now load that single day
      setSelectedDate(dateStr);
      await loadSpecificDay(dateStr);
    }
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
      
      // Reload only the affected day instead of all days
      await loadSpecificDay(date);
      
      // Show success feedback (optional)
      console.log(`Task ${completed ? 'completed' : 'moved back to assigned'} successfully`);
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  const handleAbsentToggle = async (userId: string, date: string, isAbsent: boolean) => {
    try {
      await dailyReportService.markAbsent(userId, date, isAbsent);
      
      // Reload the specific day
      await loadSpecificDay(date);
    } catch (error) {
      console.error('Error marking absent:', error);
    }
  };

  const handleCheckInOut = async (userId: string, date: string, checkIn?: string, checkOut?: string) => {
    try {
      await dailyReportService.updateCheckInOut(userId, date, checkIn, checkOut);
      
      // Reload the specific day
      await loadSpecificDay(date);
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
      
      // Reload the specific day
      await loadSpecificDay(date);
      
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

  // Load only today's data initially
  useEffect(() => {
    if (filteredUsers.length > 0 && selectedUser) {
      loadTodayData();
    }
  }, [selectedTeam, selectedUser, weekStart]);

  // Reload today's data when tasks change
  useEffect(() => {
    if (filteredUsers.length > 0 && selectedUser) {
      const today = format(new Date(), 'yyyy-MM-dd');
      loadSpecificDay(today);
    }
  }, [tasks]);

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
      {isInitialLoading ? (
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