import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { supabase } from '../utils/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Calendar as CalendarIcon, Building, Clock, ExternalLink } from 'lucide-react';

interface ExportedTask {
  id: string;
  title: string;
  date: string;
  client_id: string;
  client_name: string;
  team: string;
  created_at: string;
  updated_at: string;
}

interface CalendarExportData {
  id: string;
  token: string;
  client_id: string;
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
  const [currentDate, setCurrentDate] = useState(new Date());

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
        if (error.code === 'PGRST116') {
          setError('Calendar export not found or has expired.');
        } else {
          setError('Failed to load calendar export.');
        }
        return;
      }

      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        setError('This calendar export has expired.');
        return;
      }

      setExportData(data);
    } catch (err) {
      console.error('Error loading export data:', err);
      setError('Failed to load calendar export.');
    } finally {
      setLoading(false);
    }
  };

  const getTasksForDate = (date: Date): ExportedTask[] => {
    if (!exportData) return [];
    const dateStr = format(date, 'yyyy-MM-dd');
    return exportData.tasks.filter(task => task.date === dateStr);
  };

  const getTeamColor = (team: string) => {
    switch (team) {
      case 'creative':
        return 'bg-purple-500';
      case 'web':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getTeamLabel = (team: string) => {
    switch (team) {
      case 'creative':
        return 'Creative Team';
      case 'web':
        return 'Web Team';
      case 'all':
        return 'All Teams';
      default:
        return team;
    }
  };

  // Generate calendar days
  const calendarDays = React.useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

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
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-red-500 mb-4">
            <ExternalLink className="h-12 w-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Calendar Not Available</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!exportData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CalendarIcon className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {exportData.client_name} Calendar
                </h1>
                <div className="flex items-center space-x-4 mt-1">
                  <div className="flex items-center space-x-1">
                    <Building className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{exportData.client_name}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className={`w-3 h-3 rounded-full ${getTeamColor(exportData.team)}`}></div>
                    <span className="text-sm text-gray-600">{getTeamLabel(exportData.team)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      Expires {format(parseISO(exportData.expires_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Shared Calendar</p>
              <p className="text-xs text-gray-400">
                Generated {format(parseISO(exportData.created_at), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
            <div className="flex items-center justify-center">
              <h2 className="text-2xl font-bold">
                {format(currentDate, 'MMMM yyyy')}
              </h2>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
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
                    className={`min-h-[120px] p-2 border-r border-b last:border-r-0 relative ${
                      isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                    } ${isCurrentDay ? 'bg-blue-50 ring-2 ring-blue-200' : ''}`}
                  >
                    {/* Date Header */}
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium ${
                        isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                      } ${isCurrentDay ? 'text-blue-600 font-bold' : ''}`}>
                        {format(day, 'd')}
                      </span>
                    </div>
                    
                    {/* Tasks */}
                    <div className="space-y-1">
                      {dayTasks.slice(0, 4).map(task => (
                        <div
                          key={task.id}
                          className={`text-xs p-1.5 rounded text-white truncate ${getTeamColor(task.team)}`}
                          title={task.title}
                        >
                          {task.title}
                        </div>
                      ))}
                      
                      {/* Show more indicator */}
                      {dayTasks.length > 4 && (
                        <div className="text-xs text-gray-500 font-medium pl-1.5">
                          +{dayTasks.length - 4} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{exportData.tasks.length}</div>
                <div className="text-sm text-gray-600">Total Tasks</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{getTeamLabel(exportData.team)}</div>
                <div className="text-sm text-gray-600">Team</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {format(parseISO(exportData.expires_at), 'MMM d')}
                </div>
                <div className="text-sm text-gray-600">Expires</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>This is a shared calendar view from Marketlube PM Tool</p>
          <p className="mt-1">
            Generated on {format(parseISO(exportData.created_at), 'MMMM d, yyyy \'at\' h:mm a')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CalendarExport; 