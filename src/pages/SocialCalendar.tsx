import React, { useState, useEffect, useMemo, useRef } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
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
  const { clients, refreshClients } = useData();
  const { currentUser, isAdmin } = useAuth();
  
  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
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
      console.log('Please create the social_calendar_tasks table in your database using the provided SQL script');
      setSocialTasks([]); // Set empty tasks for now
    } catch (error) {
      console.error('Error creating table:', error);
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
      
      // Clear any pending timeouts for immediate response
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
        showTimeoutRef.current = null;
      }
      
      // Set tooltip data immediately for fast response
      setHoveredDay(dateStr);
      setIsDayHovered(true);
      setIsTooltipVisible(true);
      
      // Calculate position with better viewport handling
      const rect = event.currentTarget.getBoundingClientRect();
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
        scrollY: window.scrollY
      };
      
      let tooltipX = rect.left + rect.width / 2;
      let tooltipY = rect.top + viewport.scrollY;
      
      // Ensure tooltip stays within viewport
      const tooltipWidth = 400; // max-w-[400px]
      if (tooltipX + tooltipWidth / 2 > viewport.width) {
        tooltipX = viewport.width - tooltipWidth / 2 - 20;
      }
      if (tooltipX - tooltipWidth / 2 < 0) {
        tooltipX = tooltipWidth / 2 + 20;
      }
      
      setTooltipPosition({ x: tooltipX, y: tooltipY });
    }
  };

  const handleDayMouseLeave = () => {
    setIsDayHovered(false);
    // Don't hide immediately - let the useEffect handle it with proper delay
  };

  // Handle tooltip hover to keep it visible
  const handleTooltipMouseEnter = () => {
    // Clear any pending hide timeout when entering tooltip
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setIsTooltipHovered(true);
  };

  const handleTooltipMouseLeave = () => {
    setIsTooltipHovered(false);
    // The useEffect will handle hiding with proper delay
  };

  // Navigation functions
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Manual refresh clients function
  const handleRefreshClients = async () => {
    setRefreshingClients(true);
    try {
      await refreshClients();
    } catch (error) {
      console.error('Failed to refresh clients:', error);
    } finally {
      setRefreshingClients(false);
    }
  };

  // Task management functions
  const handleAddTask = (date?: Date) => {
    if (date) {
      setSelectedDate(date);
    }
    setEditingTask(null);
    setTaskModalOpen(true);
  };

  const handleEditTask = (task: SocialCalendarTask) => {
    setEditingTask(task);
    setTaskModalOpen(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        const { error } = await supabase
          .from('social_calendar_tasks')
          .delete()
          .eq('id', taskId);

        if (error) {
          console.error('Error deleting task:', error);
          alert('Failed to delete task. Please try again.');
        } else {
          // Remove from local state
          setSocialTasks(prev => prev.filter(task => task.id !== taskId));
        }
      } catch (err) {
        console.error('Failed to delete task:', err);
        alert('Failed to delete task. Please try again.');
      }
    }
  };

  const handleSaveTask = async (title: string, date: string) => {
    if (!selectedClientId || !currentClient) {
      alert('Please select a client first');
      return;
    }

    try {
      if (editingTask) {
        // Update existing task
        const { data, error } = await supabase
          .from('social_calendar_tasks')
          .update({ 
            title, 
            date,
            client_name: currentClient.name, // Update client name too
            updated_at: new Date().toISOString()
          })
          .eq('id', editingTask.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating task:', error);
          alert('Failed to update task. Please try again.');
        } else {
          // Update local state
          setSocialTasks(prev => prev.map(task => 
            task.id === editingTask.id ? data : task
          ));
        }
      } else {
        // Create new task with client-specific data
        // Use the selected team or current client's team
        const taskTeam = selectedTeam !== 'all' ? selectedTeam : currentClient.team;
        
        const { data, error } = await supabase
          .from('social_calendar_tasks')
          .insert({
            title,
            date,
            client_id: selectedClientId,
            client_name: currentClient.name, // Store client name for easy reference
            team: taskTeam
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating task:', error);
          alert('Failed to create task. Please try again.');
        } else {
          // Add to local state
          setSocialTasks(prev => [...prev, data]);
        }
      }
      
      setTaskModalOpen(false);
      setEditingTask(null);
      setSelectedDate(null);
    } catch (err) {
      console.error('Failed to save task:', err);
      alert('Failed to save task. Please try again.');
    }
  };

  // Export calendar functionality
  const handleExportCalendar = async () => {
    console.log('Export button clicked!', { selectedClientId, currentClient, currentUser });
    
    if (!selectedClientId || !currentClient) {
      alert('Please select a client first');
      return;
    }

    setIsExporting(true);
    console.log('Starting export process...');
    
    try {
      // Generate a unique token for the export
      const exportToken = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('Generated token:', exportToken);
      
      // Prepare export data WITHOUT created_by to avoid foreign key issues
      const exportData = {
        token: exportToken,
        client_id: selectedClientId,
        client_name: currentClient.name,
        team: selectedTeam === 'all' ? 'all' : selectedTeam,
        tasks: socialTasks,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString() // 45 days
        // REMOVED created_by field to avoid foreign key constraint issues
      };
      
      console.log('Export data prepared:', exportData);

      // Store export data in database
      console.log('Inserting into database...');
      const { error } = await supabase
        .from('calendar_exports')
        .insert(exportData);

      if (error) {
        console.error('Error creating export:', error);
        alert(`Failed to create export: ${error.message}`);
      } else {
        console.log('Export created successfully!');
        // Generate the shareable URL
        const baseUrl = window.location.origin;
        const shareableUrl = `${baseUrl}/calendar-export/${exportToken}`;
        console.log('Generated URL:', shareableUrl);
        setExportUrl(shareableUrl);
        setShowExportModal(true);
      }
    } catch (err) {
      console.error('Failed to export calendar:', err);
      alert('Failed to export calendar. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Control tooltip visibility based on hover states - FIXED VERSION
  useEffect(() => {
    // Debug logging to track state changes
    console.log('Hover states:', { isDayHovered, isTooltipHovered, hoveredDay, isTooltipVisible });
    
    if (isDayHovered || isTooltipHovered) {
      // Clear any pending hide timeout when hovering
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      
      // Show tooltip immediately if we have a hovered day
      if (hoveredDay && !isTooltipVisible) {
        setIsTooltipVisible(true);
      }
    } else {
      // Neither day nor tooltip is hovered - hide with reasonable delay
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      
      // Add a reasonable delay before hiding (500ms)
      hideTimeoutRef.current = setTimeout(() => {
        setIsTooltipVisible(false);
        setHoveredDay(null);
      }, 500);
    }
    
    // Cleanup function
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };
  }, [isDayHovered, isTooltipHovered, hoveredDay, isTooltipVisible]);

  // Additional cleanup when hoveredDay changes or becomes null
  useEffect(() => {
    if (!hoveredDay) {
      setIsTooltipVisible(false);
      setIsDayHovered(false);
      setIsTooltipHovered(false);
    }
  }, [hoveredDay]);

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <CalendarIcon className="h-8 w-8 mr-3 text-blue-600" />
            {getPageTitle()}
          </h1>
          <p className="text-gray-600 mt-1">
            Plan and manage {selectedTeam === 'web' ? 'project content' : selectedTeam === 'creative' ? 'social media content' : 'content'} for {currentClient?.name || 'selected client'}
            {selectedClientId && (
              <span className="text-sm text-gray-500 ml-2">
                • {socialTasks.length} tasks total
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Team Filter (Admin Only) */}
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
                  onClick={goToToday}
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
                        // Remove the problematic setTimeout - let useEffect handle hiding
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
                            } text-white truncate`}>
                              <div className="flex items-center justify-between">
                                <span className="truncate font-medium">{task.title}</span>
                                
                                {/* Task Actions */}
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditTask(task);
                                    }}
                                    className="p-0.5 hover:bg-white/20 rounded"
                                  >
                                    <Edit className="h-2.5 w-2.5" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteTask(task.id);
                                    }}
                                    className="p-0.5 hover:bg-white/20 rounded"
                                  >
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Show more indicator with hover hint */}
                        {dayTasks.length > 3 && (
                          <div className="text-xs text-gray-500 font-medium pl-1 cursor-help">
                            +{dayTasks.length - 3} more (hover to see all)
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Hover Tooltip for All Tasks - IMPROVED WITH ANIMATIONS */}
          {hoveredDay && isTooltipVisible && (
            <div
              className={`fixed z-50 transform -translate-x-1/2 -translate-y-full pointer-events-auto transition-all duration-200 ease-in-out ${
                isTooltipVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              }`}
              style={{
                left: tooltipPosition.x,
                top: tooltipPosition.y - 10,
              }}
              onMouseEnter={handleTooltipMouseEnter}
              onMouseLeave={handleTooltipMouseLeave}
            >
              <div className="bg-white rounded-lg shadow-2xl border border-gray-200 p-4 min-w-[320px] max-w-[400px] transform transition-all duration-200 ease-in-out">
                {/* Header */}
                <div className="mb-3 border-b border-gray-100 pb-3">
                  <h4 className="font-semibold text-gray-900 text-base">
                    {format(new Date(hoveredDay), 'EEEE, MMMM d, yyyy')}
                  </h4>
                  <p className="text-sm text-gray-500 mt-1">
                    {getTasksForDate(new Date(hoveredDay)).length} tasks for {currentClient?.name}
                  </p>
                </div>
                
                {/* Scrollable Task List */}
                <div 
                  className="space-y-3 max-h-80 overflow-y-auto pr-2 scroll-smooth"
                  style={{ 
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#e5e7eb #f3f4f6'
                  }}
                  onMouseEnter={(e) => e.stopPropagation()}
                  onMouseLeave={(e) => e.stopPropagation()}
                  onWheel={(e) => e.stopPropagation()}
                >
                  {getTasksForDate(new Date(hoveredDay)).map((task, index) => (
                    <div
                      key={task.id}
                      className={`p-3 rounded-lg border-l-4 transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${
                        task.team === 'creative' 
                          ? 'bg-purple-50 border-purple-400 hover:bg-purple-100' 
                          : 'bg-blue-50 border-blue-400 hover:bg-blue-100'
                      }`}
                      style={{
                        animationDelay: `${index * 50}ms`,
                        animationFillMode: 'both'
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="text-sm font-medium text-gray-900 leading-relaxed flex-1 pr-2">
                          {task.title}
                        </h5>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 transition-all duration-150 ${
                          task.team === 'creative' 
                            ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                            : 'bg-blue-100 text-blue-700 border border-blue-200'
                        }`}>
                          {task.team === 'creative' ? 'Creative' : 'Web'}
                        </span>
                      </div>
                      <div className="flex items-center text-xs text-gray-500">
                        <CalendarIcon className="h-3 w-3 mr-2 flex-shrink-0" />
                        <span>Created {format(new Date(task.created_at), 'MMM d, h:mm a')}</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Scroll Hint */}
                {getTasksForDate(new Date(hoveredDay)).length > 5 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 animate-pulse">
                    <p className="text-xs text-gray-400 text-center flex items-center justify-center">
                      <span className="mr-1 animate-bounce">↕</span>
                      Scroll inside this area to see all tasks
                    </p>
                  </div>
                )}
                
                {/* Tooltip Arrow */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                  <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-transparent border-t-white"></div>
                  <div className="w-0 h-0 border-l-[9px] border-r-[9px] border-t-[9px] border-transparent border-t-gray-200 -mt-[9px]"></div>
                </div>
              </div>
            </div>
          )}

          {/* Task Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Total Tasks</p>
                    <p className="text-2xl font-bold">{socialTasks.length}</p>
                  </div>
                  <CalendarIcon className="h-8 w-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm">This Month</p>
                    <p className="text-2xl font-bold">
                      {socialTasks.filter(t => {
                        const taskDate = new Date(t.date);
                        return taskDate.getMonth() === currentDate.getMonth() && 
                               taskDate.getFullYear() === currentDate.getFullYear();
                      }).length}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-purple-200" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">Client</p>
                    <p className="text-lg font-bold truncate">{currentClient?.name || 'None'}</p>
                  </div>
                  <Building className="h-8 w-8 text-green-200" />
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Simplified Task Modal */}
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
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Calendar Export Ready</h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                Your calendar has been exported successfully! Share this link with your client:
              </p>
              <div className="bg-gray-50 p-3 rounded border">
                <code className="text-sm break-all">{exportUrl}</code>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                Link expires in 45 days
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(exportUrl);
                    alert('Link copied to clipboard!');
                  }}
                >
                  Copy Link
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowExportModal(false)}
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialCalendar; 