import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { 
  Calendar, 
  Clock, 
  TrendingUp, 
  Users, 
  UserCheck, 
  UserX, 
  AlertCircle,
  Filter,
  Download,
  RefreshCw,
  Building2,
  Timer,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { 
  getTodayAttendanceOverview, 
  getEmployeesAttendance, 
  getAttendanceStats 
} from '../services/attendanceService';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { getIndiaMonthRange } from '../utils/timezone';

interface AttendanceOverview {
  present: number;
  absent: number;
  late: number;
  checkedOut: number;
  totalEmployees: number;
}

interface EmployeeAttendance {
  userId: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  isAbsent: boolean;
  totalHours?: number;
}

const Attendance: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { users, teams, getUserById } = useData();
  
  // State
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [attendanceOverview, setAttendanceOverview] = useState<AttendanceOverview>({
    present: 0,
    absent: 0,
    late: 0,
    checkedOut: 0,
    totalEmployees: 0
  });
  const [employeeAttendanceList, setEmployeeAttendanceList] = useState<EmployeeAttendance[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Filter users based on selected team and employee
  const filteredUsers = users.filter(user => {
    if (selectedTeam !== 'all' && user.team !== selectedTeam && user.role !== 'admin') return false;
    if (selectedEmployee !== 'all' && user.id !== selectedEmployee) return false;
    return true;
  });

  const filteredUserIds = filteredUsers.map(user => user.id);

  // Load attendance data
  const loadAttendanceData = async () => {
    if (filteredUserIds.length === 0) return;
    
    setIsLoading(true);
    try {
      // Get today's overview
      const overview = await getTodayAttendanceOverview(filteredUserIds);
      setAttendanceOverview(overview);

      // Get today's detailed attendance
      const todayAttendance = await getEmployeesAttendance(filteredUserIds);
      setEmployeeAttendanceList(todayAttendance);

      // Get monthly stats
      const monthRange = getIndiaMonthRange();
      const stats = await getAttendanceStats(filteredUserIds, monthRange.startDate, monthRange.endDate);
      setMonthlyStats(stats);

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading attendance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (users.length > 0) {
      loadAttendanceData();
    }
  }, [users, selectedTeam, selectedEmployee]);

  const handleViewCalendar = () => {
    navigate('/attendance/calendar');
  };

  const handleRefresh = () => {
    loadAttendanceData();
  };

  const getStatusColor = (employee: EmployeeAttendance) => {
    if (employee.isAbsent) return 'text-red-600 bg-red-50';
    if (!employee.checkInTime) return 'text-gray-600 bg-gray-50';
    if (employee.checkOutTime) return 'text-green-600 bg-green-50';
    return 'text-blue-600 bg-blue-50';
  };

  const getStatusText = (employee: EmployeeAttendance) => {
    if (employee.isAbsent) return 'Absent';
    if (!employee.checkInTime) return 'Not Checked In';
    if (employee.checkOutTime) return 'Completed';
    return 'Present';
  };

  const getStatusIcon = (employee: EmployeeAttendance) => {
    if (employee.isAbsent) return <UserX className="w-4 h-4" />;
    if (!employee.checkInTime) return <AlertCircle className="w-4 h-4" />;
    if (employee.checkOutTime) return <CheckCircle2 className="w-4 h-4" />;
    return <UserCheck className="w-4 h-4" />;
  };

  const isLate = (checkInTime?: string) => {
    if (!checkInTime) return false;
    const [hour, minute] = checkInTime.split(':').map(Number);
    return hour > 9 || (hour === 9 && minute > 30);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Company Attendance Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Monitor team attendance, track working hours, and analyze patterns
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Last updated: {format(lastUpdated, 'MMM dd, yyyy at h:mm a')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleRefresh}
            variant="secondary"
            icon={RefreshCw}
            disabled={isLoading}
            className={isLoading ? 'animate-pulse' : ''}
          >
            Refresh
          </Button>
          <Button
            onClick={handleViewCalendar}
            variant="primary"
            icon={Calendar}
          >
            View Calendar
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Team
              </label>
              <select
                value={selectedTeam}
                onChange={(e) => {
                  setSelectedTeam(e.target.value);
                  setSelectedEmployee('all'); // Reset employee filter when team changes
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
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Employees</option>
                {filteredUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Total Employees</p>
                <p className="text-2xl font-bold text-blue-900">{attendanceOverview.totalEmployees}</p>
              </div>
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Present Today</p>
                <p className="text-2xl font-bold text-green-900">{attendanceOverview.present}</p>
              </div>
              <UserCheck className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-600 text-sm font-medium">Absent Today</p>
                <p className="text-2xl font-bold text-red-900">{attendanceOverview.absent}</p>
              </div>
              <UserX className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 text-sm font-medium">Late Arrivals</p>
                <p className="text-2xl font-bold text-orange-900">{attendanceOverview.late}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">Checked Out</p>
                <p className="text-2xl font-bold text-purple-900">{attendanceOverview.checkedOut}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Statistics */}
      {monthlyStats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Monthly Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-green-800">Present Days</span>
                <span className="text-lg font-bold text-green-700">{monthlyStats.totalPresentDays}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <span className="text-sm font-medium text-red-800">Absent Days</span>
                <span className="text-lg font-bold text-red-700">{monthlyStats.totalAbsentDays}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-blue-800">Avg Hours/Day</span>
                <span className="text-lg font-bold text-blue-700">{monthlyStats.averageHours}h</span>
              </div>
            </CardContent>
          </Card>

          {/* Today's Detailed Attendance */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-600" />
                Today's Attendance Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {employeeAttendanceList.map((employee) => {
                  const user = getUserById(employee.userId);
                  if (!user) return null;

                  return (
                    <div
                      key={employee.userId}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-500 capitalize">{user.team} Team</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-600">
                            Check-in: {employee.checkInTime || 'Not checked in'}
                            {employee.checkInTime && isLate(employee.checkInTime) && (
                              <span className="ml-1 text-orange-600 text-xs">(Late)</span>
                            )}
                          </p>
                          <p className="text-sm text-gray-600">
                            Check-out: {employee.checkOutTime || 'Not checked out'}
                          </p>
                          {employee.totalHours && (
                            <p className="text-sm font-medium text-gray-700">
                              Total: {employee.totalHours}h
                            </p>
                          )}
                        </div>

                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(employee)}`}>
                          {getStatusIcon(employee)}
                          {getStatusText(employee)}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {employeeAttendanceList.length === 0 && !isLoading && (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No attendance data available for selected filters</p>
                  </div>
                )}

                {isLoading && (
                  <div className="text-center py-8">
                    <RefreshCw className="w-8 h-8 mx-auto mb-3 text-gray-400 animate-spin" />
                    <p className="text-gray-500">Loading attendance data...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={handleViewCalendar}
              variant="secondary"
              className="flex items-center justify-center gap-2 p-4 h-auto"
            >
              <Calendar className="w-5 h-5" />
              <div className="text-left">
                <p className="font-medium">View Calendar</p>
                <p className="text-sm text-gray-500">Monthly attendance view</p>
              </div>
            </Button>

            <Button
              variant="secondary"
              className="flex items-center justify-center gap-2 p-4 h-auto"
              onClick={() => {
                // TODO: Implement export functionality
                console.log('Export attendance data');
              }}
            >
              <Download className="w-5 h-5" />
              <div className="text-left">
                <p className="font-medium">Export Data</p>
                <p className="text-sm text-gray-500">Download attendance reports</p>
              </div>
            </Button>

            <Button
              variant="secondary"
              className="flex items-center justify-center gap-2 p-4 h-auto"
              onClick={() => {
                // TODO: Implement analytics view
                console.log('View analytics');
              }}
            >
              <TrendingUp className="w-5 h-5" />
              <div className="text-left">
                <p className="font-medium">Analytics</p>
                <p className="text-sm text-gray-500">Detailed insights & trends</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Attendance; 