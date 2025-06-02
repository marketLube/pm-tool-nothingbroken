import React, { useState, useEffect, useMemo, useRef } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { getIndiaDateTime, getIndiaDate } from '../utils/timezone';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Building, 
  Edit,
  Trash2,
  Clock,
  RefreshCw,
  Share,
  Download
} from 'lucide-react';
import { TeamType } from '../types';
import SimpleSocialTaskModal from '../components/socialcalendar/SimpleSocialTaskModal';

// Simplified interface for Social Calendar tasks
interface SocialCalendarTask {
  id: string;
  title: string;
  date: string;
  client_id: string;
  client_name: string; // Add client name for easier reference
  team: TeamType;
  created_at: string;
  updated_at: string;
}

const SocialCalendar: React.FC = () => {
  const { clients, refreshClients, users } = useData();
  const { currentUser, isAdmin } = useAuth();
  
  // Calendar state
  const [currentDate, setCurrentDate] = useState(getIndiaDateTime());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [socialTasks, setSocialTasks] = useState<SocialCalendarTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingClients, setRefreshingClients] = useState(false);
  
  // Client selection state
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  
  // Team filter state
  const [selectedTeam, setSelectedTeam] = useState<TeamType | 'all'>('all');
  const [isTeamManuallySet, setIsTeamManuallySet] = useState(false);
  
  // Modal state
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<SocialCalendarTask | null>(null);

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);

  // Hover tooltip state - IMPROVED
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [isDayHovered, setIsDayHovered] = useState(false);
  const [isTooltipHovered, setIsTooltipHovered] = useState(false);

  // Refs for cleanup
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Refresh client list when component mounts and periodically
  useEffect(() => {
    // Initial refresh
    refreshClients();
    
    // Set up periodic refresh every 30 seconds to catch new clients
    const intervalId = setInterval(() => {
      refreshClients();
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [refreshClients]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
    };
  }, []);

  // Set default client (first client of user's team, or first creative client for admin)
  useEffect(() => {
    if (clients.length > 0 && !selectedClientId) {
      let defaultClient;
      let defaultTeam = selectedTeam; // Keep current team selection
      
      if (isAdmin && !isTeamManuallySet) {
        // Admin: only set default team if not manually set
        defaultTeam = 'creative';
        setSelectedTeam(defaultTeam);
      } else if (!isAdmin && !isTeamManuallySet) {
        // Regular user: only set team if not manually set
        const userTeam = currentUser?.team || 'creative';
        defaultTeam = userTeam;
        setSelectedTeam(defaultTeam);
      }
      
      // Find appropriate client based on current team selection
      if (defaultTeam === 'all') {
        defaultClient = clients[0]; // First available client
      } else {
        defaultClient = clients.find(c => c.team === defaultTeam) || clients[0];
      }
      
      if (defaultClient) {
        setSelectedClientId(defaultClient.id);
      }
    }
  }, [clients, currentUser, isAdmin, selectedClientId, isTeamManuallySet, selectedTeam]);

  // Load tasks from database for specific client and team
  const loadTasks = async () => {
    if (!selectedClientId) return;
    
    try {
      setLoading(true);
      
      let query = supabase
        .from('social_calendar_tasks')
        .select('*')
        .eq('client_id', selectedClientId);
      
      // Add team filter if not 'all'
      if (selectedTeam !== 'all') {
        query = query.eq('team', selectedTeam);
      }
      
      const { data, error } = await query.order('date', { ascending: true });

      if (error) {
        console.error('Error loading tasks:', error);
        // If table doesn't exist, create it
        if (error.message.includes('relation "social_calendar_tasks" does not exist')) {
          await createTable();
        }
      } else {
        setSocialTasks(data || []);
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create the table if it doesn't exist
  const createTable = async () => {
    try {
      console.log('Creating social_calendar_tasks table...');
      
      // Try to create the table directly using SQL
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS social_calendar_tasks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title TEXT NOT NULL,
          date DATE NOT NULL,
          client_id UUID NOT NULL,
          team TEXT NOT NULL CHECK (team IN ('creative', 'web')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS social_calendar_tasks_date_idx ON social_calendar_tasks(date);
        CREATE INDEX IF NOT EXISTS social_calendar_tasks_client_id_idx ON social_calendar_tasks(client_id);
        CREATE INDEX IF NOT EXISTS social_calendar_tasks_team_idx ON social_calendar_tasks(team);
        
        ALTER TABLE social_calendar_tasks ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY IF NOT EXISTS "Users can manage social calendar tasks"
          ON social_calendar_tasks FOR ALL
          TO authenticated
          USING (true)
          WITH CHECK (true);
      `;
      
      const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL });
      
      if (error) {
        console.error('Error creating table with RPC:', error);
        
        // Fallback: Try just a simple insert to test if table exists
        const { error: testError } = await supabase
          .from('social_calendar_tasks')
          .select('id')
          .limit(1);
        
        if (testError && testError.message.includes('does not exist')) {
          console.error('social_calendar_tasks table does not exist and cannot be created automatically.');
          alert(
            'The social calendar database table needs to be set up manually. ' +
            'Please contact your administrator to run the table creation script. ' +
            'This is required after database changes.'
          );
          return;
        } else {
          console.log('Table appears to exist, continuing...');
        }
      } else {
        console.log('social_calendar_tasks table created successfully');
      }
      
      setSocialTasks([]); // Set empty tasks after table creation
      
    } catch (error) {
      console.error('Error creating table:', error);
      alert(
        'Failed to create the social calendar table. ' +
        'Please contact your administrator to set up the database manually. ' +
        'The table creation script needs to be run in Supabase.'
      );
    }
  };

  // Load tasks when client changes
  useEffect(() => {
    if (selectedClientId) {
      loadTasks();
    }
  }, [selectedClientId, selectedTeam]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // Get current client
  const currentClient = clients.find(c => c.id === selectedClientId);
  
  // Filter clients for the dropdown
  const availableClients = useMemo(() => {
    if (isAdmin) {
      // Admin sees clients based on team filter
      if (selectedTeam === 'all') {
        return clients; // Show all clients
      } else {
        return clients.filter(c => c.team === selectedTeam);
      }
    } else {
      const userTeam = currentUser?.team || 'creative';
      return clients.filter(c => c.team === userTeam);
    }
  }, [clients, currentUser, isAdmin, selectedTeam]);

  // Create client options for dropdown
  const clientOptions = useMemo(() => {
    if (availableClients.length === 0) {
      return [{ value: '', label: 'No clients available' }];
    }
    
    return availableClients.map(client => ({
      value: client.id,
      label: `${client.name} (${client.team === 'creative' ? 'Creative' : 'Web'})`
    }));
  }, [availableClients]);

  // Team options for admin dropdown
  const teamOptions = [
    { value: 'all', label: 'All Teams' },
    { value: 'creative', label: 'Creative Team' },
    { value: 'web', label: 'Web Team' }
  ];

  // Get dynamic page title
  const getPageTitle = () => {
    if (isAdmin) {
      if (selectedTeam === 'web') return 'Project Calendar';
      if (selectedTeam === 'creative') return 'Social Calendar';
      return 'Content Calendar'; // For 'all' teams
    } else {
      const userTeam = currentUser?.team || 'creative';
      return userTeam === 'web' ? 'Project Calendar' : 'Social Calendar';
    }
  };

  // Get tasks for a specific date
  const getTasksForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return socialTasks.filter(task => task.date === dateStr);
  };

  // Handle day hover for tooltip - ROBUST VERSION
  const handleDayMouseEnter = (day: Date, event: React.MouseEvent) => {
    const dayTasks = getTasksForDate(day);
    if (dayTasks.length > 3) {
      const dateStr = format(day, 'yyyy-MM-dd');
      
      // Clear any existing timeouts
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
      
      // Set position
      const rect = event.currentTarget.getBoundingClientRect();
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10
      });
      
      setHoveredDay(dateStr);
      
      // Show tooltip with delay
      showTimeoutRef.current = setTimeout(() => {
        if (isDayHovered) { // Only show if still hovering
          setIsTooltipVisible(true);
        }
      }, 300);
    }
  };

  const handleDayMouseLeave = () => {
    // Clear show timeout if leaving before it triggers
    if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
    
    // Hide tooltip with delay (unless tooltip is being hovered)
    hideTimeoutRef.current = setTimeout(() => {
      if (!isTooltipHovered) {
        setIsTooltipVisible(false);
        setHoveredDay(null);
      }
    }, 200);
  };

  const handleTooltipMouseEnter = () => {
    setIsTooltipHovered(true);
    // Clear hide timeout when hovering tooltip
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
  };

  const handleTooltipMouseLeave = () => {
    setIsTooltipHovered(false);
    // Hide tooltip when leaving it
    setIsTooltipVisible(false);
    setHoveredDay(null);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  const handleToday = () => {
    setCurrentDate(getIndiaDateTime());
  };

  const handleRefreshClients = async () => {
    setRefreshingClients(true);
    try {
      await refreshClients();
    } finally {
      setRefreshingClients(false);
    }
  };

  const handleAddTask = (date?: Date) => {
    setSelectedDate(date || null);
    setEditingTask(null);
    setTaskModalOpen(true);
  };

  const handleEditTask = (task: SocialCalendarTask) => {
    setEditingTask(task);
    setTaskModalOpen(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      const { error } = await supabase
        .from('social_calendar_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      
      // Refresh tasks
      loadTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task. Please try again.');
    }
  };

  const handleSaveTask = async (title: string, date: string) => {
    if (!selectedClientId || !currentClient) {
      console.error('Missing required data:', { selectedClientId, currentClient });
      alert('Please select a client before saving the task.');
      return;
    }
    
    const taskData = {
      title,
      date,
      client_id: selectedClientId,
      client_name: currentClient.name,
      team: currentClient.team
    };

    console.log('Saving task with data:', taskData);

    try {
      if (editingTask) {
        // Update existing task
        const updateData = {
          title,
          date,
          client_id: selectedClientId,
          client_name: currentClient.name,
          team: currentClient.team
        };
        
        console.log('Updating task with data:', updateData);
        
        const { error } = await supabase
          .from('social_calendar_tasks')
          .update(updateData)
          .eq('id', editingTask.id);

        if (error) {
          console.error('Update error details:', error);
          throw error;
        }
      } else {
        // Create new task
        console.log('Creating new task with data:', taskData);
        
        const { data: insertData, error } = await supabase
          .from('social_calendar_tasks')
          .insert([taskData])
          .select();

        if (error) {
          console.error('Insert error details:', error);
          console.error('Error message:', error.message);
          console.error('Error code:', error.code);
          console.error('Error details:', error.details);
          throw error;
        }
        
        console.log('Task created successfully:', insertData);
      }
      
      // Refresh tasks and close modal
      loadTasks();
      setTaskModalOpen(false);
      setEditingTask(null);
      setSelectedDate(null);
      
    } catch (error: any) {
      console.error('Error saving task:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to save task. Please try again.';
      
      if (error.message) {
        if (error.message.includes('violates foreign key constraint')) {
          errorMessage = 'The selected client is invalid. Please refresh the page and try again.';
        } else if (error.message.includes('violates check constraint')) {
          errorMessage = 'Invalid team value. Please contact support.';
        } else if (error.message.includes('duplicate key value')) {
          errorMessage = 'A task with this information already exists.';
        } else if (error.message.includes('permission denied')) {
          errorMessage = 'You don\'t have permission to save tasks.';
        } else if (error.message.includes('violates not-null constraint')) {
          errorMessage = 'Missing required information. Please try again.';
        } else {
          errorMessage = `Database error: ${error.message}`;
        }
      }
      
      alert(errorMessage);
    }
  };

  const handleExportCalendar = async () => {
    try {
      setIsExporting(true);
      
      // Validate required data
      if (!selectedClientId || !currentClient) {
        alert('Please select a client before exporting.');
        return;
      }
      
      const tasksToExport = socialTasks.filter(task => {
        if (selectedTeam === 'all') return true;
        return task.team === selectedTeam;
      });

      // Generate a truly unique token to avoid conflicts
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 15);
      const token = `export_${timestamp}_${randomStr}_${selectedClientId.slice(-8)}`;

      // Only include fields that we explicitly want to set (avoid DEFAULT conflicts)
      const calendarData = {
        token,
        client_id: selectedClientId,
        client_name: currentClient.name,
        team: selectedTeam,
        tasks: tasksToExport,
        created_by: currentUser?.id,
        expires_at: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString() // 45 days from now
      };

      console.log('Attempting to insert calendar export with data:', {
        ...calendarData,
        tasks: `${tasksToExport.length} tasks`,
        token: token.substring(0, 20) + '...'
      });

      const { data, error } = await supabase
        .from('calendar_exports')
        .insert([calendarData])
        .select()
        .single();

      if (error) {
        console.error('Export error details:', error);
        console.error('Error code:', error.code);
        console.error('Error hint:', error.hint);
        console.error('Error details:', error.details);
        
        // Handle specific error cases
        if (error.message.includes('relation "calendar_exports" does not exist')) {
          alert('Calendar export feature is not set up. Please run the SQL script from URGENT_FIX_CALENDAR_EXPORT.md');
          return;
        } else if (error.code === '23505' || error.message.includes('duplicate key')) {
          alert('Export token conflict. Please try again in a moment.');
          return;
        } else if (error.code === '23503' || error.message.includes('foreign key')) {
          alert('Invalid user or client reference. Please refresh the page and try again.');
          return;
        } else if (error.code === '42P01') {
          alert('Calendar exports table does not exist. Please run the setup script from URGENT_FIX_CALENDAR_EXPORT.md');
          return;
        }
        
        throw error;
      }

      console.log('Calendar export created successfully:', data);

      const exportUrl = `${window.location.origin}/calendar-export/${data.token}`;
      setExportUrl(exportUrl);
      setShowExportModal(true);

      // Copy to clipboard
      try {
        await navigator.clipboard.writeText(exportUrl);
        console.log('Export URL copied to clipboard');
      } catch (clipboardError) {
        console.log('Could not copy to clipboard, showing URL for manual copy');
      }

    } catch (error: any) {
      console.error('Error exporting calendar:', error);
      
      let errorMessage = 'Failed to export calendar. Please try again.';
      
      if (error.message) {
        if (error.message.includes('JWT')) {
          errorMessage = 'Authentication error. Please refresh the page and try again.';
        } else if (error.message.includes('permission denied')) {
          errorMessage = 'Permission denied. Please contact your administrator.';
        } else if (error.message.includes('409')) {
          errorMessage = 'Export conflict. Please try again in a moment.';
        }
      }
      
      alert(errorMessage);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <CalendarIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{getPageTitle()}</h1>
              {currentClient && (
                <p className="text-lg text-gray-600 mt-1">
                  {currentClient.name} • {format(currentDate, 'MMMM yyyy')}
                </p>
              )}
            </div>
          </div>
          
          {/* Team Dropdown (Admin only) */}
          {isAdmin && (
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Team:</span>
              <Select
                value={selectedTeam}
                onChange={(e) => {
                  const newTeam = e.target.value as TeamType | 'all';
                  setSelectedTeam(newTeam);
                  setIsTeamManuallySet(true); // Mark as manually set
                  
                  // Find appropriate client for the new team
                  if (newTeam === 'all') {
                    // Keep current client if it exists, otherwise pick first available
                    if (!selectedClientId || !clients.find(c => c.id === selectedClientId)) {
                      const firstClient = clients[0];
                      if (firstClient) setSelectedClientId(firstClient.id);
                    }
                  } else {
                    // Find first client of the selected team
                    const teamClients = clients.filter(c => c.team === newTeam);
                    if (teamClients.length > 0) {
                      setSelectedClientId(teamClients[0].id);
                    } else {
                      setSelectedClientId(''); // No clients for this team
                    }
                  }
                }}
                options={teamOptions}
                className="min-w-[140px] border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          )}
          
          {/* Client Dropdown with Refresh */}
          <div className="flex items-center space-x-2">
            <Building className="h-4 w-4 text-gray-600" />
            <Select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              options={clientOptions}
              className="min-w-[200px] border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefreshClients}
              disabled={refreshingClients}
              className="px-2"
              title="Refresh client list"
            >
              <RefreshCw className={`h-4 w-4 ${refreshingClients ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => handleAddTask()}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={!selectedClientId}
            >
              Add Task
            </Button>
            
            <Button
              variant="secondary"
              size="sm"
              icon={isExporting ? Download : Share}
              onClick={handleExportCalendar}
              disabled={!selectedClientId || isExporting}
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              {isExporting ? 'Exporting...' : 'Export & Share'}
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading tasks...</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Calendar */}
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateMonth('prev')}
                    className="text-white hover:bg-white/20"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  
                  <h2 className="text-2xl font-bold">
                    {format(currentDate, 'MMMM yyyy')}
                  </h2>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateMonth('next')}
                    className="text-white hover:bg-white/20"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
                
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleToday}
                  className="bg-white/20 text-white hover:bg-white/30 border-white/30"
                >
                  Today
                </Button>
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
                  const dateStr = format(day, 'yyyy-MM-dd');
                  
                  return (
                    <div
                      key={index}
                      className={`group min-h-[120px] p-2 border-r border-b last:border-r-0 relative ${
                        isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                      } ${isCurrentDay ? 'bg-blue-50 ring-2 ring-blue-200' : ''} hover:bg-gray-50 transition-colors duration-200`}
                      onMouseEnter={(e) => {
                        // Reset states when entering a new day
                        if (hoveredDay && hoveredDay !== dateStr) {
                          setHoveredDay(null);
                          setIsTooltipVisible(false);
                          setIsTooltipHovered(false);
                        }
                        handleDayMouseEnter(day, e);
                        setIsDayHovered(true);
                      }}
                      onMouseLeave={() => {
                        handleDayMouseLeave();
                        setIsDayHovered(false);
                      }}
                    >
                      {/* Date Header */}
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${
                          isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                        } ${isCurrentDay ? 'text-blue-600 font-bold' : ''}`}>
                          {format(day, 'd')}
                        </span>
                        
                        {isCurrentMonth && selectedClientId && (
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddTask(day);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 hover:bg-blue-100"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      
                      {/* Tasks */}
                      <div className="space-y-1">
                        {dayTasks.slice(0, 3).map(task => (
                          <div
                            key={task.id}
                            className="group relative"
                          >
                            <div className={`text-xs p-1.5 rounded cursor-pointer transition-all hover:shadow-md ${
                              task.team === 'creative' ? 'bg-purple-500' : 'bg-blue-500'
                            } text-white truncate`}
                              onClick={() => handleEditTask(task)}
                              title={task.title}
                            >
                              <div className="flex items-center justify-between">
                                <span className="truncate">{task.title}</span>
                                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Edit className="h-3 w-3" />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteTask(task.id);
                                    }}
                                    className="text-white hover:text-red-200"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Show more indicator */}
                        {dayTasks.length > 3 && (
                          <div className="text-xs text-gray-500 font-medium pl-1.5">
                            +{dayTasks.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Tooltip for extra tasks - IMPROVED STYLED POPUP */}
          {isTooltipVisible && hoveredDay && (
            <div
              className="fixed z-50 pointer-events-auto"
              style={{
                left: tooltipPosition.x,
                top: tooltipPosition.y,
                transform: 'translate(-50%, -100%)'
              }}
              onMouseEnter={handleTooltipMouseEnter}
              onMouseLeave={handleTooltipMouseLeave}
            >
              {/* Arrow pointing down */}
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-white"></div>
                <div className="w-0 h-0 border-l-[9px] border-r-[9px] border-t-[9px] border-l-transparent border-r-transparent border-t-gray-200 absolute -top-[1px] left-1/2 transform -translate-x-1/2"></div>
              </div>
              
              {/* Main popup card */}
              <div className="bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden max-w-sm w-80 mb-2">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3">
                  <div className="flex items-center justify-between text-white">
                    <h4 className="font-semibold text-sm">
                      {format(parseISO(hoveredDay), 'MMMM d, yyyy')}
                    </h4>
                    <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                      {getTasksForDate(parseISO(hoveredDay)).length} tasks
                    </span>
                  </div>
                </div>
                
                {/* Task list */}
                <div className="max-h-80 overflow-y-auto">
                  <div className="p-3 space-y-2">
                    {/* Show first 3 tasks as summary */}
                    {getTasksForDate(parseISO(hoveredDay)).slice(0, 3).map((task, index) => (
                      <div key={`summary-${task.id}`} className="flex items-center space-x-2 text-xs text-gray-600 border-b border-gray-100 pb-1">
                        <div className={`w-2 h-2 rounded-full ${
                          task.team === 'creative' ? 'bg-purple-500' : 'bg-blue-500'
                        }`}></div>
                        <span className="truncate">{task.title}</span>
                      </div>
                    ))}
                    
                    {getTasksForDate(parseISO(hoveredDay)).length > 3 && (
                      <div className="border-t border-gray-200 pt-2 mt-2">
                        <h5 className="text-xs font-medium text-gray-700 mb-2">Additional Tasks:</h5>
                      </div>
                    )}
                    
                    {/* Show the overflow tasks with better styling */}
                    {getTasksForDate(parseISO(hoveredDay)).slice(3).map((task, index) => (
                      <div
                        key={task.id}
                        className={`group relative rounded-md border p-3 transition-all duration-200 hover:shadow-md cursor-pointer ${
                          task.team === 'creative' 
                            ? 'border-purple-200 bg-purple-50 hover:bg-purple-100' 
                            : 'border-blue-200 bg-blue-50 hover:bg-blue-100'
                        }`}
                        onClick={() => handleEditTask(task)}
                      >
                        {/* Team indicator stripe */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-md ${
                          task.team === 'creative' ? 'bg-purple-500' : 'bg-blue-500'
                        }`}></div>
                        
                        <div className="ml-1">
                          {/* Task title */}
                          <h6 className="font-medium text-sm text-gray-900 mb-1 line-clamp-2">
                            {task.title}
                          </h6>
                          
                          {/* Task meta info */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                task.team === 'creative'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {task.team === 'creative' ? 'Creative' : 'Web'}
                              </span>
                              
                              {task.client_name && (
                                <span className="text-xs text-gray-600 truncate max-w-24">
                                  {task.client_name}
                                </span>
                              )}
                            </div>
                            
                            {/* Action buttons on hover */}
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditTask(task);
                                }}
                                className="p-1 rounded hover:bg-white/50 transition-colors"
                                title="Edit task"
                              >
                                <Edit className="h-3 w-3 text-gray-600" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTask(task.id);
                                }}
                                className="p-1 rounded hover:bg-red-100 transition-colors"
                                title="Delete task"
                              >
                                <Trash2 className="h-3 w-3 text-red-600" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Footer with quick actions */}
                <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
                  <button
                    onClick={() => handleAddTask(parseISO(hoveredDay))}
                    className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-2 px-3 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add New Task</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Task Modal */}
      <SimpleSocialTaskModal
        isOpen={taskModalOpen}
        onClose={() => {
          setTaskModalOpen(false);
          setEditingTask(null);
          setSelectedDate(null);
        }}
        onSave={handleSaveTask}
        editingTask={editingTask}
        selectedDate={selectedDate}
        clientName={currentClient?.name || ''}
      />

      {/* Export Modal */}
      {showExportModal && exportUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Calendar Exported!</h3>
            <p className="text-gray-600 mb-4">
              Your calendar has been exported and is ready to share. The link will expire in 45 days.
            </p>
            <div className="bg-gray-100 p-3 rounded border text-sm break-all mb-4">
              {exportUrl}
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="secondary"
                onClick={() => {
                  navigator.clipboard.writeText(exportUrl);
                }}
              >
                Copy Link
              </Button>
              <Button
                variant="primary"
                onClick={() => setShowExportModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialCalendar;