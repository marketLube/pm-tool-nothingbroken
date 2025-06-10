import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, parseISO, isSameDay } from 'date-fns';
import { getIndiaDateTime, getIndiaDate } from '../utils/timezone';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
  Building2,
  RefreshCw,
  Download
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { getAttendanceStatus, getFilteredUsersForAttendance } from '../services/attendanceService';
import { getCompletedTasksForDay } from '../services/dailyReportService';
import IndividualAttendanceExportModal from '../components/modals/IndividualAttendanceExportModal';
import IndividualAttendanceReportPDF from '../components/pdf/IndividualAttendanceReportPDF';
import { pdf } from '@react-pdf/renderer';

interface DayData {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  attendance?: {
    checkInTime?: string;
    checkOutTime?: string;
    totalHours?: number;
    isAbsent: boolean;
  };
  completedTasks: Array<{
    id: string;
    title: string;
    clientName?: string;
    status: string;
  }>;
}

interface TooltipData {
  x: number;
  y: number;
  day: DayData;
}

const AttendanceCalendar: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();
  const { users, teams, getUserById, getClientById } = useData();
  
  const [currentDate, setCurrentDate] = useState(getIndiaDateTime());
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [calendarData, setCalendarData] = useState<DayData[]>([]);
  const [monthlyStats, setMonthlyStats] = useState({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    averageHours: 0,
    totalTasks: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(getIndiaDateTime());
  
  // Individual export states
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Get filtered users based on role permissions (same logic as Attendance page)
  const filteredUsersByRole = currentUser ? getFilteredUsersForAttendance(
    users,
    currentUser.role,
    currentUser.team || 'creative',
    currentUser.id
  ) : [];

  // Apply team filter
  const filteredUsers = filteredUsersByRole.filter(user => {
    if (selectedTeam !== 'all' && user.team !== selectedTeam && user.role !== 'admin' && user.role !== 'super_admin') return false;
    return true;
  });

  // Check if current user can view other users (admin/super_admin/manager)
  const canViewAllUsers = currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.role === 'manager';

  // Set default user based on permissions
  useEffect(() => {
    if (!canViewAllUsers && currentUser?.id) {
      setSelectedUser(currentUser.id);
    } else if (canViewAllUsers && !selectedUser && filteredUsers.length > 0) {
      setSelectedUser(filteredUsers[0].id);
    }
  }, [canViewAllUsers, currentUser, filteredUsers, selectedUser]);

  const loadCalendarData = async (isManualRefresh = false) => {
    if (!selectedUser) return;
    
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    
    try {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

      const calendarPromises = days.map(async (day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        
        // Get attendance data
        const attendance = await getAttendanceStatus(selectedUser, dateStr);
        
        // Get completed tasks
        const completedTasks = await getCompletedTasksForDay(selectedUser, dateStr);
        
        // Add client names to tasks
        const tasksWithClientNames = completedTasks.map((task: {
          id: string;
          title: string;
          clientId?: string;
          status: string;
        }) => ({
          ...task,
          clientName: task.clientId ? getClientById(task.clientId)?.name : 'No Client'
        }));

        return {
          date: day,
          isCurrentMonth: isSameMonth(day, currentDate),
          isToday: isSameDay(day, getIndiaDateTime()),
          attendance: {
            checkInTime: attendance.checkInTime,
            checkOutTime: attendance.checkOutTime,
            totalHours: attendance.totalHours,
            isAbsent: attendance.isAbsent
          },
          completedTasks: tasksWithClientNames
        };
      });

      const calendarData = await Promise.all(calendarPromises);
      setCalendarData(calendarData);

      // Calculate monthly stats
      const currentMonthDays = calendarData.filter(day => day.isCurrentMonth);
      const presentDays = currentMonthDays.filter(day => 
        day.attendance && !day.attendance.isAbsent && day.attendance.checkInTime
      ).length;
      const absentDays = currentMonthDays.filter(day => 
        day.attendance && day.attendance.isAbsent
      ).length;
      const totalHours = currentMonthDays.reduce((sum, day) => 
        sum + (day.attendance?.totalHours || 0), 0
      );
      const totalTasks = currentMonthDays.reduce((sum, day) => 
        sum + day.completedTasks.length, 0
      );

      setMonthlyStats({
        totalDays: currentMonthDays.length,
        presentDays,
        absentDays,
        averageHours: presentDays > 0 ? Math.round((totalHours / presentDays) * 100) / 100 : 0,
        totalTasks
      });

      setLastRefresh(getIndiaDateTime());

    } catch (error) {
      console.error('Error loading calendar data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Manual refresh function
  const handleRefresh = () => {
    loadCalendarData(true);
  };

  useEffect(() => {
    if (selectedUser && users.length > 0) {
      loadCalendarData();
    }
  }, [currentDate, selectedUser, users]);

  // Auto-refresh every 30 seconds to catch updates from Reports page
  useEffect(() => {
    if (!selectedUser) return;
    
    const interval = setInterval(() => {
      loadCalendarData(true);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [selectedUser, currentDate]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      setCurrentDate(prevMonth);
    } else {
      const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
      setCurrentDate(nextMonth);
    }
  };

  const handleDayHover = (event: React.MouseEvent, day: DayData) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      day
    });
  };

  const handleDayLeave = () => {
    setTooltip(null);
  };

  const getDayStatusClass = (day: DayData) => {
    if (!day.isCurrentMonth) return 'bg-gray-50 text-gray-400';
    if (day.isToday) return 'bg-blue-100 border-2 border-blue-500 text-blue-900 font-bold';
    
    if (day.attendance?.isAbsent) {
      return 'bg-red-100 text-red-800 border border-red-300';
    } else if (day.attendance?.checkInTime && day.attendance?.checkOutTime) {
      return 'bg-green-100 text-green-800 border border-green-300';
    } else if (day.attendance?.checkInTime) {
      return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
    } else {
      return 'bg-gray-100 text-gray-600 border border-gray-200';
    }
  };

  const getDayIcon = (day: DayData) => {
    if (!day.isCurrentMonth) return null;
    
    if (day.attendance?.isAbsent) {
      return <XCircle className="w-4 h-4 text-red-600" />;
    } else if (day.attendance?.checkInTime && day.attendance?.checkOutTime) {
      return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    } else if (day.attendance?.checkInTime) {
      return <Clock className="w-4 h-4 text-yellow-600" />;
    } else {
      return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const selectedUserData = getUserById(selectedUser);

  const handleIndividualExport = async (month: number, year: number) => {
    if (!selectedUser) return;

    setIsExporting(true);
    try {
      // Fetch attendance data for the selected month/year
      const startDate = startOfMonth(new Date(year, month - 1));
      const endDate = endOfMonth(new Date(year, month - 1));
      const days = eachDayOfInterval({ start: startDate, end: endDate });

      const attendancePromises = days.map(async (day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const attendance = await getAttendanceStatus(selectedUser, dateStr);
        
        return {
          date: dateStr,
          checkInTime: attendance.checkInTime,
          checkOutTime: attendance.checkOutTime,
          totalHours: attendance.totalHours,
          isAbsent: attendance.isAbsent
        };
      });

      const attendanceData = await Promise.all(attendancePromises);
      const selectedUserData = getUserById(selectedUser);
      const teamData = teams.find(team => team.id === selectedUserData?.team);

      if (!selectedUserData) {
        throw new Error('Selected user not found');
      }

      // Generate PDF
      const pdfDoc = (
        <IndividualAttendanceReportPDF
          employeeName={selectedUserData.name}
          teamName={teamData?.name || selectedUserData.team || 'Unknown Team'}
          month={month}
          year={year}
          attendanceData={attendanceData}
        />
      );

      const blob = await pdf(pdfDoc).toBlob();
      
      // Create download link
      let url: string;
      try {
        url = URL.createObjectURL(blob);
      } catch (error) {
        console.error('Failed to create object URL for PDF download:', error);
        throw new Error('Failed to prepare download. Please try again.');
      }
      const link = document.createElement('a');
      link.href = url;
      
      const monthName = format(new Date(year, month - 1), 'MMMM');
      link.download = `${selectedUserData.name.replace(/\s+/g, '_')}_Attendance_${monthName}_${year}.pdf`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setIsExportModalOpen(false);
    } catch (error) {
      console.error('Error generating individual attendance report:', error);
      alert('Failed to generate attendance report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => navigate('/attendance')}
            variant="secondary"
            icon={ArrowLeft}
          >
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Attendance Calendar</h1>
            <p className="text-gray-600 mt-1">
              {selectedUserData ? `${selectedUserData.name}'s attendance calendar` : 'Employee attendance calendar'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Individual Export Button - Admin Only */}
          {isAdmin && selectedUserData && (
            <Button
              onClick={() => setIsExportModalOpen(true)}
              variant="primary"
              icon={Download}
              disabled={isLoading || isRefreshing}
            >
              Export Individual Report
            </Button>
          )}
          <div className="text-right">
            <p className="text-sm text-gray-500">Last updated</p>
            <p className="text-xs text-gray-400">{format(lastRefresh, 'HH:mm:ss')}</p>
          </div>
          <Button
            onClick={handleRefresh}
            variant="secondary"
            icon={RefreshCw}
            disabled={isRefreshing}
            className={isRefreshing ? 'animate-spin' : ''}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {canViewAllUsers && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team
                  </label>
                  <select
                    value={selectedTeam}
                    onChange={(e) => {
                      setSelectedTeam(e.target.value);
                      // Reset user selection when team changes
                      if (e.target.value !== 'all') {
                        const teamUsers = users.filter(user => user.team === e.target.value);
                        if (teamUsers.length > 0) {
                          setSelectedUser(teamUsers[0].id);
                        }
                      } else if (users.length > 0) {
                        setSelectedUser(users[0].id);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Teams</option>
                    {teams.map(team => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employee
                  </label>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {filteredUsers.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
            {!canViewAllUsers && (
              <div className="md:col-span-2">
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">Viewing Your Attendance</p>
                    <p className="text-sm text-blue-700">You can only view your own attendance calendar</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Working Days</p>
                <p className="text-xl font-bold text-blue-900">{monthlyStats.totalDays}</p>
              </div>
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Present Days</p>
                <p className="text-xl font-bold text-green-900">{monthlyStats.presentDays}</p>
              </div>
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-600 text-sm font-medium">Absent Days</p>
                <p className="text-xl font-bold text-red-900">{monthlyStats.absentDays}</p>
              </div>
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">Avg Hours</p>
                <p className="text-xl font-bold text-purple-900">{monthlyStats.averageHours}h</p>
              </div>
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 text-sm font-medium">Tasks Done</p>
                <p className="text-xl font-bold text-orange-900">{monthlyStats.totalTasks}</p>
              </div>
              <Building2 className="w-6 h-6 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {format(currentDate, 'MMMM yyyy')}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => navigateMonth('prev')}
                variant="secondary"
                size="sm"
                className="p-2"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => navigateMonth('next')}
                variant="secondary"
                size="sm"
                className="p-2"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading calendar data...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 mb-4">
                {/* Day headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                    {day}
                  </div>
                ))}
                
                {/* Calendar days */}
                {calendarData.map((day, index) => (
                  <div
                    key={index}
                    className={`relative p-2 min-h-[80px] cursor-pointer transition-all duration-200 hover:shadow-md rounded-lg ${getDayStatusClass(day)}`}
                    onMouseEnter={(e) => handleDayHover(e, day)}
                    onMouseLeave={handleDayLeave}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {format(day.date, 'd')}
                      </span>
                      {getDayIcon(day)}
                    </div>
                    
                    {day.isCurrentMonth && day.attendance?.totalHours && (
                      <div className="text-xs text-gray-600 mb-1">
                        {day.attendance.totalHours}h
                      </div>
                    )}
                    
                    {day.isCurrentMonth && day.completedTasks.length > 0 && (
                      <div className="text-xs text-gray-600">
                        {day.completedTasks.length} task{day.completedTasks.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-600">Full Day</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm text-gray-600">Partial Day</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-gray-600">Absent</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">No Data</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm"
          style={{
            left: tooltip.x - 150,
            top: tooltip.y - 10,
            transform: 'translateY(-100%)'
          }}
        >
          <div className="space-y-2">
            <div className="font-medium text-gray-900">
              {format(tooltip.day.date, 'EEEE, MMMM d, yyyy')}
            </div>
            
            {tooltip.day.attendance && (
              <div className="space-y-1">
                <div className="text-sm text-gray-600">
                  <strong>Check-in:</strong> {tooltip.day.attendance.checkInTime || 'Not checked in'}
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Check-out:</strong> {tooltip.day.attendance.checkOutTime || 'Not checked out'}
                </div>
                {tooltip.day.attendance.totalHours && (
                  <div className="text-sm text-gray-600">
                    <strong>Total Hours:</strong> {tooltip.day.attendance.totalHours}h
                  </div>
                )}
              </div>
            )}
            
            {tooltip.day.completedTasks.length > 0 && (
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-700">
                  Completed Tasks ({tooltip.day.completedTasks.length}):
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {tooltip.day.completedTasks.map((task, index) => (
                    <div key={index} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                      <div className="font-medium">{task.title}</div>
                      {task.clientName && (
                        <div className="text-gray-500">Client: {task.clientName}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {tooltip.day.completedTasks.length === 0 && tooltip.day.isCurrentMonth && (
              <div className="text-sm text-gray-500">No tasks completed</div>
            )}
          </div>
        </div>
      )}

      {/* Individual Export Modal */}
      {selectedUserData && (
        <IndividualAttendanceExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          onExport={handleIndividualExport}
          employeeName={selectedUserData.name}
          teamName={teams.find(team => team.id === selectedUserData.team)?.name || selectedUserData.team || 'Unknown Team'}
          isExporting={isExporting}
        />
      )}
    </div>
  );
};

export default AttendanceCalendar; 