import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { supabase } from '../utils/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Calendar as CalendarIcon, Building, Clock, ExternalLink, X, Filter, Hash, Camera, Users } from 'lucide-react';

interface ExportedTask {
  id: string;
  title: string;
  date: string;
  client_id: string;
  client_name: string;
  team: string;
  category?: string;
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

// Category configuration with colors and icons
const getCategoryConfig = (category: string) => {
  const configs: Record<string, {
    label: string;
    icon: any;
    color: string;
    lightColor: string;
    textColor: string;
    borderColor?: string;
  }> = {
    social_media: {
      label: 'Social Media',
      icon: Hash,
      color: 'bg-pink-500',
      lightColor: 'bg-pink-100',
      textColor: 'text-pink-700',
      borderColor: 'border-pink-400'
    },
    works: {
      label: 'Works',
      icon: Camera,
      color: 'bg-blue-500',
      lightColor: 'bg-blue-100',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-400'
    },
    meetings: {
      label: 'Meetings',
      icon: Users,
      color: 'bg-green-500',
      lightColor: 'bg-green-100',
      textColor: 'text-green-700',
      borderColor: 'border-green-400'
    }
  };
  return configs[category] || configs.works;
};

// Mobile detection utility
const isMobileDevice = () => {
  return window.innerWidth <= 768 || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

const CalendarExport: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [exportData, setExportData] = useState<CalendarExportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Category filtering state - DEFAULT TO SHOW FILTERS
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['social_media', 'works', 'meetings']);
  const [showCategoryFilter, setShowCategoryFilter] = useState(true); // Changed to true for default show

