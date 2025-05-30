import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { supabase } from '../utils/supabase';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Building, 
  List,
  AlertCircle,
  ExternalLink 
} from 'lucide-react';

interface ExportedTask {
  id: string;
  title: string;
  date: string;
  team: string;
  created_at: string;
}

interface CalendarExportData {
  id: string;
  token: string;
  client_name: string;
  team: string;
  tasks: ExportedTask[];
  created_at: string;
  expires_at: string;
}

const CalendarExport: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [exportData, setExportData] = useState<CalendarExportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (token) {
      loadExportData();
    }
  }, [token]);

  const loadExportData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('calendar_exports')
        .select('*')
        .eq('token', token)
        .single();

      if (error) {
        console.error('Error loading export:', error);
        setError('Export not found or has expired');
      } else if (new Date(data.expires_at) < new Date()) {
        setError('This export link has expired');
      } else {
        setExportData(data);
      }
    } catch (err) {
      console.error('Failed to load export:', err);
      setError('Failed to load calendar export');
    } finally {
      setLoading(false);
    }
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // Get tasks for a specific date
  const getTasksForDate = (date: Date) => {
    if (!exportData) return [];
    const dateStr = format(date, 'yyyy-MM-dd');
    return exportData.tasks.filter(task => task.date === dateStr);
  };

  // Get page title based on team
  const getPageTitle = () => {
    if (!exportData) return 'Calendar Export';
    if (exportData.team === 'web') return 'Project Calendar';
    if (exportData.team === 'creative') return 'Social Calendar';
    return 'Content Calendar';
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Export Not Available</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            Please request a new export link from your project manager.
          </p>
        </div>
      </div>
    );
  }

  if (!exportData) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <CalendarIcon className="h-8 w-8 mr-3 text-blue-600" />
                {getPageTitle()}
              </h1>
              <div className="mt-2 flex items-center text-gray-600">
                <Building className="h-4 w-4 mr-2" />
                <span className="font-medium">{exportData.client_name}</span>
                <span className="mx-2">•</span>
                <span>{exportData.tasks.length} tasks</span>
                <span className="mx-2">•</span>
                <span className="text-sm">
                  {exportData.team === 'creative' ? 'Creative Team' : 
                   exportData.team === 'web' ? 'Web Team' : 'All Teams'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-4 py-2 text-sm font-medium ${
                    viewMode === 'calendar' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <CalendarIcon className="h-4 w-4 mr-2 inline" />
                  Calendar
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 text-sm font-medium ${
                    viewMode === 'list' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <List className="h-4 w-4 mr-2 inline" />
                  List
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {viewMode === 'calendar' ? (
          // Calendar View
          <div className="bg-white rounded-lg shadow-lg">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg p-6">
              <h2 className="text-2xl font-bold text-center">
                {format(currentDate, 'MMMM yyyy')}
              </h2>
            </div>
            
            <div className="p-0">
              {/* Week Days Header */}
              <div className="grid grid-cols-7 bg-gray-50 border-b">
                {weekDays.map(day => (
                  <div key={day} className="p-4 text-center font-semibold text-gray-700 border-r last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar Grid */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day, index) => {
                  const dayTasks = getTasksForDate(day);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isCurrentDay = isToday(day);
                  
                  return (
                    <div
                      key={index}
                      className={`min-h-[120px] p-2 border-r border-b last:border-r-0 ${
                        isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                      } ${isCurrentDay ? 'bg-blue-50 ring-2 ring-blue-200' : ''}`}
                    >
                      {/* Date Header */}
                      <div className="mb-2">
                        <span className={`text-sm font-medium ${
                          isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                        } ${isCurrentDay ? 'text-blue-600 font-bold' : ''}`}>
                          {format(day, 'd')}
                        </span>
                      </div>
                      
                      {/* Tasks */}
                      <div className="space-y-1">
                        {dayTasks.map(task => (
                          <div
                            key={task.id}
                            className={`text-xs p-1.5 rounded ${
                              task.team === 'creative' ? 'bg-purple-500' : 'bg-blue-500'
                            } text-white`}
                          >
                            <span className="font-medium">{task.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          // List View
          <div className="bg-white rounded-lg shadow-lg">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">All Tasks</h2>
              <p className="text-gray-600 mt-1">Complete list of scheduled tasks</p>
            </div>
            
            <div className="divide-y divide-gray-200">
              {exportData.tasks
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map(task => (
                  <div key={task.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900">{task.title}</h3>
                        <div className="mt-1 flex items-center text-sm text-gray-500">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>{format(new Date(task.date), 'EEEE, MMMM d, yyyy')}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          task.team === 'creative' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {task.team === 'creative' ? 'Creative' : 'Web'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              
              {exportData.tasks.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No tasks scheduled</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500 space-y-2">
          <p>
            Export created on {format(new Date(exportData.created_at), 'MMM d, yyyy')} • 
            Expires on {format(new Date(exportData.expires_at), 'MMM d, yyyy')}
          </p>
          <p>
            Sent from Project Management tool, built by{' '}
            <a 
              href="https://www.marketlube.in" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline font-medium transition-colors"
            >
              marketlube
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default CalendarExport; 