import React, { useState, useEffect, useRef } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, addDays, startOfDay, isSameDay, isBefore } from 'date-fns';
import { getIndiaDate, getIndiaDateTime } from '../utils/timezone';
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
import NewTaskModal from '../components/tasks/NewTaskModal';

// Helper to check "future date"
const isFutureDate = (dateStr: string): boolean => {
  return parseISO(dateStr) > startOfDay(getIndiaDateTime());
};

interface DailyCardProps {
  userId: string;
  date: string;
  report: DailyReport | null;
  onTaskToggle: (taskId: string, completed: boolean) => void;
  onAddTask: () => void;
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
  const { getUserById, getClientById, searchTasks } = useData();
  const { currentUser } = useAuth();
  const [warningMessage, setWarningMessage] = useState<string>('');
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const user = getUserById(userId);
  const [loadedTasks, setLoadedTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  
  // Load tasks for this user when component mounts or userId changes
  useEffect(() => {
    const loadUserTasks = async () => {
      setTasksLoading(true);
      try {
        const tasks = await searchTasks({ assigneeId: userId });
        setLoadedTasks(tasks);
      } catch (error) {
        console.error('Error loading user tasks:', error);
        setLoadedTasks([]);
      } finally {
        setTasksLoading(false);
      }
    };
    
    loadUserTasks();
  }, [userId, searchTasks]);
  
  // Use loaded tasks instead of props
  const actualUserTasks = loadedTasks;
  
  // Get actual tasks assigned to this user from TaskBoard
  const assignedTaskIds = report?.workEntry.assignedTasks || [];
  const completedTaskIds = report?.workEntry.completedTasks || [];
  
  // Only show tasks that are explicitly assigned for this specific day
  // Don't show all user tasks - only show what's in the daily report
  const assignedTasks = actualUserTasks.filter(task => 
    // only show it as "assigned" if it's not also in the completed list
    assignedTaskIds.includes(task.id) &&
    !completedTaskIds.includes(task.id)
  );
  
  const completedTasks = actualUserTasks.filter(task => 
    completedTaskIds.includes(task.id)
  );

  const handleTaskToggleWithValidation = (taskId: string, completed: boolean) => {
    const task = actualUserTasks.find(t => t.id === taskId);
    const dateObj = parseISO(date);
    const today = startOfDay(getIndiaDateTime());
    const formattedDate = format(dateObj, 'EEEE, MMM d');

    // 🔒 COMPLETE LOCKDOWN: Prevent ANY modification to past dates
    if (dateObj < today) {
      setWarningMessage(
        `You cannot modify tasks for ${formattedDate} as this date has passed. Only today's tasks can be modified.`
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
        const todayFormatted = format(startOfDay(getIndiaDateTime()), 'EEEE, MMM d');
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

  // Check if date is in the past (before today)
  const isPastDate = parseISO(date) < startOfDay(getIndiaDateTime());
  
  // Handle check-in/check-out with past date validation
  const handleCheckInOutWithValidation = (checkIn?: string, checkOut?: string) => {
    if (isPastDate) {
      setWarningMessage(
        `You cannot modify check-in/check-out times for ${format(parseISO(date), 'EEEE, MMM d')} as this date has passed.`
      );
      setShowWarning(true);
      setTimeout(() => {
        setShowWarning(false);
        setWarningMessage('');
      }, 8000);
      return;
    }
    
    onCheckInOut(checkIn, checkOut);
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
              : isPastDate
                ? 'bg-gray-100 border-gray-300 shadow-md'
                : 'bg-blue-50 border-blue-200 shadow-md'
            : isToday
              ? 'bg-blue-50 border-blue-200 hover:bg-blue-100 hover:shadow-md'
              : isPastDate
                ? 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:shadow-sm'
                : 'bg-white border-gray-200 hover:bg-gray-50 hover:shadow-sm'
        } border rounded-lg p-4`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CalendarDays className={`h-5 w-5 ${
              isExpanded 
                ? isToday ? 'text-blue-700' : isPastDate ? 'text-gray-600' : 'text-blue-600'
                : isToday ? 'text-blue-600' : isPastDate ? 'text-gray-500' : 'text-gray-600'
            }`} />
            <div>
              <div className="flex items-center space-x-2">
                <h3 className={`text-lg font-semibold ${
                  isExpanded 
                    ? isToday ? 'text-blue-900' : isPastDate ? 'text-gray-700' : 'text-blue-900'
                    : isToday ? 'text-blue-900' : isPastDate ? 'text-gray-600' : 'text-gray-900'
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
                {isPastDate && (
                  <Badge
                    className="!bg-gray-500 !text-white text-xs px-2 py-1 font-medium shadow-sm rounded-full border-0"
                  >
                    Past
                  </Badge>
                )}
              </div>
              {!isExpanded && (
                <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                  {assignedTasks.length} assigned{isPastDate && ' (read-only)'}
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
                isToday ? 'text-blue-500' : isPastDate ? 'text-gray-400' : 'text-gray-400'
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
                      <h4 className="text-sm font-medium text-red-800">Action Not Allowed</h4>
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

              {/* Past Date Notice */}
              {isPastDate && (
                <div className="bg-gray-50 border border-gray-300 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-gray-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-700 font-medium">
                        This date is read-only. Tasks that were not completed have been moved to subsequent days.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* User Header (for admin view) */}
              {isAdmin && (
                <div className={`flex items-center space-x-3 p-3 rounded-lg border transition-all duration-200 hover:shadow-sm ${
                  isPastDate 
                    ? 'bg-gray-50 border-gray-200' 
                    : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100'
                }`}>
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

              {/* Check-in/Check-out Times */}
              <div className={`grid grid-cols-2 gap-3 p-3 rounded-lg border transition-all duration-300 ${
                isPastDate 
                  ? 'bg-gray-50 border-gray-200' 
                  : 'bg-green-50 border-green-100'
              }`}>
                <div className="space-y-1">
                  <label className={`flex items-center text-xs font-medium ${
                    isPastDate ? 'text-gray-600' : 'text-gray-700'
                  }`}>
                    <Clock className={`h-3 w-3 mr-1 ${
                      isPastDate ? 'text-gray-500' : 'text-green-600'
                    }`} />
                    Check In {isPastDate && '(Read-only)'}
                  </label>
                  <input
                    type="time"
                    value={report?.workEntry.checkInTime || ''}
                    onChange={(e) => handleCheckInOutWithValidation(e.target.value, undefined)}
                    disabled={isPastDate}
                    className={`w-full text-xs border rounded-md px-2 py-1.5 transition-all duration-200 ${
                      isPastDate 
                        ? 'border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed'
                        : 'border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500'
                    }`}
                  />
                </div>
                <div className="space-y-1">
                  <label className={`flex items-center text-xs font-medium ${
                    isPastDate ? 'text-gray-600' : 'text-gray-700'
                  }`}>
                    <Clock className={`h-3 w-3 mr-1 ${
                      isPastDate ? 'text-gray-500' : 'text-green-600'
                    }`} />
                    Check Out {isPastDate && '(Read-only)'}
                  </label>
                  <input
                    type="time"
                    value={report?.workEntry.checkOutTime || ''}
                    onChange={(e) => handleCheckInOutWithValidation(undefined, e.target.value)}
                    disabled={isPastDate}
                    className={`w-full text-xs border rounded-md px-2 py-1.5 transition-all duration-200 ${
                      isPastDate 
                        ? 'border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed'
                        : 'border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500'
                    }`}
                  />
                </div>
              </div>

              {/* Task Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* Tasks Assigned */}
                <Card className={`transition-all duration-300 hover:shadow-md ${isPastDate ? 'opacity-75' : ''}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className={`flex items-center ${isPastDate ? 'text-gray-600' : 'text-gray-800'}`}>
                        <Target className={`h-4 w-4 mr-2 ${isPastDate ? 'text-gray-500' : 'text-blue-600'}`} />
                        Tasks Assigned {isPastDate && '(Read-only)'}
                      </span>
                      <Badge variant={isPastDate ? "default" : "info"} className="text-xs px-2 py-1">{assignedTasks.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                      {assignedTasks.map((task, index) => {
                        const client = task.clientId ? getClientById(task.clientId) : null;
                        // For past dates, show different logic
                        const hasConflict = isPastDate ? false : (isFutureDate(date) || !isToday);
                        const conflictType = isFutureDate(date) ? 'future' : 'not-today';
                        
                        // Overdue detection: task due date is before card date (and not a future date)
                        const taskDue = parseISO(task.dueDate);
                        const cardDateStart = startOfDay(parseISO(date));
                        const isOverdue = isBefore(taskDue, cardDateStart) && !isFutureDate(date);
                        
                        return (
                          <div
                            key={task.id}
                            className={`flex items-start space-x-2 p-2 border rounded-md transition-all duration-200 group animate-slideIn ${
                              isPastDate
                                ? 'border-gray-300 bg-gray-50'
                                : hasConflict 
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
                              disabled={isPastDate}
                              className={`mt-0.5 transition-all duration-200 ${
                                isPastDate 
                                  ? 'text-gray-400 cursor-not-allowed'
                                  : hasConflict 
                                    ? 'text-amber-500 hover:text-amber-600 hover:scale-110'
                                    : isOverdue
                                      ? 'text-red-500 hover:text-red-600 hover:scale-110'
                                      : 'text-gray-400 hover:text-green-600 hover:scale-110'
                              }`}
                              title={isPastDate
                                ? "Past date - cannot modify"
                                : hasConflict 
                                  ? conflictType === 'future' 
                                    ? `Cannot complete - future date` 
                                    : `Can only complete on today`
                                  : isOverdue
                                    ? `Task is overdue - due ${format(taskDue, 'MMM d')}`
                                    : "Mark as completed"
                              }
                            >
                              {isPastDate ? (
                                <Circle className="h-4 w-4 opacity-50" />
                              ) : hasConflict ? (
                                <AlertCircle className="h-4 w-4" />
                              ) : (
                                <Circle className="h-4 w-4" />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <h4 className={`text-xs font-medium truncate transition-colors ${
                                  isPastDate
                                    ? 'text-gray-600'
                                    : hasConflict 
                                      ? 'text-amber-900 group-hover:text-amber-800'
                                      : isOverdue
                                        ? 'text-red-900 group-hover:text-red-800'
                                        : 'text-gray-900 group-hover:text-blue-900'
                                }`}>
                                  {task.title}
                                </h4>
                                {!isPastDate && isOverdue && (
                                  <Badge variant="danger" size="sm" className="text-xs px-1.5 py-0.5 flex-shrink-0">
                                    Overdue (Due {format(taskDue, 'MMM d')})
                                  </Badge>
                                )}
                                {!isPastDate && hasConflict && (
                                  <Badge variant="warning" size="sm" className="text-xs px-1.5 py-0.5 flex-shrink-0">
                                    {conflictType === 'future' ? 'Future Date' : 'Use Today'}
                                  </Badge>
                                )}
                                {isPastDate && (
                                  <Badge variant="default" size="sm" className="text-xs px-1.5 py-0.5 flex-shrink-0">
                                    Rolled Over
                                  </Badge>
                                )}
                              </div>
                              <p className={`text-xs truncate ${isPastDate ? 'text-gray-500' : 'text-gray-600'}`}>
                                {client?.name || 'Unknown Client'}
                              </p>
                              {!isPastDate && hasConflict && (
                                <p className="text-xs text-amber-600 mt-1">
                                  {conflictType === 'future' 
                                    ? 'Wait until this date becomes current'
                                    : 'Switch to today\'s view to complete'
                                  }
                                </p>
                              )}
                              <div className="flex items-center justify-between mt-1">
                                <p className={`text-xs ${
                                  isPastDate 
                                    ? 'text-gray-500'
                                    : isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'
                                }`}>
                                  Due: {format(parseISO(task.dueDate), 'MMM d')}
                                </p>
                                <div className="flex space-x-1">
                                  <Badge 
                                    variant={
                                      isPastDate 
                                        ? 'default'
                                        : task.priority === 'high' ? 'danger' : 
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
                <Card className={`transition-all duration-300 hover:shadow-md ${isPastDate ? 'opacity-75' : ''}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className={`flex items-center ${isPastDate ? 'text-gray-600' : 'text-gray-800'}`}>
                        <CheckCircle className={`h-4 w-4 mr-2 ${isPastDate ? 'text-gray-500' : 'text-green-600'}`} />
                        Tasks Completed {isPastDate && '(Read-only)'}
                      </span>
                      <Badge variant={isPastDate ? "default" : "success"} className="text-xs px-2 py-1">{completedTasks.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                      {completedTasks.map((task, index) => {
                        const client = task.clientId ? getClientById(task.clientId) : null;
                        return (
                          <div
                            key={task.id}
                            className={`flex items-start space-x-2 p-2 border rounded-md transition-all duration-200 group animate-slideIn ${
                              isPastDate 
                                ? 'border-gray-300 bg-gray-50'
                                : 'border-green-200 bg-green-50 hover:bg-green-100'
                            }`}
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTaskToggleWithValidation(task.id, false);
                              }}
                              disabled={isPastDate}
                              className={`mt-0.5 transition-all duration-200 ${
                                isPastDate 
                                  ? 'text-gray-400 cursor-not-allowed'
                                  : 'text-green-600 hover:text-gray-400 hover:scale-110'
                              }`}
                              title={isPastDate ? "Past date - cannot modify" : "Move back to assigned"}
                            >
                              <CheckCircle className={`h-4 w-4 ${isPastDate ? 'opacity-50' : ''}`} />
                            </button>
                            <div className="flex-1 min-w-0">
                              <h4 className={`text-xs font-medium truncate transition-colors ${
                                isPastDate 
                                  ? 'text-gray-600'
                                  : 'text-gray-900 group-hover:text-green-900'
                              }`}>
                                {task.title}
                              </h4>
                              <p className={`text-xs truncate ${isPastDate ? 'text-gray-500' : 'text-gray-600'}`}>
                                {client?.name || 'Unknown Client'}
                              </p>
                              <div className="flex items-center justify-between mt-1">
                                <p className={`text-xs ${isPastDate ? 'text-gray-500' : 'text-gray-500'}`}>
                                  Due: {format(parseISO(task.dueDate), 'MMM d')}
                                </p>
                                <div className="flex space-x-1">
                                  <Badge 
                                    variant={
                                      isPastDate 
                                        ? 'default'
                                        : task.priority === 'high' ? 'danger' : 
                                          task.priority === 'medium' ? 'warning' : 'info'
                                    }
                                    size="sm"
                                    className="text-xs px-1.5 py-0.5"
                                  >
                                    {task.priority}
                                  </Badge>
                                  <Badge variant={isPastDate ? "default" : "success"} size="sm" className="text-xs px-1.5 py-0.5">
                                    Completed
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      
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
  const { users, tasks, addTask, searchTasks } = useData();
  
  // State management
  const [selectedTeam, setSelectedTeam] = useState<TeamType>('creative');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [weekStart, setWeekStart] = useState<string>(
    format(startOfWeek(getIndiaDateTime(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  );
  const [dailyReports, setDailyReports] = useState<{ [key: string]: DailyReport | null }>({});
  const [dayLoadingStates, setDayLoadingStates] = useState<{ [dateStr: string]: boolean }>({});
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [addTaskForUser, setAddTaskForUser] = useState<string>('');
  const [addTaskForDate, setAddTaskForDate] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);

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
    end: addDays(parseISO(weekStart), 6),
  });

  // Get filtered users with safety check
  const filteredUsers = users.filter(user => 
    user && user.isActive && 
    (isAdmin ? (user.team === selectedTeam || user.role === 'admin') : user.id === currentUser?.id)
  );

  // ONE-TIME INITIALIZATION - only runs once when component mounts
  useEffect(() => {
    if (!isInitialized && filteredUsers.length > 0) {
      const today = getIndiaDate();
      
      // Set initial user
      if (isAdmin && filteredUsers.length > 0) {
        setSelectedUser(filteredUsers[0].id);
      } else if (!isAdmin) {
        setSelectedUser(currentUser.id);
      }
      
      // Set initial date to today
      setSelectedDate(today);
      
      // Set initial week to current week
      const currentWeekStart = format(startOfWeek(getIndiaDateTime(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      setWeekStart(currentWeekStart);
      
      // Mark as initialized to prevent this from running again
      setIsInitialized(true);
      
      console.log('Component initialized with:', { 
        selectedUser: isAdmin ? filteredUsers[0]?.id : currentUser.id,
        selectedDate: today,
        weekStart: currentWeekStart
      });
    }
  }, [isInitialized, filteredUsers.length, isAdmin, currentUser]);

  // LOAD DATA - only runs when we have a valid selectedUser and selectedDate
  useEffect(() => {
    const loadData = async () => {
      if (!isInitialized || !selectedUser || !selectedDate || filteredUsers.length === 0) {
        return;
      }

      console.log('Loading data for:', { selectedUser, selectedDate });
      
      const isToday = selectedDate === getIndiaDate();
      if (isToday && Object.keys(dailyReports).length === 0) {
        setIsInitialLoading(true);
      }

      try {
        await loadSpecificDay(selectedDate);
      } catch (error) {
        console.error('Error loading day:', error);
      } finally {
        if (isToday) {
          setIsInitialLoading(false);
        }
      }
    };

    loadData();
  }, [isInitialized, selectedUser, selectedDate, filteredUsers.length]);

  // WEEK ALIGNMENT - ensure selectedDate is within weekDays range
  useEffect(() => {
    if (!selectedDate || !isInitialized) return;

    const selectedDateObj = parseISO(selectedDate);
    const weekStartObj = parseISO(weekStart);
    const weekEndObj = addDays(weekStartObj, 6);

    // Only adjust week if selectedDate is outside current week window
    if (selectedDateObj < weekStartObj || selectedDateObj > weekEndObj) {
      const newWeekStart = format(
        startOfWeek(selectedDateObj, { weekStartsOn: 1 }),
        'yyyy-MM-dd'
      );
      
      if (newWeekStart !== weekStart) {
        console.log('Adjusting week to include selected date:', { selectedDate, newWeekStart });
        setWeekStart(newWeekStart);
      }
    }
  }, [selectedDate, weekStart, isInitialized]);

  // Get users to display
  const usersToDisplay = isAdmin 
    ? (selectedUser === 'all' ? filteredUsers : filteredUsers.filter(u => u.id === selectedUser))
    : filteredUsers;

  // Load data for a specific day - NO automatic rollover, just load existing data
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
        try {
          console.log(`📊 Loading data for ${user.name} on ${dateStr} (no auto-rollover)...`);
          
          // 🚀 FIXED: Just get regular daily report, no automatic rollover
          // Rollover should only happen at 12 AM IST via scheduled job
          const report = await dailyReportService.getDailyReport(user.id, dateStr);
          
          if (report) {
            console.log(`📊 Report loaded for ${user.name} on ${dateStr}:`, {
              assignedTasks: report.workEntry.assignedTasks?.length || 0,
              completedTasks: report.workEntry.completedTasks?.length || 0,
              assignedTaskIds: report.workEntry.assignedTasks,
            });
            
            // Get tasks assigned to this user from TaskBoard
            const tasksForUser = await searchTasks({ assigneeId: user.id });
            
            // 🚀 FIXED: Include tasks due on this date OR that should still be visible
            // This ensures past-deadline tasks are still shown in daily reports
            const tasksDueToday = tasksForUser.filter(task => {
              // Include tasks due on this specific date
              if (task.dueDate === dateStr) return true;
              
              // 🚀 KEY FIX: For tasks past their deadline but still unfinished,
              // include them if they're due BEFORE today but not completed
              const taskDueDate = parseISO(task.dueDate);
              const currentDate = parseISO(dateStr);
              
              // Include past-deadline tasks that aren't completed yet
              if (taskDueDate < currentDate) {
                // Check if this task is in the completed list for ANY day
                // If not found in completed lists, it should roll over
                return !report.workEntry.completedTasks.includes(task.id);
              }
              
              return false;
            });
            
            const dueIds = tasksDueToday.map(t => t.id);
            
            // Merge assigned task IDs (from database + due today + past deadline)
            report.workEntry.assignedTasks = Array.from(
              new Set([...(report.workEntry.assignedTasks || []), ...dueIds])
            );
            
            // Merge assigned task objects uniquely via a Map
            const assignedMap = new Map<string, Task>();
            (report.tasks.assigned || []).forEach(t => assignedMap.set(t.id, t));
            tasksDueToday.forEach(t => assignedMap.set(t.id, t));
            report.tasks.assigned = Array.from(assignedMap.values());
            
            // Update completed tasks mapping 
            const completedTaskIds = report.workEntry.completedTasks || [];
            const completedTaskObjects = tasksForUser.filter(t => completedTaskIds.includes(t.id));
            report.tasks.completed = completedTaskObjects;
            
            console.log(`📋 Final report for ${user.name} on ${dateStr}:`, {
              totalAssignedTasks: report.workEntry.assignedTasks?.length || 0,
              tasksFromDatabase: (report.workEntry.assignedTasks || []).filter(id => !dueIds.includes(id)).length,
              tasksFromDueToday: dueIds.filter(id => tasksForUser.find(t => t.id === id && t.dueDate === dateStr)).length,
              tasksFromPastDeadline: dueIds.filter(id => {
                const task = tasksForUser.find(t => t.id === id);
                return task && parseISO(task.dueDate) < parseISO(dateStr);
              }).length,
            });
          } else {
            console.log(`⚠️ No report generated for ${user.name} on ${dateStr}`);
          }
          dayReports[key] = report;
          
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

  // Handle day expansion - simplified
  const handleDayToggle = (dateStr: string) => {
    if (selectedDate === dateStr) {
      setSelectedDate('');
    } else {
      setSelectedDate(dateStr);
    }
  };

  const handleTaskToggle = async (userId: string, date: string, taskId: string, completed: boolean) => {
    try {
      if (completed) {
        await dailyReportService.moveTaskToCompleted(userId, date, taskId);
      } else {
        await dailyReportService.moveTaskToAssigned(userId, date, taskId);
      }
      
      // Refresh only the day you're on
      await loadSpecificDay(date);
      
      console.log(`Task ${completed ? 'completed' : 'moved back to assigned'} successfully`);
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  const handleCheckInOut = async (userId: string, date: string, checkIn?: string, checkOut?: string) => {
    try {
      await dailyReportService.updateCheckInOut(userId, date, checkIn, checkOut);
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

  const handleAssignTaskToDay = async (userId: string, date: string, taskId: string) => {
    try {
      await dailyReportService.assignTaskToSpecificDay(userId, date, taskId);
      await loadSpecificDay(date);
      console.log(`Task assigned to ${date} successfully`);
    } catch (error) {
      console.error('Error assigning task to day:', error);
      alert('Error assigning task. Please try again.');
    }
  };

  const setThisWeek = () => {
    const today = getIndiaDate();
    const newWeekStart = format(startOfWeek(getIndiaDateTime(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    
    // Clear any stale states when returning to current week
    setDayLoadingStates({});
    setDailyReports({});
    setWeekStart(newWeekStart);
    // Clear any expanded day first, then set to today
    setSelectedDate('');
    setTimeout(() => setSelectedDate(today), 50);
  };

  const goToToday = () => {
    const today = getIndiaDate();
    const newWeekStart = format(startOfWeek(getIndiaDateTime(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    
    setWeekStart(newWeekStart);
    // Clear any expanded day first, then set to today
    setSelectedDate('');
    setTimeout(() => setSelectedDate(today), 50);
    
    // Scroll to today after a delay
    setTimeout(() => {
      todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const currentWeek = parseISO(weekStart);
    const newWeek = direction === 'next' 
      ? addDays(currentWeek, 7)
      : addDays(currentWeek, -7);
    
    // Clear any expanded day when navigating weeks
    setSelectedDate('');
    // Clear day loading states to prevent stale loading indicators
    setDayLoadingStates({});
    // Clear daily reports to force fresh data load
    setDailyReports({});
    setWeekStart(format(newWeek, 'yyyy-MM-dd'));
  };

  // Handle manual week date selection
  const handleWeekDateChange = (newWeekStart: string) => {
    // Clear any expanded day when manually selecting a week
    setSelectedDate('');
    // Clear day loading states to prevent stale loading indicators
    setDayLoadingStates({});
    // Clear daily reports to force fresh data load
    setDailyReports({});
    setWeekStart(newWeekStart);
  };

  // Handle team selection with cleanup
  const handleTeamChange = (newTeam: TeamType) => {
    // Clear expanded day when switching teams
    setSelectedDate('');
    setSelectedTeam(newTeam);
    setSelectedUser(''); // Reset user selection
  };

  // Handle user selection with cleanup
  const handleUserChange = (newUserId: string) => {
    setSelectedUser(newUserId);
  };

  // Show loading state if not initialized
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 bg-gradient-to-r from-white via-blue-50 to-indigo-50 p-8 rounded-2xl shadow-xl border border-gray-200 transition-all duration-300 hover:shadow-2xl backdrop-blur-sm">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center transition-all duration-300 group">
            <BarChart3 className="h-8 w-8 mr-4 text-blue-600 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3" />
            <span className="bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
            Reports & Analytics
            </span>
          </h1>
          <p className="text-base text-gray-600 font-medium">Track daily work progress and team performance</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-4 px-6 py-4 bg-white rounded-2xl border-2 border-blue-200 shadow-md transition-all duration-300 hover:shadow-lg hover:border-blue-300 backdrop-blur-sm">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-blue-900 text-base">
              Week of {format(parseISO(weekStart), 'MMM d, yyyy')}
            </span>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Filter Panel */}
      <Card className="sticky top-4 z-10 bg-white shadow-lg border border-gray-300 rounded-2xl overflow-hidden backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Team Selector */}
            {isAdmin && (
              <div className="lg:col-span-3">
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <Users className="h-4 w-4 mr-2 text-blue-600" />
                  Team
                </label>
                <div className="relative group">
                <select
                  value={selectedTeam}
                  onChange={(e) => handleTeamChange(e.target.value as TeamType)}
                    className="w-full text-sm border-2 border-gray-200 rounded-xl px-4 py-3 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 shadow-sm hover:shadow-md hover:border-gray-300 appearance-none cursor-pointer font-medium"
                >
                  <option value="creative">Creative Team</option>
                  <option value="web">Web Team</option>
                </select>
                  <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-gray-400 pointer-events-none transition-transform duration-200 group-hover:text-gray-600" />
                </div>
              </div>
            )}

            {/* User Selector (Admin only) */}
            {isAdmin && (
              <div className="lg:col-span-3">
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <User className="h-4 w-4 mr-2 text-blue-600" />
                  User
                </label>
                <div className="relative group">
                <select
                  value={selectedUser}
                  onChange={(e) => handleUserChange(e.target.value)}
                    className="w-full text-sm border-2 border-gray-200 rounded-xl px-4 py-3 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 shadow-sm hover:shadow-md hover:border-gray-300 appearance-none cursor-pointer font-medium"
                >
                  {filteredUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.role})
                    </option>
                  ))}
                </select>
                  <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-gray-400 pointer-events-none transition-transform duration-200 group-hover:text-gray-600" />
                </div>
              </div>
            )}

            {/* Week Navigation */}
            <div className={`${isAdmin ? 'lg:col-span-4' : 'lg:col-span-8'}`}>
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                Week Selection
              </label>
              <div className="flex items-center space-x-3 bg-gray-50 rounded-xl p-2 border border-gray-200">
                <Button
                  variant="secondary"
                  onClick={() => navigateWeek('prev')}
                  className="px-4 py-2.5 bg-white hover:bg-gray-100 transition-all duration-300 shadow-sm hover:shadow-md rounded-lg border border-gray-300 flex items-center justify-center min-w-[44px]"
                  size="sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <input
                  type="date"
                  value={weekStart}
                  onChange={(e) => handleWeekDateChange(e.target.value)}
                  className="flex-1 text-sm border-2 border-gray-200 rounded-lg px-4 py-2.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 shadow-sm hover:shadow-md font-medium"
                />
                <Button
                  variant="secondary"
                  onClick={() => navigateWeek('next')}
                  className="px-4 py-2.5 bg-white hover:bg-gray-100 transition-all duration-300 shadow-sm hover:shadow-md rounded-lg border border-gray-300 flex items-center justify-center min-w-[44px]"
                  size="sm"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Quick Navigation Buttons */}
            <div className={`${isAdmin ? 'lg:col-span-2' : 'lg:col-span-4'}`}>
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <Target className="h-4 w-4 mr-2 text-blue-600" />
                Quick Actions
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                <button
                onClick={setThisWeek}
                  className="w-full h-12 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white transition-all duration-300 shadow-sm hover:shadow-lg rounded-xl transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 font-medium text-sm button-focus overflow-hidden"
                >
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">This Week</span>
                </button>
                <button
                onClick={goToToday}
                  className="w-full h-12 px-4 bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400 transition-all duration-300 shadow-sm hover:shadow-md rounded-xl transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 font-medium text-gray-700 hover:text-gray-900 text-sm button-focus overflow-hidden"
                >
                  <Target className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Today</span>
                </button>
              </div>
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
            const isToday = isSameDay(day, getIndiaDateTime());
            
            return (
              <div key={dateStr} ref={isToday ? todayRef : undefined}>
                {usersToDisplay.map((user) => {
                  const reportKey = `${user.id}-${dateStr}`;
                  const report = dailyReports[reportKey];

                  return (
                    <DailyCard
                      key={reportKey}
                      userId={user.id}
                      date={dateStr}
                      report={report}
                      onTaskToggle={(taskId, completed) => handleTaskToggle(user.id, dateStr, taskId, completed)}
                      onAddTask={() => handleAddTask(user.id, dateStr)}
                      onCheckInOut={(checkIn, checkOut) => handleCheckInOut(user.id, dateStr, checkIn, checkOut)}
                      isAdmin={isAdmin}
                      userTasks={[]}
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

      {/* Add Task Modal */}
      {showAddTaskModal && (
        <NewTaskModal
          isOpen={showAddTaskModal}
          onClose={() => {
            setShowAddTaskModal(false);
            // Refresh the day's data after modal closes to show new task
            if (addTaskForDate) {
              loadSpecificDay(addTaskForDate);
            }
          }}
        />
      )}
    </div>
  );
};

export default ReportsAnalytics; 