  // Day popup state for mobile touch/click
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isDayPopupOpen, setIsDayPopupOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // View toggle state (calendar vs list) - only for mobile
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Hover tooltip state for desktop
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isTooltipHovered, setIsTooltipHovered] = useState(false);
  const [isDayHovered, setIsDayHovered] = useState(false);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(isMobileDevice());
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

      if (!supabase) {
        setError('Database connection not available.');
        return;
      }

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
    return exportData.tasks
      .filter(task => task.date === dateStr)
      .filter(task => selectedCategories.includes(task.category || 'works'));
  };

  // Category filter functions
  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const selectAllCategories = () => {
    setSelectedCategories(['social_media', 'works', 'meetings']);
  };

  const clearAllCategories = () => {
    setSelectedCategories([]);
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

  // Handle day click/touch for popup (only on mobile)
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

  // Hover tooltip handlers for desktop
  const handleDayMouseEnter = (day: Date, event: React.MouseEvent) => {
    if (isMobile) return; // Only for desktop
    
    const dayTasks = getTasksForDate(day);
    if (dayTasks.length <= 4) return; // Only show tooltip if more than 4 tasks
    
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top;
    
    setTooltipPosition({ x, y });
    setHoveredDay(format(day, 'yyyy-MM-dd'));
    
    // Add small delay to prevent immediate popup
    setTimeout(() => {
      if (isDayHovered) {
        setIsTooltipVisible(true);
      }
    }, 300);
  };

  const handleDayMouseLeave = () => {
    if (isMobile) return;
    
    setIsDayHovered(false);
    // Add small delay before hiding to allow moving to tooltip
    setTimeout(() => {
      if (!isTooltipHovered) {
        setIsTooltipVisible(false);
        setHoveredDay(null);
      }
    }, 100);
  };

  const handleTooltipMouseEnter = () => {
    setIsTooltipHovered(true);
  };

  const handleTooltipMouseLeave = () => {
    setIsTooltipHovered(false);
    setIsTooltipVisible(false);
    setHoveredDay(null);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* Enhanced Mobile Header */}
      {isMobile ? (
        <div className="relative overflow-hidden">
          {/* Background gradients and patterns */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800"></div>
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/20"></div>
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-purple-300/20 rounded-full blur-2xl"></div>
          
          <div className="relative px-4 py-6 pb-4">
            {/* Top section with calendar icon and title */}
            <div className="flex items-start space-x-3 mb-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2 shadow-lg">
                <CalendarIcon className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-white mb-1 leading-tight">
                  {exportData.client_name}
                </h1>
                <p className="text-blue-100 text-xs font-medium">
                  Shared Calendar View
                </p>
              </div>
            </div>

            {/* Enhanced metadata cards */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-white/15 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                <div className="flex items-center space-x-1.5 mb-1">
                  <div className={`w-2 h-2 rounded-full ${getTeamColor(exportData.team)} shadow-sm`}></div>
                  <span className="text-xs font-medium text-blue-100 uppercase tracking-wide">Team</span>
                </div>
                <p className="text-white font-semibold text-xs">{getTeamLabel(exportData.team)}</p>
              </div>
              
              <div className="bg-white/15 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                <div className="flex items-center space-x-1.5 mb-1">
                  <Clock className="h-2.5 w-2.5 text-blue-100" />
                  <span className="text-xs font-medium text-blue-100 uppercase tracking-wide">Expires</span>
                </div>
                <p className="text-white font-semibold text-xs">
                  {format(parseISO(exportData.expires_at), 'MMM d, yyyy')}
                </p>
              </div>
            </div>

            {/* View toggle buttons */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-1 border border-white/20 mb-3">
              <div className="grid grid-cols-2 gap-0.5">
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-lg transition-all duration-300 ${
                    viewMode === 'calendar'
                      ? 'bg-white text-blue-600 shadow-lg'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <CalendarIcon className="h-3.5 w-3.5" />
                  <span className="font-medium text-xs">Calendar</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-lg transition-all duration-300 ${
                    viewMode === 'list'
                      ? 'bg-white text-blue-600 shadow-lg'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  <span className="font-medium text-xs">List</span>
                </button>
              </div>
            </div>

            {/* Category Filter */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-1.5">
                  <Filter className="h-3.5 w-3.5 text-white/80" />
                  <span className="text-xs font-medium text-white/80 uppercase tracking-wide">Filter by Category</span>
                </div>
                <button
                  onClick={() => setShowCategoryFilter(!showCategoryFilter)}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <svg className={`h-4 w-4 transition-transform ${showCategoryFilter ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              
              {showCategoryFilter && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { value: 'social_media', ...getCategoryConfig('social_media') },
                      { value: 'works', ...getCategoryConfig('works') },
                      { value: 'meetings', ...getCategoryConfig('meetings') }
                    ].map((category) => {
                      const Icon = category.icon;
                      const isSelected = selectedCategories.includes(category.value);
                      
                      return (
                        <button
                          key={category.value}
                          onClick={() => toggleCategory(category.value)}
                          className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            isSelected
                              ? 'bg-white text-blue-600 shadow-sm'
                              : 'bg-white/20 text-white/70 hover:bg-white/30'
                          }`}
                        >
                          <Icon className="h-3 w-3" />
                          <span>{category.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  
                  <div className="flex space-x-2 pt-1">
                    <button
                      onClick={selectAllCategories}
                      className="flex-1 text-xs text-white/60 hover:text-white/80 transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      onClick={clearAllCategories}
                      className="flex-1 text-xs text-white/60 hover:text-white/80 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Desktop Header - Keep existing design */
      <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6">
            <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <CalendarIcon className="h-5 w-5 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <h1 className="text-base sm:text-2xl font-bold text-gray-900 truncate leading-tight">
                    {exportData.client_name}
              </h1>
                  <div className="hidden sm:flex sm:flex-col lg:flex-row lg:items-center lg:space-x-4 mt-1 space-y-1 lg:space-y-0">
                  <div className="flex items-center space-x-1">
                      <Building className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-gray-600 truncate">{exportData.client_name}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getTeamColor(exportData.team)}`}></div>
                      <span className="text-xs sm:text-sm text-gray-600">{getTeamLabel(exportData.team)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-gray-600">
                      Expires {format(parseISO(exportData.expires_at), 'MMM d, yyyy')}
                </span>
              </div>
            </div>
              </div>
            </div>
              
              <div className="hidden sm:block text-right">
                <p className="text-xs sm:text-sm text-gray-500">Shared Calendar</p>
                <p className="text-xs text-gray-400">
                  Generated {format(parseISO(exportData.created_at), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Category Filters */}
      {!isMobile && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 border-b border-gray-100">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filter by Category</span>
              </div>
              <button
                onClick={() => setShowCategoryFilter(!showCategoryFilter)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className={`h-4 w-4 transition-transform ${showCategoryFilter ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            
            {showCategoryFilter && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'social_media', ...getCategoryConfig('social_media') },
                    { value: 'works', ...getCategoryConfig('works') },
                    { value: 'meetings', ...getCategoryConfig('meetings') }
                  ].map((category) => {
                    const Icon = category.icon;
                    const isSelected = selectedCategories.includes(category.value);
                    
                    return (
                      <button
                        key={category.value}
                        onClick={() => toggleCategory(category.value)}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          isSelected
                            ? `${category.lightColor} ${category.textColor} border-2 ${category.borderColor || 'border-transparent'}`
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{category.label}</span>
                      </button>
                    );
                  })}
                </div>
                
                <div className="flex items-center space-x-4 pt-2 border-t border-gray-100">
                  <button
                    onClick={selectAllCategories}
                    className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    onClick={clearAllCategories}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Clear All
                  </button>
                  <div className="flex-1"></div>
                  <span className="text-xs text-gray-500">
                    {selectedCategories.length === 0 
                      ? 'No categories selected' 
                      : `${selectedCategories.length} of 3 categories selected`
                    }
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isMobile && viewMode === 'list' ? (
          /* Mobile List View */
          <div className="space-y-3">
            {/* Monthly summary card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="text-center">
                <h2 className="text-lg font-bold text-gray-900 mb-2">
                  {format(currentDate, 'MMMM yyyy')}
                </h2>
                <div className="flex items-center justify-center space-x-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-blue-600">{exportData.tasks.length}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Total Tasks</div>
                  </div>
                  <div className="w-px h-6 bg-gray-200"></div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-purple-600">
                      {new Set(exportData.tasks.map(task => task.date)).size}
                    </div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Active Days</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Task list grouped by date */}
            <div className="space-y-2">
              {Object.entries(
                exportData.tasks
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .reduce((acc, task) => {
                    const date = task.date;
                    if (!acc[date]) acc[date] = [];
                    acc[date].push(task);
                    return acc;
                  }, {} as Record<string, ExportedTask[]>)
              ).map(([date, tasks]) => (
                <div key={date} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* Date header */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm">
                          {format(parseISO(date), 'EEEE')}
                        </h3>
                        <p className="text-xs text-gray-600">
                          {format(parseISO(date), 'MMMM d, yyyy')}
                        </p>
                      </div>
                      <div className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
                        <span className="font-semibold text-xs">
                          {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tasks for this date */}
                  <div className="divide-y divide-gray-50">
                    {tasks.filter(task => selectedCategories.includes(task.category || 'works')).map((task, index) => {
                      const config = getCategoryConfig(task.category || 'works');
                      const Icon = config.icon;
                      
                      return (
                        <div key={task.id} className="p-4">
                          <div className="flex items-start space-x-3">
                            {/* Category indicator with icon */}
                            <div className={`${config.lightColor} p-1.5 rounded-lg mt-0.5 flex-shrink-0 shadow-sm`}>
                              <Icon className={`h-3 w-3 ${config.textColor}`} />
                            </div>
                            
                            {/* Task content */}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 text-sm leading-tight mb-1.5">
                                {task.title}
                              </h4>
                              
                              {/* Task meta */}
                              <div className="flex items-center space-x-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.lightColor} ${config.textColor}`}>
                                  {config.label}
                                </span>
                                
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  task.team === 'creative'
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {task.team === 'creative' ? 'Creative' : 'Web'} Team
                                </span>
                                
                                {task.client_name && (
                                  <div className="flex items-center space-x-1 text-gray-500">
                                    <Building className="h-2.5 w-2.5" />
                                    <span className="text-xs font-medium">{task.client_name}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              
              {exportData.tasks.length === 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                  <div className="text-gray-400 mb-3">
                    <CalendarIcon className="h-8 w-8 mx-auto" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">No tasks scheduled</h3>
                  <p className="text-xs text-gray-500">There are no tasks in this calendar.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Calendar View - Enhanced for mobile */
          <Card className={`shadow-lg ${isMobile ? 'rounded-2xl border-0 shadow-xl' : ''}`}>
            <CardHeader className={`${isMobile ? 'bg-gradient-to-r from-blue-600 to-purple-600' : 'bg-gradient-to-r from-blue-600 to-purple-600'} text-white ${isMobile ? 'rounded-t-xl' : 'rounded-t-lg'}`}>
            <div className="flex items-center justify-center">
                <h2 className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold`}>
                {format(currentDate, 'MMMM yyyy')}
              </h2>
            </div>
          </CardHeader>
            
          <CardContent className="p-0">
              {/* Week Days Header */}
              <div className="hidden sm:grid grid-cols-7 bg-gray-50 border-b">
                {weekDays.map(day => (
                  <div key={day} className="p-4 text-center font-semibold text-gray-700 border-r last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Mobile Week Days Header */}
              <div className="grid grid-cols-7 sm:hidden bg-gray-50 border-b">
                {weekDays.map(day => (
                  <div key={day} className="p-2 text-center font-semibold text-gray-700 text-xs border-r last:border-r-0">
                    {day.slice(0, 3)}
                  </div>
                ))}
              </div>
              
              {/* Calendar Grid */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day, index) => {
                  const dayTasks = getTasksForDate(day);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isCurrentDay = isToday(day);
                  const hasNoTasks = dayTasks.length === 0;
                  
                  return (
                    <div
                      key={index}
                      className={`${isMobile ? 'min-h-[100px]' : 'min-h-[80px] sm:min-h-[120px]'} p-1 sm:p-2 border-r border-b last:border-r-0 relative transition-all duration-300 ${
                        isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                      } ${isCurrentDay ? (isMobile ? 'bg-gradient-to-br from-blue-50 to-purple-50 ring-2 ring-blue-300' : 'bg-blue-50 ring-2 ring-blue-200') : ''} ${
                        isMobile && !hasNoTasks ? 'cursor-pointer active:bg-gray-100 touch-manipulation hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50' : ''
                      } ${!isMobile ? 'hover:bg-gray-50' : ''}`}
                      onClick={() => handleDayClick(day)}
                      onMouseEnter={(e) => {
                        // Reset states when entering a new day
                        if (hoveredDay && hoveredDay !== format(day, 'yyyy-MM-dd')) {
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
                      style={isMobile && !hasNoTasks ? { minHeight: '100px' } : {}}
                    >
                      {/* Date Header */}
                      <div className="flex items-center justify-between mb-1 sm:mb-2">
                        <span className={`${isMobile ? 'text-sm font-bold' : 'text-xs sm:text-sm font-medium'} ${
                          isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                        } ${isCurrentDay ? (isMobile ? 'text-blue-700 bg-blue-100 px-2 py-1 rounded-full' : 'text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded-full') : ''}`}>
                          {format(day, 'd')}
                          {isCurrentDay && (
                            <span className="ml-1 text-xs text-blue-500 font-normal">Today</span>
                          )}
                        </span>
                        
                        {/* Enhanced task count indicator on mobile */}
                        {isMobile && dayTasks.length > 0 && (
                          <div className="relative">
                            <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none min-w-[20px] text-center font-bold shadow-sm">
                              {dayTasks.length}
                            </div>
                            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></div>
                          </div>
                        )}
                        
                        {/* Desktop task count indicator */}
                        {!isMobile && dayTasks.length > 0 && (
                          <span className="bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none min-w-[18px] text-center font-medium">
                            {dayTasks.length}
                          </span>
                        )}
                      </div>
                      
                      {/* Tasks - Enhanced Mobile Display with Category Colors */}
                      {isMobile ? (
                      <div className="space-y-1">
                          {dayTasks.length > 0 && (
                            <>
                              {(() => {
                                const config = getCategoryConfig(dayTasks[0].category || 'works');
                                return (
                                  <div className={`text-xs p-1.5 rounded-lg font-medium shadow-sm ${config.color} text-white`}>
                                    <div className="flex items-center space-x-1">
                                      <config.icon className="h-2.5 w-2.5 flex-shrink-0" />
                                      <div className="truncate">
                                        {dayTasks[0].title.length > 8 ? dayTasks[0].title.substring(0, 8) + '...' : dayTasks[0].title}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                              {dayTasks.length > 1 && (
                                <div className="text-xs text-gray-600 font-medium bg-gradient-to-r from-gray-100 to-gray-200 px-1.5 py-0.5 rounded-lg text-center border">
                                  +{dayTasks.length - 1} more
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ) : (
                        /* Desktop Tasks Display with Category Colors */
                        <div className="hidden sm:block space-y-1">
                      {dayTasks.slice(0, 4).map(task => {
                        const config = getCategoryConfig(task.category || 'works');
                        return (
                          <div
                            key={task.id}
                            className={`text-xs p-1.5 rounded flex items-center space-x-1 ${config.color} text-white`}
                            title={`${config.label}: ${task.title}`}
                          >
                            <config.icon className="h-2.5 w-2.5 flex-shrink-0" />
                            <span className="truncate">{task.title}</span>
                          </div>
                        );
                      })}
                      
                      {dayTasks.length > 4 && (
                        <div className="text-xs text-gray-500 font-medium pl-1.5">
                          +{dayTasks.length - 4} more
                        </div>
                      )}
                      </div>
                      )}

                      {/* Enhanced Mobile touch indicator */}
                      {isMobile && dayTasks.length > 0 && (
                        <div className="absolute bottom-2 right-2">
                          <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse shadow-sm"></div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
        )}

        {/* Statistics */}
        <div className={`mt-4 sm:mt-6 ${isMobile ? 'px-4' : ''}`}>
          {isMobile ? (
            /* Mobile Enhanced Statistics */
            <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-4 relative overflow-hidden">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full -translate-y-12 translate-x-12 opacity-50"></div>
              
              <div className="relative">
                <h3 className="text-sm font-bold text-gray-900 mb-4 text-center">Calendar Overview</h3>
                <div className="grid grid-cols-3 gap-1">
                  <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                    <div className="text-lg font-bold text-blue-600 mb-0.5">{exportData.tasks.length}</div>
                    <div className="text-xs text-blue-700 font-medium uppercase tracking-wide">Tasks</div>
                  </div>
                  
                  <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                    <div className="text-sm sm:text-2xl font-bold text-purple-600 truncate">{getTeamLabel(exportData.team).split(' ')[0]}</div>
                    <div className="text-xs text-purple-700 font-medium uppercase tracking-wide">Team</div>
                  </div>
                  
                  <div className="text-center p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                    <div className="text-lg font-bold text-green-600 mb-0.5">
                      {format(parseISO(exportData.expires_at), 'MMM d')}
                    </div>
                    <div className="text-xs text-green-700 font-medium uppercase tracking-wide">Expires</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Desktop Statistics */
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <Card>
                <CardContent className="p-3 sm:p-4">
              <div className="text-center">
                    <div className="text-lg sm:text-2xl font-bold text-blue-600">{exportData.tasks.length}</div>
                    <div className="text-xs sm:text-sm text-gray-600">Total Tasks</div>
          </div>
            </CardContent>
          </Card>
            
          <Card>
                <CardContent className="p-3 sm:p-4">
              <div className="text-center">
                    <div className="text-sm sm:text-2xl font-bold text-purple-600 truncate">{getTeamLabel(exportData.team)}</div>
                    <div className="text-xs sm:text-sm text-gray-600">Team</div>
                        </div>
            </CardContent>
          </Card>
          
          <Card>
                <CardContent className="p-3 sm:p-4">
              <div className="text-center">
                    <div className="text-lg sm:text-2xl font-bold text-green-600">
                  {format(parseISO(exportData.expires_at), 'MMM d')}
                </div>
                    <div className="text-xs sm:text-sm text-gray-600">Expires</div>
            </div>
            </CardContent>
          </Card>
            </div>
          )}
          </div>

        {/* Footer */}
        <div className={`mt-6 text-center ${isMobile ? 'px-4 pb-6' : ''}`}>
          {isMobile ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-50 to-purple-50 rounded-full -translate-y-8 translate-x-8 opacity-60"></div>
              
              <div className="relative">
                <div className="text-gray-400 mb-3">
                  <CalendarIcon className="h-7 w-7 mx-auto" />
                </div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Shared from{' '}
                  <a 
                    href="https://marketlube.in" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="relative inline-block text-blue-600 font-semibold hover:text-blue-800 transition-colors duration-300 group"
                  >
                    Marketlube
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out group-hover:w-full"></span>
                  </a>
                  {' '}PM Tool
                </p>
                <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
                  <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                  <span>Generated on {format(parseISO(exportData.created_at), 'MMM d, yyyy')}</span>
                  <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                </div>
                
                {/* Powered by section */}
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-gray-400 font-medium">Powered by Innovation</span>
                    <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">
          <p>This is a shared calendar view from Marketlube PM Tool</p>
          <p className="mt-1">
            Generated on {format(parseISO(exportData.created_at), 'MMMM d, yyyy \'at\' h:mm a')}
          </p>
            </div>
          )}
        </div>
      </div>

      {/* Hover Tooltip for Desktop - Shows overflow tasks */}
      {isTooltipVisible && hoveredDay && !isMobile && (
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
                {/* Show first 4 tasks as summary */}
                {getTasksForDate(parseISO(hoveredDay)).slice(0, 4).map((task, index) => {
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
                
                {getTasksForDate(parseISO(hoveredDay)).length > 4 && (
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <h5 className="text-xs font-medium text-gray-700 mb-2">Additional Tasks:</h5>
                  </div>
                )}
                
                {/* Show the overflow tasks with better styling */}
                {getTasksForDate(parseISO(hoveredDay)).slice(4).map((task, index) => {
                  const categoryConfig = getCategoryConfig(task.category || 'works');
                  return (
                    <div
                      key={task.id}
                      className={`group relative rounded-md border p-3 transition-all duration-200 hover:shadow-md cursor-default ${
                        categoryConfig.lightColor} ${categoryConfig.borderColor || 'border-gray-200'
                      } hover:${categoryConfig.lightColor.replace('bg-', 'bg-').replace('-100', '-200')}`}
                    >
                      {/* Category indicator stripe */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-md ${
                        categoryConfig.color
                      }`}></div>
                      
                      {/* Task content */}
                      <div className="pl-2">
                        <div className="flex items-start justify-between mb-2">
                          <h6 className="font-semibold text-sm text-gray-900 leading-tight">
                            {task.title}
                          </h6>
                        </div>
                        
                        {/* Task meta */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              categoryConfig.lightColor} ${categoryConfig.textColor
                            }`}>
                              <categoryConfig.icon className="h-3 w-3 mr-1" />
                              {categoryConfig.label}
                            </span>
                            
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              task.team === 'creative'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {task.team === 'creative' ? 'Creative' : 'Web'} Team
                            </span>
                          </div>
                        </div>
                        
                        {task.client_name && (
                          <div className="flex items-center space-x-1 mt-2">
                            <Building className="h-3 w-3 text-gray-500" />
                            <span className="text-xs text-gray-600 font-medium">{task.client_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Day Tasks Popup Modal */}
      {isDayPopupOpen && selectedDay && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full max-h-[85vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3">
              <div className="flex items-center justify-between text-white">
                <div>
                  <h4 className="font-bold text-sm">
                    {format(selectedDay, 'MMM d')}
                  </h4>
                  <p className="text-blue-100 text-xs">
                    {format(selectedDay, 'EEEE, yyyy')}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs bg-white/20 px-2 py-1 rounded-full font-medium">
                    {getTasksForDate(selectedDay).length} {getTasksForDate(selectedDay).length === 1 ? 'task' : 'tasks'}
                  </span>
                  <button
                    onClick={closeDayPopup}
                    className="p-1.5 hover:bg-white/20 rounded-full transition-colors touch-manipulation"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Task list */}
            <div className="max-h-80 overflow-y-auto">
              <div className="p-4 space-y-3">
                {getTasksForDate(selectedDay).map((task, index) => (
                  <div
                    key={task.id}
                    className={`relative rounded-lg border-l-4 p-3 shadow-sm ${
                      task.team === 'creative' 
                        ? 'border-purple-400 bg-purple-50/50' 
                        : 'border-blue-400 bg-blue-50/50'
                    }`}
                  >
                    {/* Task title */}
                    <h6 className="font-semibold text-sm text-gray-900 mb-2 leading-relaxed">
                      {task.title}
                    </h6>
                    
                    {/* Task meta info */}
                    <div className="flex flex-col space-y-1.5">
                      <div className="flex items-center space-x-1.5">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          task.team === 'creative'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                            task.team === 'creative' ? 'bg-purple-500' : 'bg-blue-500'
                          }`}></div>
                          {task.team === 'creative' ? 'Creative Team' : 'Web Team'}
                        </span>
                      </div>
                      
                      {task.client_name && (
                        <div className="flex items-center space-x-1.5">
                          <Building className="h-3 w-3 text-gray-500" />
                          <span className="text-xs text-gray-700 font-medium">
                            {task.client_name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Footer */}
            <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
              <button
                onClick={closeDayPopup}
                className="w-full flex items-center justify-center bg-gray-700 text-white py-2.5 px-4 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium touch-manipulation"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarExport; 