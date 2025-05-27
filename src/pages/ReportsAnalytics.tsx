import React, { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, addDays } from 'date-fns';
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
  CalendarDays
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
}

const DailyCard: React.FC<DailyCardProps> = ({
  userId,
  date,
  report,
  onTaskToggle,
  onAddTask,
  onAbsentToggle,
  onCheckInOut,
  isAdmin
}) => {
  const { getUserById, getClientById } = useData();
  const user = getUserById(userId);
  const isAbsent = report?.workEntry.isAbsent || false;
  const assignedTasks = report?.tasks.assigned || [];
  const completedTasks = report?.tasks.completed || [];

  const formatTime = (time?: string) => {
    if (!time) return '--:--';
    return time;
  };

  return (
    <div className="space-y-4">
      {/* User Header (for admin view) */}
      {isAdmin && (
        <div className="flex items-center space-x-3 mb-4">
                     <Avatar name={user?.name} size="sm" />
          <div>
            <h3 className="font-medium text-gray-900">{user?.name}</h3>
            <p className="text-sm text-gray-600 capitalize">{user?.team} Team</p>
          </div>
        </div>
      )}

      {/* Date Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-gray-900">
          {format(parseISO(date), 'EEEE, MMM d')}
        </h4>
        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={isAbsent}
              onChange={(e) => onAbsentToggle(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-700">Mark Absent</span>
          </label>
        </div>
      </div>

      {/* Check-in/Check-out Times */}
      {!isAbsent && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Check In
            </label>
            <input
              type="time"
              value={report?.workEntry.checkInTime || ''}
              onChange={(e) => onCheckInOut(e.target.value, undefined)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Check Out
            </label>
            <input
              type="time"
              value={report?.workEntry.checkOutTime || ''}
              onChange={(e) => onCheckInOut(undefined, e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* Task Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tasks Assigned */}
        <Card className={isAbsent ? 'opacity-50' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Tasks Assigned</span>
              <Badge variant="info">{assignedTasks.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {assignedTasks.map((task) => {
                const client = getClientById(task.clientId);
                return (
                  <div
                    key={task.id}
                    className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <button
                      onClick={() => onTaskToggle(task.id, true)}
                      className="mt-0.5 text-gray-400 hover:text-green-600"
                      disabled={isAbsent}
                    >
                      <Circle className="h-5 w-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">
                        {task.title}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Client: {client?.name || 'Unknown'}
                      </p>
                      <p className="text-sm text-gray-500">
                        Due: {format(parseISO(task.dueDate), 'MMM d')}
                      </p>
                    </div>
                    <Badge 
                      variant={
                        task.priority === 'high' ? 'danger' : 
                        task.priority === 'medium' ? 'warning' : 'info'
                      }
                    >
                      {task.priority}
                    </Badge>
                  </div>
                );
              })}
              
              {!isAbsent && (
                                 <Button
                   variant="secondary"
                   onClick={onAddTask}
                   className="w-full flex items-center justify-center space-x-2 py-3 border-dashed"
                 >
                  <Plus className="h-4 w-4" />
                  <span>Add Task</span>
                </Button>
              )}
              
              {assignedTasks.length === 0 && (
                <div className="text-center py-6 text-gray-500">
                  <Circle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No tasks assigned</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tasks Completed */}
        <Card className={isAbsent ? 'opacity-50' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Tasks Completed</span>
              <Badge variant="success">{completedTasks.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedTasks.map((task) => {
                const client = getClientById(task.clientId);
                return (
                  <div
                    key={task.id}
                    className="flex items-start space-x-3 p-3 border border-green-200 rounded-lg bg-green-50"
                  >
                    <button
                      onClick={() => onTaskToggle(task.id, false)}
                      className="mt-0.5 text-green-600 hover:text-gray-400"
                      disabled={isAbsent}
                    >
                      <CheckCircle className="h-5 w-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">
                        {task.title}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Client: {client?.name || 'Unknown'}
                      </p>
                      <p className="text-sm text-gray-500">
                        Due: {format(parseISO(task.dueDate), 'MMM d')}
                      </p>
                    </div>
                    <Badge variant="success">
                      Completed
                    </Badge>
                  </div>
                );
              })}
              
              {completedTasks.length === 0 && (
                <div className="text-center py-6 text-gray-500">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No tasks completed</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const ReportsAnalytics: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const { users, tasks, addTask } = useData();
  
  // State management
  const [selectedTeam, setSelectedTeam] = useState<TeamType>('web');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [weekStart, setWeekStart] = useState<string>(
    format(startOfWeek(new Date()), 'yyyy-MM-dd')
  );
  const [dailyReports, setDailyReports] = useState<{ [key: string]: DailyReport | null }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [addTaskForUser, setAddTaskForUser] = useState<string>('');
  const [addTaskForDate, setAddTaskForDate] = useState<string>('');

  // Get week days
  const weekDays = eachDayOfInterval({
    start: parseISO(weekStart),
    end: endOfWeek(parseISO(weekStart)),
  });

  // Get filtered users
  const filteredUsers = users.filter(user => 
    user.isActive && 
    (isAdmin ? user.team === selectedTeam : user.id === currentUser?.id)
  );

  // Get users to display
  const usersToDisplay = isAdmin 
    ? (selectedUser === 'all' ? filteredUsers : filteredUsers.filter(u => u.id === selectedUser))
    : filteredUsers;

  // Load daily reports
  useEffect(() => {
    loadDailyReports();
  }, [selectedTeam, selectedUser, weekStart, usersToDisplay]);

  const loadDailyReports = async () => {
    setIsLoading(true);
    try {
      const reports: { [key: string]: DailyReport | null } = {};
      
      for (const user of usersToDisplay) {
        for (const day of weekDays) {
          const dateStr = format(day, 'yyyy-MM-dd');
          const key = `${user.id}-${dateStr}`;
          
          try {
            const report = await dailyReportService.getDailyReport(user.id, dateStr);
            reports[key] = report;
          } catch (error) {
            console.error(`Error loading report for ${user.name} on ${dateStr}:`, error);
            reports[key] = null;
          }
        }
      }
      
      setDailyReports(reports);
    } catch (error) {
      console.error('Error loading daily reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskToggle = async (userId: string, date: string, taskId: string, completed: boolean) => {
    try {
      if (completed) {
        await dailyReportService.moveTaskToCompleted(userId, date, taskId);
      } else {
        await dailyReportService.moveTaskToAssigned(userId, date, taskId);
      }
      
      // Reload the specific report
      const report = await dailyReportService.getDailyReport(userId, date);
      setDailyReports(prev => ({
        ...prev,
        [`${userId}-${date}`]: report
      }));
    } catch (error) {
      console.error('Error toggling task:', error);
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

  const setThisWeek = () => {
    setWeekStart(format(startOfWeek(new Date()), 'yyyy-MM-dd'));
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const currentWeek = parseISO(weekStart);
    const newWeek = direction === 'next' 
      ? addDays(currentWeek, 7)
      : addDays(currentWeek, -7);
    setWeekStart(format(newWeek, 'yyyy-MM-dd'));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600">Track daily work progress and team performance</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">
            Week of {format(parseISO(weekStart), 'MMM d, yyyy')}
          </span>
        </div>
      </div>

      {/* Fixed Filter Panel */}
      <Card className="sticky top-0 z-10 bg-white shadow-sm">
        <CardContent className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* Team Selector */}
            {isAdmin && (
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Team
                </label>
                <select
                  value={selectedTeam}
                  onChange={(e) => {
                    setSelectedTeam(e.target.value as TeamType);
                    setSelectedUser('all');
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="web">Web Team</option>
                  <option value="creative">Creative Team</option>
                </select>
              </div>
            )}

            {/* User Selector (Admin only) */}
            {isAdmin && (
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Users</option>
                  {filteredUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.role})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Week Navigation */}
            <div className={`${isAdmin ? 'md:col-span-4' : 'md:col-span-8'}`}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Week Selection
              </label>
              <div className="flex space-x-2">
                                 <Button
                   variant="secondary"
                   onClick={() => navigateWeek('prev')}
                   className="px-3"
                 >
                   ←
                 </Button>
                <input
                  type="date"
                  value={weekStart}
                  onChange={(e) => setWeekStart(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
                                 <Button
                   variant="secondary"
                   onClick={() => navigateWeek('next')}
                   className="px-3"
                 >
                   →
                 </Button>
              </div>
            </div>

            {/* This Week Button */}
            <div className="md:col-span-2">
              <Button
                onClick={setThisWeek}
                className="w-full"
              >
                This Week
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily View */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading reports...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {weekDays.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            
            return (
              <div key={dateStr} className="space-y-6">
                {/* Day Header */}
                <div className="flex items-center space-x-3 border-b border-gray-200 pb-2">
                  <CalendarDays className="h-5 w-5 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-900">
                    {format(day, 'EEEE, MMMM d, yyyy')}
                  </h2>
                </div>

                {/* User Cards for the Day */}
                <div className="grid grid-cols-1 gap-6">
                  {usersToDisplay.map((user) => {
                    const reportKey = `${user.id}-${dateStr}`;
                    const report = dailyReports[reportKey];
                    
                    return (
                      <Card key={reportKey} className="p-6">
                        <DailyCard
                          userId={user.id}
                          date={dateStr}
                          report={report}
                          onTaskToggle={(taskId, completed) => 
                            handleTaskToggle(user.id, dateStr, taskId, completed)
                          }
                          onAddTask={() => handleAddTask(user.id, dateStr)}
                          onAbsentToggle={(isAbsent) => 
                            handleAbsentToggle(user.id, dateStr, isAbsent)
                          }
                          onCheckInOut={(checkIn, checkOut) => 
                            handleCheckInOut(user.id, dateStr, checkIn, checkOut)
                          }
                          isAdmin={isAdmin}
                        />
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && usersToDisplay.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Users Found</h3>
            <p className="text-gray-600">
              {isAdmin 
                ? "No active users found for the selected team."
                : "You don't have access to view reports."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReportsAnalytics; 