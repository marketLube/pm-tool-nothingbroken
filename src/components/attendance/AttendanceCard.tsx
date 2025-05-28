import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import { Clock, LogIn, LogOut, Calendar, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import * as attendanceService from '../../services/attendanceService';
import { format } from 'date-fns';

interface AttendanceStatus {
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  isAbsent: boolean;
  totalHours?: number;
}

const AttendanceCard: React.FC = () => {
  const { currentUser } = useAuth();
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [customCheckOutTime, setCustomCheckOutTime] = useState('');
  const [showCustomTime, setShowCustomTime] = useState(false);

  const loadAttendanceStatus = async () => {
    if (!currentUser) return;
    
    try {
      setIsLoading(true);
      const status = await attendanceService.getAttendanceStatus(currentUser.id);
      setAttendanceStatus(status);
    } catch (error) {
      console.error('Error loading attendance status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAttendanceStatus();
    
    // Refresh attendance status every minute
    const interval = setInterval(loadAttendanceStatus, 60000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleCheckOut = async (customTime?: string) => {
    if (!currentUser) return;
    
    try {
      setIsCheckingOut(true);
      await attendanceService.recordCheckOut(currentUser.id, customTime);
      await loadAttendanceStatus(); // Refresh the status
      setShowCustomTime(false);
      setCustomCheckOutTime('');
    } catch (error) {
      console.error('Error checking out:', error);
      alert('Failed to record check-out. Please try again.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleCustomCheckOut = () => {
    if (!customCheckOutTime) {
      alert('Please enter a valid time');
      return;
    }
    handleCheckOut(customCheckOutTime);
  };

  const getCurrentTime = () => {
    return format(new Date(), 'HH:mm');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!attendanceStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Unable to load attendance data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Attendance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>{format(new Date(attendanceStatus.date), 'EEEE, MMMM d, yyyy')}</span>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <User className="w-4 h-4" />
          <span>{currentUser?.name}</span>
        </div>

        {/* Check-in Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2">
              <LogIn className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Check In</span>
            </div>
            <span className="text-sm font-mono text-green-700">
              {attendanceStatus.checkInTime || 'Not checked in'}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2">
              <LogOut className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Check Out</span>
            </div>
            <span className="text-sm font-mono text-blue-700">
              {attendanceStatus.checkOutTime || 'Not checked out'}
            </span>
          </div>
        </div>

        {/* Total Hours */}
        {attendanceStatus.totalHours && (
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Total Hours</span>
              <span className="text-sm font-mono text-gray-900">
                {attendanceStatus.totalHours} hours
              </span>
            </div>
          </div>
        )}

        {/* Check-out Actions */}
        {attendanceStatus.checkInTime && !attendanceStatus.checkOutTime && (
          <div className="space-y-3 pt-2 border-t border-gray-200">
            <div className="flex gap-2">
              <Button
                onClick={() => handleCheckOut()}
                disabled={isCheckingOut}
                className="flex-1"
                variant="primary"
              >
                {isCheckingOut ? 'Checking out...' : `Check Out Now (${getCurrentTime()})`}
              </Button>
              <Button
                onClick={() => setShowCustomTime(!showCustomTime)}
                variant="secondary"
                className="px-3"
              >
                <Clock className="w-4 h-4" />
              </Button>
            </div>

            {showCustomTime && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Custom Check-out Time
                </label>
                <div className="flex gap-2">
                  <input
                    type="time"
                    value={customCheckOutTime}
                    onChange={(e) => setCustomCheckOutTime(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <Button
                    onClick={handleCustomCheckOut}
                    disabled={isCheckingOut || !customCheckOutTime}
                    variant="primary"
                  >
                    Set
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Status Messages */}
        {!attendanceStatus.checkInTime && (
          <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-800">
              You will be automatically checked in when you first login each day.
            </p>
          </div>
        )}

        {attendanceStatus.checkInTime && attendanceStatus.checkOutTime && (
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-800">
              ✓ You have completed your attendance for today.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AttendanceCard; 