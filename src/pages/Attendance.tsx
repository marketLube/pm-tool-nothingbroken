import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, subDays, startOfMonth, endOfMonth, parse } from 'date-fns';
import { PDFDownloadLink } from '@react-pdf/renderer';
import AttendanceReportPDF from '../components/pdf/AttendanceReportPDF';
import { getIndiaMonthRange, getIndiaTime, getIndiaDateTime, getIndiaDate, validateSystemDate } from '../utils/timezone';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import ExportAttendanceModal from '../components/modals/ExportAttendanceModal';
import Toast from '../components/ui/Toast';
import { 
  ArrowLeft,
  Users, 
  Clock,
  Calendar,
  CheckCircle2,
  UserCheck, 
  UserX, 
  Timer,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Shield,
  Eye,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useNotification } from '../contexts/NotificationContext';
import { 
  getAttendanceStatus,
  getEmployeesAttendance, 
  getTodayAttendanceOverview,
  getAttendanceStats,
  recordManualCheckIn,
  recordCheckOut,
  clearTodayAttendanceForAllUsers,
  getFilteredUsersForAttendance
} from '../services/attendanceService';

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

interface PDFEmployeeData {
  name: string;
  presentDays: number;
  absentDays: number;
  lateIns: number;
  lateOuts: number;
  averageHours: string;
  attendanceRate: string;
}

interface PDFReportData {
  companyName: string;
  teamName: string;
  month: string;
  year: number;
  workingDays: number;
  teamSize: number;
  averageRate: string;
  averageHoursPerDay: string;
  employees: PDFEmployeeData[];
  generatedBy: string;
  generatedOn: string;
}

