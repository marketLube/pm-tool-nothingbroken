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
  Building2, 
  Edit,
  Trash2,
  Clock,
  RefreshCw,
  Share,
  Download,
  ChevronDown,
  X,
  Filter,
  Hash,
  Camera,
  Users
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
  category: string;
  created_at: string;
  updated_at: string;
}

// Category options with colors and icons
const getCategoryConfig = (category: string) => {
  const configs: { [key: string]: { 
    label: string; 
    icon: React.ComponentType<{ className?: string }>; 
    color: string; 
    lightColor: string; 
    textColor: string; 
    borderColor: string; 
  } } = {
    social_media: {
      label: 'Social Media Posts',
      icon: Hash,
      color: 'bg-pink-500',
      lightColor: 'bg-pink-100',
      textColor: 'text-pink-700',
      borderColor: 'border-pink-200'
    },
    works: {
      label: 'Works (Shooting & Editing)',
      icon: Camera,
      color: 'bg-blue-500',
      lightColor: 'bg-blue-100',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-200'
    },
    meetings: {
      label: 'Meetings',
      icon: Users,
      color: 'bg-green-500',
      lightColor: 'bg-green-100',
      textColor: 'text-green-700',
      borderColor: 'border-green-200'
    }
  };
  return configs[category] || configs.works;
};

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
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  
  // Team filter state
  const [selectedTeam, setSelectedTeam] = useState<TeamType | 'all'>('all');
  const [isTeamManuallySet, setIsTeamManuallySet] = useState(false);
  
  // Modal state
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<SocialCalendarTask | null>(null);

  // Day popup state for mobile touch/click
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isDayPopupOpen, setIsDayPopupOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

  // Refs for cleanup and dropdowns
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  // Category filtering state
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['social_media', 'works', 'meetings']);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Mobile detection utility
  const isMobileDevice = () => {
    return window.innerWidth <= 768 || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  };

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(isMobileDevice());
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setIsClientDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get current client object (moved before useEffects that use it)
  const currentClient = clients.find(c => c.id === selectedClientId);

  // Get filtered clients based on team selection
  const filteredClients = useMemo(() => {
    if (selectedTeam === 'all') {
      return clients;
    } else {
      return clients.filter(c => c.team === selectedTeam);
    }
  }, [clients, selectedTeam]);

  // Set default client (first client of user's team, or first creative client for admin)
  useEffect(() => {
    if (clients.length > 0) {
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
      let defaultClient;
      if (defaultTeam === 'all') {
        defaultClient = clients[0]; // First available client
      } else {
        // Only select client from the same team, don't fall back to other teams
        defaultClient = clients.find(c => c.team === defaultTeam);
      }
      
      // Only set the client if we found one for the current team, or if no client is currently selected
      if (defaultClient && (!selectedClientId || !clients.find(c => c.id === selectedClientId && (defaultTeam === 'all' || c.team === defaultTeam)))) {
        setSelectedClientId(defaultClient.id);
      } else if (!defaultClient && selectedClientId) {
        // Clear selected client if no clients available for current team
        setSelectedClientId('');
      }
    } else {
      // No clients at all, clear selection
      setSelectedClientId('');
    }
  }, [clients, currentUser, isAdmin, isTeamManuallySet, selectedTeam]);

  // Clear client selection when team changes if selected client is not in the new team
  useEffect(() => {
    if (selectedClientId && currentClient) {
      if (selectedTeam !== 'all' && currentClient.team !== selectedTeam) {
        setSelectedClientId('');
      }
    }
  }, [selectedTeam, selectedClientId, currentClient]);

  // Load tasks from database for specific client and team
  const loadTasks = async () => {
    if (!selectedClientId) return;
    
    try {
      setLoading(true);
      
      if (!supabase) {
        console.error('Supabase client not initialized');
        return;
      }
      
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
        // Update existing tasks without categories to have 'works' category
        await ensureTasksHaveCategory();
        setSocialTasks(data || []);
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  // Update existing tasks without categories to have 'works' category 
  const ensureTasksHaveCategory = async () => {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return;
    }

    try {
      // First check if the table exists by doing a simple select
      const { error: testError } = await supabase
        .from('social_calendar_tasks')
        .select('id')
        .limit(1);

      if (testError) {
        if (testError.message.includes('does not exist')) {
          console.log('social_calendar_tasks table does not exist, skipping category update');
          return;
        }
        console.error('Error testing social_calendar_tasks table:', testError);
        return;
      }

      console.log('Updating tasks without categories to have "works" category...');
      
      // Update tasks with null category first
      const { data: nullData, error: nullError } = await supabase
        .from('social_calendar_tasks')
        .update({ category: 'works' })
        .is('category', null)
        .select('id');

      if (nullError) {
        console.error('Error updating null categories:', nullError);
      } else if (nullData && nullData.length > 0) {
        console.log(`Successfully updated ${nullData.length} tasks with null categories`);
      }

      // Update tasks with empty string category
      const { data: emptyData, error: emptyError } = await supabase
        .from('social_calendar_tasks')
        .update({ category: 'works' })
        .eq('category', '')
        .select('id');

      if (emptyError) {
        console.error('Error updating empty categories:', emptyError);
      } else if (emptyData && emptyData.length > 0) {
        console.log(`Successfully updated ${emptyData.length} tasks with empty categories`);
      }

    } catch (err) {
      console.error('Failed to update task categories:', err);
    }
  };

  // Create the table if it doesn't exist
  const createTable = async () => {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return;
    }

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
          category TEXT NOT NULL CHECK (category IN ('social_media', 'works', 'meetings')),
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

  // Run category update once on component mount - DISABLED to prevent taskboard issues
  // useEffect(() => {
  //   const initializeCategories = async () => {
  //     await ensureTasksHaveCategory();
  //   };
  //   
  //   initializeCategories();
  // }, []); // Run only once on mount

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // Get client options for dropdown
  const clientOptions = useMemo(() => {
    return [
      { value: '', label: 'Select a client...' },
      ...filteredClients.map(client => ({
        value: client.id,
        label: client.name
      }))
    ];
  }, [filteredClients]);

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
    if (!supabase) {
      console.error('Supabase client not initialized');
      return;
    }
    
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

  const handleSaveTask = async (title: string, date: string, category: string) => {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return;
    }
    
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
      team: currentClient.team,
      category
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
          team: currentClient.team,
          category
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
    if (!supabase) {
      console.error('Supabase client not initialized');
      return;
    }
    
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

  // Handle client selection
  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    setIsClientDropdownOpen(false);
  };

  // Handle day click/touch for popup (only on mobile devices)
  const handleDayClick = (day: Date) => {
    if (!isMobile) return; // Only allow on mobile devices
    
    const dayTasks = getTasksForDate(day);
    if (dayTasks.length > 0) {
      setSelectedDay(day);
      setIsDayPopupOpen(true);
    }
  };

  // Close day popup
  const closeDayPopup = () => {
    setIsDayPopupOpen(false);
    setSelectedDay(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Calendar</h1>
          <p className="text-sm text-gray-600 mt-1">
            {currentClient ? `${currentClient.name} • ${format(currentDate, 'MMMM yyyy')}` : `${format(currentDate, 'MMMM yyyy')}`}
          </p>
        </div>
      </div>

      {/* Modern Filter Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-5">
          <div className="flex items-center justify-between gap-8">
            {/* Left side - Team toggle (Admin only) and Client selection */}
            <div className="flex items-center gap-8">
              {/* Team Toggle - Minimal Design (Admin only) */}
              {isAdmin && (
                <>
                  <div className="relative">
                    <div className="flex bg-gray-50 rounded-xl p-1">
                      <button
                        onClick={() => {
                          setSelectedTeam('creative');
                          setIsTeamManuallySet(true);
                          // Find first client of the selected team
                          const teamClients = clients.filter(c => c.team === 'creative');
                          if (teamClients.length > 0) {
                            setSelectedClientId(teamClients[0].id);
                          }
                        }}
                        className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ease-out ${
                          selectedTeam === 'creative'
                            ? 'bg-blue-500 text-white shadow-md transform translate-y-[-1px]'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        Creative
                      </button>
                      <button
                        onClick={() => {
                          setSelectedTeam('web');
                          setIsTeamManuallySet(true);
                          // Find first client of the selected team
                          const teamClients = clients.filter(c => c.team === 'web');
                          if (teamClients.length > 0) {
                            setSelectedClientId(teamClients[0].id);
                          }
                        }}
                        className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ease-out ${
                          selectedTeam === 'web'
                            ? 'bg-blue-500 text-white shadow-md transform translate-y-[-1px]'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        Web
                      </button>
                      <button
                        onClick={() => {
                          setSelectedTeam('all');
                          setIsTeamManuallySet(true);
                          // Keep current client if it exists, otherwise pick first available
                          if (!selectedClientId || !clients.find(c => c.id === selectedClientId)) {
                            const firstClient = clients[0];
                            if (firstClient) setSelectedClientId(firstClient.id);
                          }
                        }}
                        className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ease-out ${
                          selectedTeam === 'all'
                            ? 'bg-blue-500 text-white shadow-md transform translate-y-[-1px]'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        All Teams
                      </button>
                    </div>
                  </div>

                  {/* Minimal Divider */}
                  <div className="h-5 w-px bg-gray-200"></div>
                </>
              )}

              {/* Client Selection - TaskBoard Style Dropdown */}
              <div className="flex items-center gap-3">
                <div className="relative" ref={clientDropdownRef}>
                  <button
                    onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border transition-all duration-200 min-w-[200px] ${
                      selectedClientId && currentClient
                        ? 'bg-orange-50 border-orange-200 text-orange-700' 
                        : filteredClients.length === 0
                        ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                    disabled={filteredClients.length === 0}
                  >
                    <Building2 className="w-4 h-4" />
                    <span className="truncate">
                      {selectedClientId && currentClient 
                        ? currentClient.name 
                        : filteredClients.length === 0 
                        ? 'No clients available' 
                        : 'Select Client'}
                    </span>
                    <ChevronDown className={`w-4 h-4 ml-auto transition-transform duration-200 ${isClientDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isClientDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-100 z-[9999] max-h-48 overflow-y-auto animate-in slide-in-from-top-2 duration-200">
                      <div className="p-1">
                        {filteredClients.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-gray-500">
                            No clients available
                          </div>
                        ) : (
                          filteredClients.map(client => (
                            <button
                              key={client.id}
                              onClick={() => handleClientSelect(client.id)}
                              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors duration-150 ${
                                selectedClientId === client.id 
                                  ? 'bg-orange-50 text-orange-700' 
                                  : 'hover:bg-gray-50 text-gray-700'
                              }`}
                            >
                              {client.name}
                              <span className="text-xs text-gray-500 ml-2">
                                ({client.team === 'creative' ? 'Creative' : 'Web'})
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={handleRefreshClients}
                  disabled={refreshingClients}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg border border-gray-200 transition-all duration-200"
                  title="Refresh client list"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshingClients ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Right side - Action Buttons */}
            <div className="flex items-center gap-3">
              {/* Action Buttons */}
              <button
                onClick={() => handleAddTask()}
                disabled={!selectedClientId || filteredClients.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-500"
                title={!selectedClientId || filteredClients.length === 0 ? 'Select a client to add tasks' : 'Add new task'}
              >
                <Plus className="w-4 h-4" />
                Add Task
              </button>
              
              <button
                onClick={handleExportCalendar}
                disabled={!selectedClientId || isExporting}
                className="flex items-center gap-2 px-4 py-2.5 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? <Download className="w-4 h-4" /> : <Share className="w-4 h-4" />}
                {isExporting ? 'Exporting...' : 'Export & Share'}
              </button>
            </div>
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
                      } ${isCurrentDay ? 'bg-blue-50 ring-2 ring-blue-200' : ''} transition-colors duration-200 ${
                        !isMobile ? 'hover:bg-gray-50' : ''
                      } ${isMobile && dayTasks.length > 0 ? 'cursor-pointer touch-manipulation' : ''}`}
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
                      onClick={() => handleDayClick(day)}
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
                        {dayTasks.slice(0, 3).map(task => {
                          const categoryConfig = getCategoryConfig(task.category || 'works');
                          return (
                            <div
                              key={task.id}
                              className="group relative"
                            >
                              <div className={`text-xs p-1.5 rounded cursor-pointer transition-all hover:shadow-md ${
                                categoryConfig.color
                              } text-white truncate`}
                                onClick={() => handleEditTask(task)}
                                title={`${categoryConfig.label}: ${task.title}`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-1 min-w-0">
                                    <categoryConfig.icon className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate">{task.title}</span>
                                  </div>
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
                          );
                        })}
                        
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
                    {getTasksForDate(parseISO(hoveredDay)).slice(0, 3).map((task, index) => {
                      const categoryConfig = getCategoryConfig(task.category || 'works');
                      return (
                        <div key={`summary-${task.id}`} className="flex items-center space-x-2 text-xs text-gray-600 border-b border-gray-100 pb-1">
                          <div className={`w-2 h-2 rounded-full ${categoryConfig.color.replace('bg-', 'bg-')}`}></div>
                          <categoryConfig.icon className="h-3 w-3 text-gray-500" />
                          <span className="truncate">{task.title}</span>
                          <span className="text-xs text-gray-500">({categoryConfig.label})</span>
                        </div>
                      );
                    })}
                    
                    {getTasksForDate(parseISO(hoveredDay)).length > 3 && (
                      <div className="border-t border-gray-200 pt-2 mt-2">
                        <h5 className="text-xs font-medium text-gray-700 mb-2">Additional Tasks:</h5>
                      </div>
                    )}
                    
                    {/* Show the overflow tasks with better styling */}
                    {getTasksForDate(parseISO(hoveredDay)).slice(3).map((task, index) => {
                      const categoryConfig = getCategoryConfig(task.category || 'works');
                      return (
                        <div
                          key={task.id}
                          className={`group relative rounded-md border p-3 transition-all duration-200 hover:shadow-md cursor-pointer ${
                            categoryConfig.lightColor} ${categoryConfig.borderColor || 'border-gray-200'
                          } hover:${categoryConfig.lightColor.replace('bg-', 'bg-').replace('-100', '-200')}`}
                          onClick={() => handleEditTask(task)}
                        >
                          {/* Category indicator stripe */}
                          <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-md ${
                            categoryConfig.color
                          }`}></div>
                          
                          <div className="ml-1">
                            {/* Task title */}
                            <div className="flex items-center space-x-2 mb-1">
                              <categoryConfig.icon className={`h-4 w-4 ${categoryConfig.textColor}`} />
                              <h6 className="font-medium text-sm text-gray-900 line-clamp-2 flex-1">
                                {task.title}
                              </h6>
                            </div>
                            
                            {/* Task meta info */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  categoryConfig.lightColor} ${categoryConfig.textColor
                                }`}>
                                  {categoryConfig.label}
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
                      );
                    })}
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

      {/* Day Tasks Popup Modal */}
      {isDayPopupOpen && selectedDay && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3">
              <div className="flex items-center justify-between text-white">
                <h4 className="font-semibold text-base">
                  {format(selectedDay, 'MMMM d, yyyy')}
                </h4>
                <div className="flex items-center space-x-2">
                  <span className="text-sm bg-white/20 px-2 py-1 rounded-full">
                    {getTasksForDate(selectedDay).length} tasks
                  </span>
                  <button
                    onClick={closeDayPopup}
                    className="p-1 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Task list */}
            <div className="max-h-96 overflow-y-auto">
              <div className="p-4 space-y-3">
                {getTasksForDate(selectedDay).map((task, index) => (
                  <div
                    key={task.id}
                    className={`group relative rounded-lg border p-3 transition-all duration-200 hover:shadow-md cursor-pointer ${
                      task.team === 'creative' 
                        ? 'border-purple-200 bg-purple-50 hover:bg-purple-100' 
                        : 'border-blue-200 bg-blue-50 hover:bg-blue-100'
                    }`}
                    onClick={() => handleEditTask(task)}
                  >
                    {/* Team indicator stripe */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${
                      task.team === 'creative' ? 'bg-purple-500' : 'bg-blue-500'
                    }`}></div>
                    
                    <div className="ml-1">
                      {/* Task title */}
                      <h6 className="font-medium text-sm text-gray-900 mb-2">
                        {task.title}
                      </h6>
                      
                      {/* Task meta info */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            task.team === 'creative'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {task.team === 'creative' ? 'Creative' : 'Web'}
                          </span>
                          
                          {task.client_name && (
                            <span className="text-xs text-gray-600 truncate">
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
            
            {/* Footer */}
            <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    handleAddTask(selectedDay);
                    closeDayPopup();
                  }}
                  className="flex-1 flex items-center justify-center bg-blue-600 text-white py-2 px-3 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Task
                </button>
                <button
                  onClick={closeDayPopup}
                  className="flex-1 flex items-center justify-center bg-gray-600 text-white py-2 px-3 rounded-md hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialCalendar;