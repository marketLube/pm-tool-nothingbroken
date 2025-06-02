import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useStatus } from '../../contexts/StatusContext';
import { useAuth } from '../../contexts/AuthContext';
import TaskStats from '../../components/dashboard/TaskStats';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import TaskCard from '../../components/tasks/TaskCard';
import { 
  Users, 
  PieChart, 
  CheckCircle, 
  Clock, 
  Calendar, 
  TrendingUp, 
  Film, 
  CameraIcon,
  Edit,
  Briefcase, 
  Plus,
  X,
  Filter,
  Building,
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  BarChart3,
  Target,
  Activity,
  Search,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import NewTaskModal from '../../components/tasks/NewTaskModal';
import { Task, User } from '../../types';
import PermissionGuard from '../../components/auth/PermissionGuard';
import { getIndiaDate } from '../../utils/timezone';
import { useDebounce } from '../../hooks/useDebounce';

const CreativeTeam: React.FC = () => {
  const { 
    getUsersByTeam, 
    getReportsByUser, 
    getClientsByTeam, 
    getClientById, 
    searchTasks,
    searchUsers
  } = useData();
  const { getStatusesByTeam } = useStatus();
  const { currentUser } = useAuth();
  
  // Core state
  const [newTaskModalOpen, setNewTaskModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Database search state
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Debounced search query to optimize database calls
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // Team data
  const teamMembers = getUsersByTeam('creative');
  const teamStatuses = getStatusesByTeam('creative');
  const teamClients = getClientsByTeam('creative');
  
  // Database search effect - replaces all client-side filtering
  useEffect(() => {
    const performSearch = async () => {
      setIsSearching(true);
      try {
        // Build search filters based on current state
        const filters = {
          team: 'creative' as const,
          searchQuery: debouncedSearchQuery || undefined,
          clientId: selectedClient || undefined,
          assigneeId: selectedEmployee?.id || undefined,
          sortBy: 'createdDate' as const
        };

        const searchResults = await searchTasks(filters);
        setFilteredTasks(searchResults);
        
        console.log(`[CreativeTeam Database Search] Found ${searchResults.length} tasks`);
      } catch (error) {
        console.error('Error performing database search:', error);
        setFilteredTasks([]);
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [
    debouncedSearchQuery,
    selectedClient,
    selectedEmployee?.id,
    searchTasks
  ]);

  // Group tasks by status
  const tasksByStatus = teamStatuses.reduce((acc, status) => {
    acc[status.id] = filteredTasks.filter(task => task.status === status.id);
    return acc;
  }, {} as Record<string, typeof filteredTasks>);

  // Group tasks by client
  const tasksByClient = Object.entries(
    filteredTasks.reduce((acc, task) => {
      const clientId = task.clientId || 'unassigned';
      if (!acc[clientId]) {
        acc[clientId] = [];
      }
      acc[clientId].push(task);
      return acc;
    }, {} as Record<string, typeof filteredTasks>)
  ).map(([clientId, tasks]) => ({
    client: clientId !== 'unassigned' ? getClientById(clientId) : null,
    clientId,
    tasks,
    activeTasks: tasks.filter(task => task.status !== 'approved').length,
    completedTasks: tasks.filter(task => task.status === 'approved').length
  })).sort((a, b) => b.activeTasks - a.activeTasks);

  // Member completion rates
  const getMemberCompletionRate = (userId: string) => {
    const userTasks = filteredTasks.filter(task => task.assigneeId === userId);
    if (userTasks.length === 0) return 0;
    
    const completedTasks = userTasks.filter(task => task.status === 'approved').length;
    return Math.round((completedTasks / userTasks.length) * 100);
  };

  // Get recent reports
  const getMemberRecentReports = (userId: string) => {
    const reports = getReportsByUser(userId);
    return reports.sort((a, b) => {
      const dateA = new Date(b.date);
      const dateB = new Date(a.date);
      return dateA.getTime() - dateB.getTime();
    }).slice(0, 5);
  };

  // Handle employee selection
  const handleEmployeeClick = (employee: User) => {
    if (selectedEmployee && selectedEmployee.id === employee.id) {
      setSelectedEmployee(null);
    } else {
      setSelectedEmployee(employee);
      setSelectedClient(null);
    }
  };

  // Handle client selection
  const handleClientClick = (clientId: string) => {
    if (selectedClient === clientId) {
      setSelectedClient(null);
    } else {
      setSelectedClient(clientId);
      setSelectedEmployee(null);
    }
    setClientDropdownOpen(false);
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedEmployee(null);
    setSelectedClient(null);
    setSearchQuery('');
  };

  // Toggle client dropdown
  const toggleClientDropdown = () => {
    setClientDropdownOpen(!clientDropdownOpen);
  };

  // Handle task deletion
  const handleTaskDelete = (taskId: string) => {
    // The task will be automatically removed from the UI via the DataContext
    // No additional action needed here as the context will update the state
  };
  
  // Team performance stats
  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter(task => task.status === 'approved').length;
  const inProgressTasks = filteredTasks.filter(task => task.status !== 'not_started' && task.status !== 'approved').length;
  const notStartedTasks = filteredTasks.filter(task => task.status === 'not_started').length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  // Get active tasks (filtered by status, not approved)
  const activeTasks = filteredTasks.filter(task => task.status !== 'approved');
  
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };
  
  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };
  
  const getUpcomingTasks = () => {
    const today = getIndiaDate();
    return filteredTasks
      .filter(task => 
        selectedEmployee && 
        task.assigneeId === selectedEmployee.id && 
        task.status !== 'done' && 
        task.dueDate >= today
      )
      .sort((a, b) => {
        const dateA = new Date(a.dueDate);
        const dateB = new Date(b.dueDate);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 5);
  };
  
  // Sort tasks by due date
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [filteredTasks]);

  // Sort overdue tasks by due date
  const sortedOverdueTasks = useMemo(() => {
    return [...filteredTasks].filter(task => {
      const today = getIndiaDate();
      const dueDate = task.dueDate;
      return dueDate < today && task.status !== 'approved' && task.status !== 'done';
    }).sort((a, b) => {
      const dateA = new Date(a.dueDate);
      const dateB = new Date(b.dueDate);
      return dateA.getTime() - dateB.getTime();
    });
  }, [filteredTasks]);
  
  return (
    <div className="space-y-6">
      {/* Header with Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
        <div className="flex items-center space-x-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search creative tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent w-64"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-500 h-4 w-4 animate-spin" />
            )}
          </div>
          
          {/* Active Filters */}
          <div className="flex items-center">
            {selectedClient && (
              <Badge variant="primary" className="mr-2">
                {getClientById(selectedClient)?.name}
                <X 
                  className="h-3 w-3 ml-1 cursor-pointer" 
                  onClick={() => setSelectedClient(null)}
                />
              </Badge>
            )}
            {selectedEmployee && (
              <Badge variant="info" className="mr-2">
                {selectedEmployee.name}
                <X 
                  className="h-3 w-3 ml-1 cursor-pointer" 
                  onClick={() => setSelectedEmployee(null)}
                />
              </Badge>
            )}
            {(selectedClient || selectedEmployee || searchQuery) && (
              <Button
                variant="secondary"
                size="sm"
                onClick={clearFilters}
                className="text-xs"
              >
                Clear All
              </Button>
            )}
          </div>
        </div>
        
        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={() => setNewTaskModalOpen(true)}
          className="shadow-md hover:shadow-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 transform hover:scale-105 transition-all duration-300"
        >
          <span className="text-sm font-medium text-white">New Creative Task</span>
        </Button>
      </div>
      
      {/* Team Status Overview - Horizontal Scrollable */}
      <div className="relative">
        <div className="mb-3">
          <h2 className="text-lg font-bold text-gray-900 flex items-center">
            <PieChart className="h-5 w-5 mr-2 text-purple-600" />
            Task Status Overview
          </h2>
          <p className="text-sm text-gray-500">Scroll to see all statuses in the pipeline</p>
        </div>
      
        <button 
          onClick={scrollLeft}
          className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-white rounded-full p-1.5 shadow-md hover:shadow-lg focus:outline-none border border-gray-200 hover:bg-gray-50 transition-colors"
          aria-label="Scroll left"
        >
          <ArrowLeft className="h-5 w-5 text-purple-600" />
        </button>
        
        <div 
          ref={scrollContainerRef}
          className="flex overflow-x-auto py-3 px-8 scrollbar-hide space-x-4 snap-x"
          style={{ 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none',
            minHeight: '176px' /* Ensure consistent height even when empty */
          }}
        >
          {teamStatuses.length > 0 ? (
            teamStatuses.map(status => {
              const tasksWithStatus = tasksByStatus[status.id] || [];
              const count = tasksWithStatus.length;
              
              return (
                <div key={status.id} className="snap-start flex-shrink-0 w-52">
                  <Card 
                    className="status-card group h-[160px]"
                    style={{ 
                      borderTop: `4px solid ${status.color || '#94a3b8'}`,
                      background: `linear-gradient(to bottom, ${status.color || '#94a3b8'}15, white)`,
                      boxShadow: `0 4px 6px -1px ${status.color || '#94a3b8'}10, 0 2px 4px -2px ${status.color || '#94a3b8'}10`
                    }}
                  >
                    <CardContent className="p-4 flex flex-col h-full">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="h-10">
                            <p className="text-sm font-medium text-gray-700 line-clamp-2">{status.name}</p>
                          </div>
                          <h3 className="text-2xl font-bold text-gray-900 mt-1">{count}</h3>
                        </div>
                        <div 
                          className="h-11 w-11 rounded-full flex items-center justify-center shadow-sm transition-transform duration-300 hover:scale-110 status-icon"
                          style={{ backgroundColor: `${status.color || '#94a3b8'}20` }}
                        >
                          {status.id === 'approved' ? (
                            <CheckCircle className="h-5 w-5" style={{ color: status.color || '#94a3b8' }} />
                          ) : status.id === 'not_started' ? (
                            <Clock className="h-5 w-5" style={{ color: status.color || '#94a3b8' }} />
                          ) : (
                            <Edit className="h-5 w-5" style={{ color: status.color || '#94a3b8' }} />
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-auto pt-3">
                        <p className="text-xs font-medium text-gray-600 mb-2 h-8">
                          {count > 0 
                            ? `${Math.round((count / totalTasks) * 100)}% of total tasks` 
                            : 'No tasks in this status'}
                        </p>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="status-progress"
                            style={{ 
                              width: count > 0 && totalTasks > 0 ? `${Math.round((count / totalTasks) * 100)}%` : '0%',
                              backgroundColor: status.color || '#94a3b8',
                              boxShadow: count > 0 ? `0 0 4px ${status.color || '#94a3b8'}80` : 'none',
                              opacity: count > 0 ? 1 : 0.3
                            }}
                          ></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })
          ) : (
            <div className="w-full text-center py-6">
              <p className="text-gray-500">No statuses configured for this team</p>
            </div>
          )}
        </div>
        
        <button 
          onClick={scrollRight}
          className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-white rounded-full p-1.5 shadow-md hover:shadow-lg focus:outline-none border border-gray-200 hover:bg-gray-50 transition-colors"
          aria-label="Scroll right"
        >
          <ArrowRight className="h-5 w-5 text-purple-600" />
        </button>
      </div>
      
            {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column - Team Members */}
        <div className="lg:col-span-1">
          {/* Team Members */}
          <Card className="shadow-md">
            <CardHeader className="pb-2 border-b border-gray-100">
              <CardTitle className="text-lg font-bold flex items-center text-gray-900">
                <Users className="h-5 w-5 mr-2 text-purple-600" />
                Team Members
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-gray-100">
                {teamMembers.map(member => {
                  const completionRate = getMemberCompletionRate(member.id);
                  const memberTasks = filteredTasks.filter(task => task.assigneeId === member.id);
                  const activeTasks = memberTasks.filter(task => task.status !== 'approved').length;
                  
                  return (
                    <li 
                      key={member.id} 
                      className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                        selectedEmployee?.id === member.id ? 'bg-purple-50' : ''
                      }`}
                      onClick={() => handleEmployeeClick(member)}
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar 
                          src={member.avatar} 
                          name={member.name} 
                          size="md" 
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate hover:text-purple-700">{member.name}</p>
                          <p className="text-xs text-gray-500 truncate">{member.role === 'admin' ? 'Admin' : member.role === 'manager' ? 'Team Lead' : 'Team Member'}</p>
                        </div>
                        <div className="inline-flex items-center bg-purple-50 px-2.5 py-0.5 rounded-full text-xs font-medium text-purple-800">
                          {activeTasks} Active
                        </div>
                      </div>
                      
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-purple-600 h-1.5 rounded-full"
                          style={{ width: `${completionRate}%` }}
                        ></div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </div>
        
        {/* Right Column - Current Projects */}
        <div className="lg:col-span-3">
          <Card className="shadow-md">
            <CardHeader className="pb-2 border-b border-gray-100">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <CardTitle className="text-lg font-bold flex items-center text-gray-900">
                  <Film className="h-5 w-5 mr-2 text-purple-600" />
                  {selectedEmployee ? (
                    <span>{selectedEmployee.name}'s Projects</span>
                  ) : selectedClient ? (
                    <span>{getClientById(selectedClient)?.name}'s Projects</span>
                  ) : (
                    <span>Current Projects</span>
                  )}
                </CardTitle>
                
                <div className="flex items-center gap-3">
                  {/* Client Dropdown */}
                  <div className="relative">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={toggleClientDropdown}
                      className="flex items-center justify-center px-3 py-2 rounded-md bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 hover:border-purple-300 shadow-sm hover:shadow"
                    >
                      <div className="flex items-center space-x-1.5">
                        <Building className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium text-purple-700">
                          {selectedClient ? getClientById(selectedClient)?.name : 'All Clients'}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 text-purple-500" />
                      </div>
                    </Button>
                    
                    {clientDropdownOpen && (
                      <div className="absolute z-10 mt-1 right-0 w-56 bg-white rounded-md shadow-lg py-1 border border-gray-200">
                        <div className="py-1">
                          <button
                            onClick={() => handleClientClick('')}
                            className={`w-full text-left px-4 py-2 text-sm ${
                              !selectedClient 
                                ? 'bg-purple-50 text-purple-700 font-medium' 
                                : 'text-gray-700 hover:bg-purple-50 hover:text-purple-700'
                            }`}
                          >
                            All Clients
                          </button>
                          {teamClients.map(client => (
                            <button
                              key={client.id}
                              onClick={() => handleClientClick(client.id)}
                              className={`w-full text-left px-4 py-2 text-sm ${
                                selectedClient === client.id 
                                  ? 'bg-purple-50 text-purple-700 font-medium' 
                                  : 'text-gray-700 hover:bg-purple-50 hover:text-purple-700'
                              }`}
                            >
                              {client.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {(selectedEmployee || selectedClient) && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={clearFilters}
                      className="flex items-center justify-center px-3 py-2 rounded-md bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 hover:border-red-300 shadow-sm hover:shadow"
                    >
                      <div className="flex items-center space-x-1.5">
                        <X className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-medium text-red-700">Clear Filter</span>
                      </div>
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {activeTasks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeTasks.map(task => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      onDelete={handleTaskDelete}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <CameraIcon className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-4 text-gray-500">
                    {selectedEmployee ? `No active projects assigned to ${selectedEmployee.name}` : 
                     selectedClient ? `No active projects for ${getClientById(selectedClient)?.name}` : 
                     'No active creative projects'}
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Plus}
                    onClick={() => setNewTaskModalOpen(true)}
                    className="mt-4 shadow-md hover:shadow-lg"
                  >
                    <span className="text-sm font-medium">Create a Project</span>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      <NewTaskModal
        isOpen={newTaskModalOpen}
        onClose={() => setNewTaskModalOpen(false)}
        initialData={{ team: 'creative' }}
      />
    </div>
  );
};

export default CreativeTeam;