const Attendance: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const { users } = useData();
  const { showError, showSuccess, showWarning, showInfo } = useNotification();
  const navigate = useNavigate();
  
  // State declarations
  const [attendanceOverview, setAttendanceOverview] = useState<AttendanceOverview>({
    present: 0,
    absent: 0,
    late: 0,
    checkedOut: 0,
    totalEmployees: 0,
  });
  const [employeeAttendanceList, setEmployeeAttendanceList] = useState<EmployeeAttendance[]>([]);
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [monthlyStats, setMonthlyStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(getIndiaDateTime());
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Real-time current time state - Updated every second for accurate IST display
  const [currentTime, setCurrentTime] = useState(getIndiaDateTime());
  const [userCheckInStatus, setUserCheckInStatus] = useState(false);
  const [userCheckOutStatus, setUserCheckOutStatus] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  const [showToast, setShowToast] = useState(false);
  const [pdfData, setPdfData] = useState<PDFReportData | null>(null);
  const [showPdfDownload, setShowPdfDownload] = useState(false);
  const [dateValidation, setDateValidation] = useState<{
    isValid: boolean;
    warnings: string[];
    currentDate: string;
  } | null>(null);
  
  // Get filtered users based on role permissions
  const filteredUsersByRole = currentUser ? getFilteredUsersForAttendance(
    users,
    currentUser.role,
    currentUser.team || 'creative',
    currentUser.id
  ) : [];

  // Apply additional filters (team and employee)
  const filteredUsers = filteredUsersByRole.filter(user => {
    if (selectedTeam !== 'all' && user.team !== selectedTeam && user.role !== 'admin') return false;
    if (selectedEmployee !== 'all' && user.id !== selectedEmployee) return false;
    return true;
  });

  const filteredUserIds = filteredUsers.map(user => user.id);
  
  // Helper function to get user by ID
  const getUserById = (userId: string) => users.find(user => user.id === userId);

  // Helper function to show toast notifications
  const showToastNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  // Helper function to retry PDF generation
  const retryPdfGeneration = async () => {
    if (!pdfData) return;
    
    try {
      console.log('🔄 Retrying PDF generation...');
      showToastNotification('Retrying PDF generation...', 'info');
      
      // Reset the PDF data to trigger regeneration
      setShowPdfDownload(false);
      
      // Wait a moment then regenerate
      setTimeout(() => {
        setPdfData({ ...pdfData }); // Create new object reference to trigger re-render
        setShowPdfDownload(true);
        showToastNotification('PDF regeneration started', 'success');
      }, 500);
      
    } catch (error) {
      console.error('❌ Error retrying PDF generation:', error);
      showToastNotification('Failed to retry PDF generation', 'error');
    }
  };

  // Helper function to close PDF modal
  const closePdfModal = () => {
    console.log('🚪 Closing PDF download modal');
    setShowPdfDownload(false);
    setPdfData(null);
  };

  // Load attendance data with enhanced error handling
  const loadAttendanceData = async () => {
    if (!currentUser || filteredUserIds.length === 0) return;
    
    setIsLoading(true);
    try {
      console.log(`🔄 Loading attendance data for ${filteredUserIds.length} users (Role: ${currentUser.role})`);
      
      // Check date validation first
      const validation = validateSystemDate();
      if (!validation.isValid) {
        console.warn('⚠️ System date validation failed, but continuing with data load...');
        console.warn('⚠️ Current date:', validation.currentDate);
        validation.warnings.forEach(warning => console.warn(`⚠️ ${warning}`));
      }
      
      // Get today's overview with role context
      const overview = await getTodayAttendanceOverview(filteredUserIds, currentUser.role);
      setAttendanceOverview(overview);

      // Get today's detailed attendance with role context
      const todayAttendance = await getEmployeesAttendance(
        filteredUserIds, 
        undefined, 
        currentUser.role, 
        currentUser.team
      );
      setEmployeeAttendanceList(todayAttendance);

      // Get monthly stats
      const monthRange = getIndiaMonthRange();
      const stats = await getAttendanceStats(filteredUserIds, monthRange.startDate, monthRange.endDate);
      setMonthlyStats(stats);

      // Check current user's check-in status
      if (currentUser) {
        try {
          const userStatus = await getAttendanceStatus(currentUser.id);
          setUserCheckInStatus(!!userStatus.checkInTime);
          setUserCheckOutStatus(!!userStatus.checkOutTime);
        } catch (error) {
          console.error('Error getting user check-in status:', error);
          console.warn('⚠️ This might be related to the system date issue.');
          setUserCheckInStatus(false);
          setUserCheckOutStatus(false);
          
          // Show specific error for date-related issues
          if (error instanceof Error && (error.message.includes('406') || error.message.includes('Not Acceptable'))) {
            showToastNotification(
              '⚠️ Unable to load attendance status. This may be due to system date being set incorrectly.',
              'error'
            );
          }
        }
      }

      setLastUpdated(getIndiaDateTime());
      console.log(`✅ Attendance data loaded successfully`);
    } catch (error) {
      console.error('❌ Error loading attendance data:', error);
      
      // Show user-friendly error based on the type of error
      if (error instanceof Error) {
        if (error.message.includes('406') || error.message.includes('Not Acceptable')) {
          showToastNotification(
            '⚠️ Database query failed (406 error). This might be due to system date issues. Please check your date settings.',
            'error'
          );
        } else {
          showToastNotification(
            `❌ Error loading attendance data: ${error.message}`,
            'error'
          );
        }
      }
      
      // Set default values on error
      setAttendanceOverview({
        present: 0,
        absent: 0,
        late: 0,
        checkedOut: 0,
        totalEmployees: filteredUserIds.length,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh every 30 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      if (!isLoading) {
        console.log('🔄 Auto-refreshing attendance data...');
        loadAttendanceData();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, isLoading, filteredUserIds]);

  useEffect(() => {
    if (users.length > 0 && currentUser) {
      loadAttendanceData();
    }
  }, [users, selectedTeam, selectedEmployee, currentUser]);

  // Update current time every second for real-time display
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(getIndiaDateTime());
    }, 1000);

    return () => clearInterval(timeInterval);
  }, []);

  // Validate system date on component mount
  useEffect(() => {
    const validation = validateSystemDate();
    setDateValidation(validation);
    
    if (!validation.isValid) {
      console.warn('⚠️ Date Validation Issues Detected:');
      validation.warnings.forEach(warning => console.warn(`⚠️ ${warning}`));
      
      // Show toast notification about date issues
      showToastNotification(
        '⚠️ System date appears to be set incorrectly. This may cause issues with attendance tracking.',
        'error'
      );
    }
  }, []);

  const handleViewCalendar = () => {
    navigate('/attendance/calendar');
  };

  const handleRefresh = () => {
    console.log('🔄 Manual refresh triggered');
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

  const handleCheckIn = async () => {
    if (!currentUser) {
      showError('User session not found. Please refresh and try again.');
      return;
    }
    
    try {
      setIsCheckingIn(true);
      const currentTimeString = getIndiaTime();
      console.log(`🔄 Attempting check-in for user ${currentUser.id} at ${currentTimeString} IST`);
      
      await recordManualCheckIn(currentUser.id);
      
      // Refresh data to get updated status
      await loadAttendanceData();
      
      const [hour, minute] = currentTimeString.split(':').map(Number);
      let message = `Successfully checked in at ${currentTimeString} IST`;
      if (hour >= 10) {
        message += '\nNote: This is considered a late check-in (after 10:00 AM)';
      }
      showSuccess(message);
      
    } catch (error: any) {
      console.error('❌ Error during manual check-in:', error);
      showError(`Check-in failed: ${error.message || 'Database connection issue. Please try again.'}`);
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    if (!currentUser) {
      showError('User session not found. Please refresh and try again.');
      return;
    }
    
    if (!userCheckInStatus) {
      showWarning('You must check in first before you can check out.');
      return;
    }
    
    if (userCheckOutStatus) {
      showInfo('You have already checked out for today.');
      return;
    }
    
    try {
      setIsCheckingOut(true);
      const currentTimeString = getIndiaTime();
      
      console.log(`🔄 Attempting check-out for user ${currentUser.id} at ${currentTimeString} IST`);
      
      await recordCheckOut(currentUser.id);
      
      // Refresh data to get updated status
      await loadAttendanceData();
      
      showSuccess(`Successfully checked out at ${currentTimeString} IST`);
      
    } catch (error: any) {
      console.error('❌ Error during check-out:', error);
      showError(`Check-out failed: ${error.message || 'Database connection issue. Please try again.'}`);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleClearAllAttendance = async () => {
    if (!isAdmin || !currentUser) return;
    
    const confirmed = confirm(
      '⚠️ ADMIN ACTION: This will clear today\'s attendance for ALL users. This action cannot be undone. Continue?'
    );
    
    if (!confirmed) return;
    
    try {
      setIsClearingAll(true);
      const allUserIds = users.map(u => u.id);
      await clearTodayAttendanceForAllUsers(allUserIds);
      await loadAttendanceData(); // Refresh data
      showSuccess('Successfully cleared today\'s attendance for all users');
    } catch (error) {
      console.error('❌ Error clearing all attendance:', error);
      showError('❌ Failed to clear attendance. Please try again.');
    } finally {
      setIsClearingAll(false);
    }
  };

  const handleClearTodayAttendance = async () => {
    if (!isAdmin) {
      showError('Access denied. Admin privileges required.');
      return;
    }

    if (window.confirm('Are you sure you want to clear today\'s attendance for all users? This action cannot be undone.')) {
      try {
        const allUserIds = users.map(u => u.id);
        await clearTodayAttendanceForAllUsers(allUserIds);
        await loadAttendanceData();
        showSuccess('Successfully cleared today\'s attendance for all users');
      } catch (error) {
        console.error('Failed to clear attendance:', error);
        showError('Failed to clear attendance. Please try again.');
      }
    }
  };

  // Helper function to calculate average time from array of time strings
  const calculateAverageTime = (times: string[]): string => {
    if (times.length === 0) return 'N/A';
    
    let totalMinutes = 0;
    times.forEach(time => {
      const [hour, minute] = time.split(':').map(Number);
      totalMinutes += hour * 60 + minute;
    });
    
    const avgMinutes = Math.round(totalMinutes / times.length);
    const avgHour = Math.floor(avgMinutes / 60);
    const avgMin = avgMinutes % 60;
    
    return `${avgHour.toString().padStart(2, '0')}:${avgMin.toString().padStart(2, '0')}`;
  };

  const handleExportAttendance = async () => {
    if (!isAdmin || !currentUser) {
      showError('Access denied. Admin privileges required.');
      return;
    }

    setIsExportModalOpen(true);
  };

  const handleModalExport = async (team: string, month: number, year: number) => {
    if (!isAdmin || !currentUser) {
      throw new Error('Access denied. Admin privileges required.');
    }

    try {
      console.log(`📊 Starting attendance report generation for ${team} team - ${month}/${year}`);
      
      // Validate inputs
      if (!team || !month || !year) {
        throw new Error('Invalid parameters: team, month, and year are required.');
      }
      
      if (month < 1 || month > 12) {
        throw new Error('Invalid month: must be between 1 and 12.');
      }
      
      if (year < 2020 || year > 2030) {
        throw new Error('Invalid year: must be between 2020 and 2030.');
      }

      // Get team users with validation
      const teamUsers = users.filter(user => {
        if (!user || !user.id) return false;
        return team === 'all' ? true : user.team === team;
      });

      if (teamUsers.length === 0) {
        throw new Error(`No users found for the selected team: ${team}.`);
      }

      console.log(`👥 Found ${teamUsers.length} users for ${team} team`);

      // Generate month date range
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      const daysInMonth = endDate.getDate();
      
      // Convert dates to strings for API
      const startDateString = format(startDate, 'yyyy-MM-dd');
      const endDateString = format(endDate, 'yyyy-MM-dd');

      console.log(`📅 Date range: ${startDateString} to ${endDateString} (${daysInMonth} days)`);
      
      // Get attendance stats for each user with enhanced error handling
      const userStats = await Promise.all(
        teamUsers.map(async (user) => {
          try {
            console.log(`📊 Processing stats for user: ${user.name} (${user.id})`);
            
            const stats = await getAttendanceStats([user.id], startDateString, endDateString);
            
            if (!stats) {
              console.warn(`⚠️ No stats returned for user ${user.name}`);
              throw new Error(`No attendance stats available for ${user.name}`);
            }
            
            // Calculate averages and additional metrics from the available data
            const userEmployeeStats = stats.employeeStats.find(emp => emp.userId === user.id);
            const presentDays = userEmployeeStats?.presentDays || 0;
            const absentDays = daysInMonth - presentDays;
            const avgHoursPerDay = userEmployeeStats?.averageHours || 0;
            
            console.log(`📈 User ${user.name}: ${presentDays} present days, ${avgHoursPerDay}h avg`);
            
            // Get more detailed attendance data for check-in/out times and late counts
            const detailedAttendance = await getEmployeesAttendance([user.id], startDateString);
            
            if (!detailedAttendance) {
              console.warn(`⚠️ No detailed attendance data for user ${user.name}`);
            }
            
            // Calculate average check-in and check-out times
            const checkInTimes = (detailedAttendance || [])
              .filter(att => att.checkInTime && !att.isAbsent)
              .map(att => att.checkInTime)
              .filter((time): time is string => time !== undefined);
            
            const checkOutTimes = (detailedAttendance || [])
              .filter(att => att.checkOutTime && !att.isAbsent)
              .map(att => att.checkOutTime)
              .filter((time): time is string => time !== undefined);
            
            const avgCheckInTime = checkInTimes.length > 0 
              ? calculateAverageTime(checkInTimes) 
              : 'N/A';
              
            const avgCheckOutTime = checkOutTimes.length > 0 
              ? calculateAverageTime(checkOutTimes) 
              : 'N/A';
            
            // Count late check-ins (after 9:30 AM) and late check-outs (before 5:30 PM)
            const lateCheckIns = checkInTimes.filter(time => {
              if (!time) return false;
              try {
                const [hour, minute] = time.split(':').map(Number);
                return hour > 9 || (hour === 9 && minute > 30);
              } catch (err) {
                console.warn(`⚠️ Invalid time format for user ${user.name}: ${time}`);
                return false;
              }
            }).length;
            
            const lateCheckOuts = checkOutTimes.filter(time => {
              if (!time) return false;
              try {
                const [hour, minute] = time.split(':').map(Number);
                return hour < 17 || (hour === 17 && minute < 30);
              } catch (err) {
                console.warn(`⚠️ Invalid time format for user ${user.name}: ${time}`);
                return false;
              }
            }).length;

            const userResult = {
              name: user.name,
              presentDays,
              absentDays,
              lateIns: lateCheckIns,
              lateOuts: lateCheckOuts,
              averageHours: avgHoursPerDay.toFixed(1) + 'h',
              attendanceRate: ((presentDays / daysInMonth) * 100).toFixed(1) + '%'
            };
            
            console.log(`✅ Processed stats for ${user.name}:`, userResult);
            return userResult;
            
          } catch (error) {
            console.error(`❌ Error getting stats for user ${user.name}:`, error);
            // Return default values instead of failing completely
            const defaultResult = {
              name: user.name,
              presentDays: 0,
              absentDays: daysInMonth,
              lateIns: 0,
              lateOuts: 0,
              averageHours: '0.0h',
              attendanceRate: '0.0%'
            };
            console.log(`🔄 Using default stats for ${user.name}:`, defaultResult);
            return defaultResult;
          }
        })
      );

      console.log(`📊 Processed stats for ${userStats.length} users`);

      // Calculate team averages with validation
      const teamSize = userStats.length;
      if (teamSize === 0) {
        throw new Error('No user statistics were generated.');
      }
      
      const totalPresentDays = userStats.reduce((sum, user) => {
        const presentDays = typeof user.presentDays === 'number' ? user.presentDays : 0;
        return sum + presentDays;
      }, 0);
      
      const averageAttendanceRate = teamSize > 0 ? (totalPresentDays / (teamSize * daysInMonth) * 100).toFixed(1) + '%' : '0%';
      
      const averageHours = teamSize > 0 ? 
        (userStats.reduce((sum, user) => {
          const hours = parseFloat(user.averageHours.replace('h', '')) || 0;
          return sum + hours;
        }, 0) / teamSize).toFixed(1) + 'h' : '0h';

      console.log(`📈 Team averages: ${averageAttendanceRate} attendance, ${averageHours} avg hours`);

      // Prepare data for PDF component with validation
      const pdfData = {
        companyName: 'Marketlube',
        teamName: team === 'creative' ? 'Creative Team' : team === 'web' ? 'Web Team' : 'All Teams',
        month: new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long' }),
        year: year,
        workingDays: daysInMonth,
        teamSize: teamSize,
        averageRate: averageAttendanceRate,
        averageHoursPerDay: averageHours,
        employees: userStats,
        generatedBy: currentUser.name,
        generatedOn: format(getIndiaDateTime(), 'PPP p') + ' IST'
      };

      // Validate PDF data before setting
      if (!pdfData.employees || pdfData.employees.length === 0) {
        throw new Error('No employee data generated for PDF.');
      }

      // Store PDF data for download link
      setPdfData(pdfData);
      setShowPdfDownload(true);

      console.log(`✅ Attendance report data prepared successfully for ${team} team!`);
      console.log('📄 PDF Data summary:', {
        team: pdfData.teamName,
        month: pdfData.month,
        year: pdfData.year,
        employeeCount: pdfData.employees.length,
        averageRate: pdfData.averageRate
      });
      
      // Show success toast
      const teamName = team === 'creative' ? 'Creative Team' : team === 'web' ? 'Web Team' : 'All Teams';
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
      showToastNotification(
        `✅ ${teamName} attendance report for ${monthNames[month - 1]} ${year} is ready for download!`,
        'success'
      );

    } catch (error) {
      console.error('❌ Error generating attendance report:', error);
      
      // Determine error type and provide specific feedback
      let errorMessage = '❌ Failed to generate attendance report.';
      
      if (error instanceof Error) {
        if (error.message.includes('No users found')) {
          errorMessage = '❌ No users found for the selected team. Please check team assignments.';
        } else if (error.message.includes('Invalid')) {
          errorMessage = `❌ Invalid input: ${error.message}`;
        } else if (error.message.includes('Access denied')) {
          errorMessage = '❌ Access denied. Admin privileges required.';
        } else if (error.message.includes('406') || error.message.includes('Not Acceptable')) {
          errorMessage = '❌ Database query failed. This might be due to system date issues. Please check your date settings.';
        } else {
          errorMessage = `❌ ${error.message}`;
        }
      }
      
      showToastNotification(errorMessage + ' Please try again.', 'error');
      throw error; // Re-throw to be handled by modal
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Attendance Dashboard
          </h1>
          <div className="flex items-center gap-4 mt-3">
            <p className="text-sm text-gray-500">
              Last updated: {format(lastUpdated, 'MMM dd, yyyy at h:mm a')} IST
            </p>
            </div>
          </div>
        <div className="flex items-center gap-4">
          {/* Enhanced Check-In Button with Real Status */}
          {currentUser && (
            <div className="flex items-center gap-3">
            <Button
              onClick={handleCheckIn}
                variant={userCheckInStatus ? "secondary" : "primary"}
                disabled={userCheckInStatus || isCheckingIn}
              className={`
                relative overflow-hidden transition-all duration-300 
                  ${userCheckInStatus 
                    ? 'bg-green-100 text-green-700 border-green-300 cursor-not-allowed hover:bg-green-100' 
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                }
                ${isCheckingIn ? 'animate-pulse' : ''}
                px-6 py-3 font-semibold rounded-lg border-2
              `}
            >
              <div className="flex items-center gap-2">
                  {userCheckInStatus ? (
                  <>
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span>Checked In ✓</span>
                  </>
                ) : (
                  <>
                    <Timer className={`w-5 h-5 ${isCheckingIn ? 'animate-spin' : ''}`} />
                    <span>{isCheckingIn ? 'Checking In...' : 'Check In Now'}</span>
                  </>
                )}
              </div>
                {!userCheckInStatus && !isCheckingIn && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 transform -skew-x-12 translate-x-[-100%] animate-shimmer"></div>
          )}
              </Button>
          
              {/* Enhanced Check-Out Button */}
            <Button
                onClick={handleCheckOut}
                variant={userCheckOutStatus ? "secondary" : (!userCheckInStatus ? "secondary" : "primary")}
                disabled={!userCheckInStatus || userCheckOutStatus || isCheckingOut}
                className={`
                  relative overflow-hidden transition-all duration-300 
                  ${!userCheckInStatus 
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                    : userCheckOutStatus 
                      ? 'bg-orange-100 text-orange-700 border-orange-300 cursor-not-allowed hover:bg-orange-100' 
                      : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                  }
                  ${isCheckingOut ? 'animate-pulse' : ''}
                  px-6 py-3 font-semibold rounded-lg border-2
                `}
            >
              <div className="flex items-center gap-2">
                  {userCheckOutStatus ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-orange-600" />
                      <span>Checked Out ✓</span>
                    </>
                  ) : !userCheckInStatus ? (
                    <>
                      <Clock className="w-5 h-5 text-gray-400" />
                      <span>Check In First</span>
                    </>
                  ) : (
                    <>
                      <Clock className={`w-5 h-5 ${isCheckingOut ? 'animate-spin' : ''}`} />
                      <span>{isCheckingOut ? 'Checking Out...' : 'Check Out Now'}</span>
                    </>
                  )}
              </div>
                {userCheckInStatus && !userCheckOutStatus && !isCheckingOut && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 transform -skew-x-12 translate-x-[-100%] animate-shimmer"></div>
                )}
            </Button>
            </div>
          )}

          {/* Auto-refresh Toggle */}
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label className="text-sm text-gray-600 cursor-pointer" onClick={() => setAutoRefresh(!autoRefresh)}>
              Auto-refresh (30s)
            </label>
          </div>

          {/* Action Buttons */}
          <Button onClick={handleRefresh} variant="secondary" disabled={isLoading}>
            <div className="flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </div>
          </Button>
          
          <Button onClick={handleViewCalendar} variant="secondary">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Calendar View</span>
            </div>
          </Button>
        </div>
      </div>

      {/* Date Validation Warning Banner */}
      {dateValidation && !dateValidation.isValid && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg mb-6">
          <div className="flex items-center">
            <AlertTriangle className="w-6 h-6 text-red-400 mr-3" />
            <div className="flex-1">
              <h3 className="text-lg font-medium text-red-800 mb-2">
                ⚠️ System Date Issue Detected
              </h3>
              <div className="text-sm text-red-700 space-y-1">
                <p><strong>Current System Date:</strong> {dateValidation.currentDate}</p>
                {dateValidation.warnings.map((warning, index) => (
                  <p key={index}>• {warning}</p>
                ))}
                <p className="mt-2 font-medium">
                  <strong>Recommendation:</strong> Please check your system date settings. 
                  The attendance system may not work correctly with future dates.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Role & Permission Indicator */}
      <div className="flex items-center gap-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <Shield className="w-5 h-5 text-blue-600" />
          ) : (
            <Eye className="w-5 h-5 text-blue-600" />
          )}
          <span className="text-sm font-medium text-blue-800">
            {isAdmin 
              ? `Admin View - Viewing all ${filteredUsers.length} employees`
              : `Team Member View - Viewing ${currentUser?.team} team (${filteredUsers.length} members)`
            }
          </span>
        </div>
        <div className="text-xs text-blue-600">
          IST Timezone | Real-time updates {autoRefresh ? 'ON' : 'OFF'}
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">Filter by Team</label>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="w-full p-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Teams</option>
                <option value="creative">Creative Team</option>
                <option value="web">Web Team</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">Filter by Employee</label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full p-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Employees</option>
                {filteredUsersByRole.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name} {user.role === 'admin' ? '(Admin)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">Current Time (IST)</label>
              <div className="text-xl font-mono text-blue-600 transition-all duration-1000 font-bold">
                {format(currentTime, 'h:mm:ss a')}
              </div>
              <div className="text-xs text-gray-500">
                {format(currentTime, 'EEEE, MMM d, yyyy')}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export Attendance Card */}
        {isAdmin && (
          <Card className="group relative cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-105 bg-gradient-to-br from-green-50 via-white to-emerald-50 border-green-200 hover:border-green-300" onClick={handleExportAttendance}>
            <CardContent className="p-3 relative">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-300">
                <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
                  <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5"/>
                  </pattern>
                  <rect width="100%" height="100%" fill="url(#grid)" className="text-green-600" />
                </svg>
              </div>
              
              {/* Content */}
              <div className="relative z-10 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-green-700 uppercase tracking-wide">Export Reports</label>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
                
                <div className="flex items-center justify-center py-1">
                  <div className="text-center transform group-hover:scale-110 transition-transform duration-300">
                    {/* Animated Icon Container */}
                    <div className="relative w-8 h-8 mx-auto mb-1">
                      <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg shadow-md group-hover:shadow-lg transition-shadow duration-300 transform rotate-3 group-hover:rotate-6"></div>
                      <div className="relative w-full h-full bg-white rounded-lg flex items-center justify-center group-hover:bg-green-50 transition-colors duration-300">
                        <svg className="w-4 h-4 text-green-600 group-hover:text-green-700 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      
                      {/* Floating Download Arrow */}
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-1 group-hover:translate-y-0 transition-all duration-300">
                        <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L11 6.414V13a1 1 0 11-2 0V6.414L7.707 7.707a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    
                    {/* Text with gradient effect */}
                    <div className="text-xs font-medium bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent group-hover:from-green-800 group-hover:to-emerald-800 transition-all duration-300">
                      Generate PDF Report
                    </div>
                    <div className="text-xs text-green-600 opacity-75 group-hover:opacity-100 transition-opacity duration-300">
                      Click to export
                    </div>
                  </div>
                </div>
                
                {/* Progress bar animation on hover - reduced height */}
                <div className="h-0.5 bg-green-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transform -translate-x-full group-hover:translate-x-0 transition-transform duration-1000 ease-out"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900">{attendanceOverview.totalEmployees}</p>
              </div>
              <Users className="w-8 h-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Present Today</p>
                <p className="text-2xl font-bold text-green-700">{attendanceOverview.present}</p>
              </div>
              <UserCheck className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">Absent Today</p>
                <p className="text-2xl font-bold text-red-700">{attendanceOverview.absent}</p>
              </div>
              <UserX className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600">Late Check-ins</p>
                <p className="text-2xl font-bold text-orange-700">{attendanceOverview.late}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Checked Out</p>
                <p className="text-2xl font-bold text-blue-700">{attendanceOverview.checkedOut}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Overview */}
        {monthlyStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Monthly Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Working Days</span>
                  <span className="font-semibold">{monthlyStats.totalWorkingDays}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Present Days</span>
                  <span className="font-semibold text-green-600">{monthlyStats.totalPresentDays}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Absent Days</span>
                  <span className="font-semibold text-red-600">{monthlyStats.totalAbsentDays}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Avg Hours/Day</span>
                  <span className="font-semibold text-blue-600">{monthlyStats.averageHours}h</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Today's Attendance Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-600" />
              Today's Attendance Details ({format(getIndiaDateTime(), 'MMM dd, yyyy')})
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
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white">
                        <span className="text-sm font-medium">
                          {user.name.split(' ').map((n: string) => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {user.name}
                          {user.role === 'admin' && (
                            <span className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">
                              Admin
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500 capitalize">{user.team} Team</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-600">
                          Check-in: <span className="font-mono">{employee.checkInTime || 'Not checked in'}</span>
                          {employee.checkInTime && isLate(employee.checkInTime) && (
                            <span className="ml-1 text-orange-600 text-xs">(Late)</span>
                          )}
                        </p>
                        <p className="text-sm text-gray-600">
                          Check-out: <span className="font-mono">{employee.checkOutTime || 'Not checked out'}</span>
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
                  <p className="text-sm mt-1">Users need to manually check-in to appear here</p>
                </div>
              )}

              {isLoading && (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 mx-auto mb-3 text-gray-400 animate-spin" />
                  <p className="text-gray-500">Loading real-time attendance data...</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Attendance Modal */}
      <ExportAttendanceModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleModalExport}
        isAdmin={isAdmin}
      />

      {/* PDF Download Section */}
      {showPdfDownload && pdfData && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 transform transition-all duration-300 scale-100">
            {/* Header with gradient background */}
            <div className="relative overflow-hidden rounded-t-2xl bg-gradient-to-br from-green-50 via-emerald-50 to-blue-50 p-6 pb-8">
              {/* Background pattern */}
              <div className="absolute inset-0 opacity-10">
                <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
                  <defs>
                    <pattern id="grid-pattern" width="10" height="10" patternUnits="userSpaceOnUse">
                      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid-pattern)" className="text-green-600" />
                </svg>
              </div>
              
              {/* Success icon with animated ring */}
              <div className="relative flex justify-center mb-4">
                <div className="relative">
                  {/* Animated rings */}
                  <div className="absolute inset-0 w-20 h-20 border-2 border-green-300 rounded-full animate-ping opacity-30"></div>
                  <div className="absolute inset-2 w-16 h-16 border-2 border-green-400 rounded-full animate-pulse opacity-50"></div>
                  
                  {/* Main icon container */}
                  <div className="relative w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                    <CheckCircle2 className="w-10 h-10 text-white" />
                  </div>
                  
                  {/* Success badge */}
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="text-center relative z-10">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  🎉 PDF Report Ready!
                </h3>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium mb-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                  Generation Complete
                </div>
              </div>
            </div>
            
            {/* Content section */}
            <div className="p-6 pt-0">
              {/* Report details card */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      {pdfData.teamName} Attendance Report
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      {pdfData.month} {pdfData.year} • {pdfData.teamSize} employees
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {pdfData.workingDays} working days
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {pdfData.averageRate} avg rate
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="flex gap-3">
                {/* Close button */}
                <Button
                  onClick={closePdfModal}
                  variant="secondary"
                  className="flex-1 px-4 py-3 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 font-medium"
                >
                  <span>Cancel</span>
                </Button>
                
                {/* Download button */}
                <PDFDownloadLink
                  document={
                    <AttendanceReportPDF
                      companyName={pdfData.companyName}
                      teamName={pdfData.teamName}
                      month={pdfData.month}
                      year={pdfData.year}
                      workingDays={pdfData.workingDays}
                      teamSize={pdfData.teamSize}
                      averageRate={pdfData.averageRate}
                      averageHoursPerDay={pdfData.averageHoursPerDay}
                      employees={pdfData.employees}
                      generatedBy={pdfData.generatedBy}
                      generatedOn={pdfData.generatedOn}
                    />
                  }
                  fileName={`Marketlube_${pdfData.teamName.replace(/\s+/g, '')}_Attendance_${pdfData.month}_${pdfData.year}.pdf`}
                  className="flex-1"
                >
                  {({ loading: pdfLoading, error, url, blob }) => {
                    // Enhanced debug logging
                    React.useEffect(() => {
                      console.log('🔍 PDF Download Link State Update:', { 
                        loading: pdfLoading, 
                        error: error?.message || error, 
                        hasUrl: !!url,
                        hasBlob: !!blob,
                        timestamp: new Date().toISOString()
                      });
                      
                      if (error) {
                        console.error('❌ PDF Generation Error Details:', {
                          error: error,
                          message: error.message,
                          stack: error.stack,
                          pdfData: pdfData
                        });
                        
                        // Show user-friendly error message
                        showToastNotification(
                          `PDF generation failed: ${error.message || 'Unknown error'}. Please try again.`,
                          'error'
                        );
                      }
                      
                      if (url && blob) {
                        console.log('✅ PDF generated successfully:', { url, blobSize: blob.size });
                      }
                    }, [pdfLoading, error, url, blob]);
                    
                    const handleDownloadClick = () => {
                      console.log('🖱️ PDF Download button clicked');
                      
                      if (error) {
                        console.error('❌ Cannot download due to error:', error);
                        showToastNotification(
                          `Cannot download: ${error.message || 'PDF generation failed'}`,
                          'error'
                        );
                        // Trigger retry
                        retryPdfGeneration();
                        return;
                      }
                      
                      if (pdfLoading) {
                        console.log('⏳ PDF is still loading, please wait...');
                        showToastNotification('PDF is still generating, please wait...', 'info');
                        return;
                      }
                      
                      if (url && blob) {
                        console.log('✅ Initiating download...');
                        showToastNotification('PDF download started!', 'success');
                      }
                    };
                    
                    return (
                      <Button
                        disabled={pdfLoading || !!error}
                        onClick={handleDownloadClick}
                        className={`
                          w-full px-4 py-3 font-semibold transition-all duration-300 
                          ${pdfLoading || error
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transform hover:scale-105'
                          }
                          text-white border-0 relative overflow-hidden
                        `}
                      >
                        {error ? (
                          <div className="flex items-center justify-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            <span>PDF Error - Click to Retry</span>
                          </div>
                        ) : pdfLoading ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Generating PDF...</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Download PDF</span>
                          </div>
                        )}
                        
                        {/* Shimmer effect for non-loading state */}
                        {!pdfLoading && !error && (
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                        )}
                      </Button>
                    );
                  }}
                </PDFDownloadLink>
              </div>
              
              {/* Footer info */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span>Generated by {pdfData.generatedBy} • {format(new Date(), 'MMM dd, h:mm a')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <Toast
        message={toastMessage}
        type={toastType}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
};

export default Attendance; 