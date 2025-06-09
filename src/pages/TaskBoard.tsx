import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import TaskCard from '../components/tasks/TaskCard';
import NewTaskModal from '../components/tasks/NewTaskModal';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { useStatus } from '../contexts/StatusContext';
import { useNotification } from '../contexts/NotificationContext';
import { useSimpleRealtime } from '../contexts/SimpleRealtimeContext';
import { Task, StatusCode, TeamType } from '../types';
import { Plus, Wifi, WifiOff, ChevronLeft, ChevronRight, Search, Users, Building2, X, ChevronDown } from 'lucide-react';
import * as taskService from '../services/taskService';
import { useData } from '../contexts/DataContext';

interface Column {
  id: string;
  status: StatusCode;
  team: TeamType;
  name: string;
  color: string;
  tasks: Task[];
}

const TaskBoard: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const { getStatusesByTeam } = useStatus();
  const { showError, showSuccess } = useNotification();
  const { refreshTasks, isConnected, pausePolling, resumePolling } = useSimpleRealtime();
  
  // Get DataContext for user/client lookups and tasks
  const { getUserById, getClientById, tasks, isLoading } = useData();

  const [newTaskModalOpen, setNewTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [initialStatus, setInitialStatus] = useState<StatusCode | null>(null);
  const [teamFilter, setTeamFilter] = useState<TeamType>('creative');
  const [isDragging, setIsDragging] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<string>('');
  
  // Custom dropdown states
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);

  // Ref for horizontal scrolling
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const employeeDropdownRef = useRef<HTMLDivElement>(null);
  const clientDropdownRef = useRef<HTMLDivElement>(null);
  
  // Add scroll position preservation
  const scrollPositionRef = useRef<number>(0);

  // Store scroll position when scrolling
  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollPositionRef.current = scrollContainerRef.current.scrollLeft;
    }
  }, []);

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(event.target as Node)) {
        setIsEmployeeDropdownOpen(false);
      }
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setIsClientDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get unique employees and clients for filter dropdowns
  const { employees, clients } = useMemo(() => {
    const employeeSet = new Set<string>();
    const clientSet = new Set<string>();
    
    // Filter tasks by current team first, then extract unique employees/clients
    tasks.filter(task => task.team === teamFilter).forEach(task => {
      if (task.assigneeId) {
        const assignee = getUserById(task.assigneeId);
        if (assignee?.name) employeeSet.add(assignee.name);
      }
      if (task.clientId) {
        const client = getClientById(task.clientId);
        if (client?.name) clientSet.add(client.name);
      }
    });
    
    // Additionally, always include admin users in the employee list for both teams
    tasks.forEach(task => {
      if (task.assigneeId) {
        const assignee = getUserById(task.assigneeId);
        if (assignee?.name && assignee.role === 'admin') {
          employeeSet.add(assignee.name);
        }
      }
    });
    
    return {
      employees: Array.from(employeeSet).sort(),
      clients: Array.from(clientSet).sort()
    };
  }, [tasks, getUserById, getClientById, teamFilter]);

  // Get status columns for current team
  const statusColumns = useMemo(() => {
    const allColumns = getStatusesByTeam(teamFilter);
    
    if (!isAdmin && currentUser?.allowedStatuses) {
      return allColumns.filter(column => 
        currentUser.allowedStatuses?.includes(column.id) || false
      );
    }
    
    return allColumns;
  }, [getStatusesByTeam, teamFilter, isAdmin, currentUser?.allowedStatuses]);

  // Filter and organize tasks into columns
  const columns = useMemo(() => {
    if (statusColumns.length === 0) return [];
    
    // First filter tasks by team
    let filteredTasks = tasks.filter(task => task.team === teamFilter);
    
    // For normal users, only show tasks assigned to them
    if (!isAdmin && currentUser?.id) {
      filteredTasks = filteredTasks.filter(task => task.assigneeId === currentUser.id);
    }
    
    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filteredTasks = filteredTasks.filter(task => {
        const assignee = task.assigneeId ? getUserById(task.assigneeId) : null;
        const client = task.clientId ? getClientById(task.clientId) : null;
        
        return task.title.toLowerCase().includes(search) ||
          task.description?.toLowerCase().includes(search) ||
          assignee?.name.toLowerCase().includes(search) ||
          client?.name.toLowerCase().includes(search);
      });
    }
    
    // Apply employee filter (only for admins since normal users see only their tasks)
    if (isAdmin && selectedEmployee) {
      filteredTasks = filteredTasks.filter(task => {
        const assignee = task.assigneeId ? getUserById(task.assigneeId) : null;
        return assignee?.name === selectedEmployee;
      });
    }
    
    // Apply client filter  
    if (selectedClient) {
      filteredTasks = filteredTasks.filter(task => {
        const client = task.clientId ? getClientById(task.clientId) : null;
        return client?.name === selectedClient;
      });
    }

    const columnMap: Column[] = statusColumns.map(column => ({
      id: `${column.team}_${column.id}`,
      status: column.id,
      team: column.team,
      name: column.name,
      color: column.color,
      tasks: []
    }));
    
    // Distribute filtered tasks to columns
    filteredTasks.forEach(task => {
      if (!isAdmin && currentUser?.allowedStatuses && !currentUser.allowedStatuses.includes(task.status)) {
        return;
      }
      
      const column = columnMap.find(
        col => col.team === task.team && col.status === task.status
      );
      
      if (column) {
        column.tasks.push(task);
      }
    });
    
    return columnMap;
  }, [statusColumns, tasks, teamFilter, isAdmin, currentUser?.allowedStatuses, currentUser?.id, searchTerm, selectedEmployee, selectedClient, getUserById, getClientById]);

  // Restore scroll position after re-renders (moved here after columns is defined)
  useEffect(() => {
    if (scrollContainerRef.current && scrollPositionRef.current > 0) {
      scrollContainerRef.current.scrollLeft = scrollPositionRef.current;
    }
  }, [columns, tasks]); // Restore when data changes

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchTerm('');
    if (isAdmin) {
      setSelectedEmployee('');
    }
    setSelectedClient('');
  }, [isAdmin]);

  // Check if any filters are active
  const hasActiveFilters = searchTerm || selectedClient || (isAdmin && selectedEmployee);

  // Custom dropdown handlers
  const handleEmployeeSelect = useCallback((employee: string) => {
    setSelectedEmployee(employee);
    setIsEmployeeDropdownOpen(false);
  }, []);

  const handleClientSelect = useCallback((client: string) => {
    setSelectedClient(client);
    setIsClientDropdownOpen(false);
  }, []);
  
  // Scroll handlers
  const scrollLeft = useCallback(() => {
    scrollContainerRef.current?.scrollBy({ left: -350, behavior: 'smooth' });
  }, []);
  
  const scrollRight = useCallback(() => {
    scrollContainerRef.current?.scrollBy({ left: 350, behavior: 'smooth' });
  }, []);
  
  // Drag handlers
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);
  
  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    
    setIsDragging(false);
    
    if (!destination || (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )) {
      return;
    }
    
    const task = tasks.find(t => t.id === draggableId);
    if (!task) {
      showError('Task not found');
      return;
    }
    
    const targetColumn = columns.find(col => col.id === destination.droppableId);
    if (!targetColumn) {
      showError('Invalid drop target');
      return;
    }
    
    if (task.team !== targetColumn.team) {
      showError('Cannot move tasks between different teams');
      return;
    }
    
    // Check if current user has permission to move tasks to this status
    if (!isAdmin && currentUser?.allowedStatuses && !currentUser.allowedStatuses.includes(targetColumn.status)) {
      showError(`You don't have permission to move tasks to "${targetColumn.name}" status`);
      return;
    }
    
    // Check if the assigned user has permission to access the target status
    if (task.assigneeId) {
      const assignee = getUserById(task.assigneeId);
      if (assignee && assignee.role !== 'admin') {
        if (!assignee.allowedStatuses?.includes(targetColumn.status)) {
          showError(`${assignee.name} doesn't have permission to access "${targetColumn.name}" status. Please reassign the task or contact an administrator.`);
          return;
        }
      }
    }
    
    if (task.status === targetColumn.status) return;
    
    try {
      console.log(`🔄 [TaskBoard] Moving task ${task.id} to ${targetColumn.status}`);
      
      await taskService.updateTaskStatus(task.id, targetColumn.status);
      
      console.log(`✅ [TaskBoard] Task moved successfully`);
      showSuccess(`Task moved to ${targetColumn.name}`);
      
      // Trigger refresh
      refreshTasks();
      
    } catch (error) {
      console.error('Failed to update task status:', error);
      showError('Failed to update task status. Please try again.');
    }
  }, [tasks, columns, isAdmin, currentUser?.allowedStatuses, showError, showSuccess, refreshTasks, getUserById]);

  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task);
    setInitialStatus(null);
    setNewTaskModalOpen(true);
  }, []);

  const handleTaskDelete = useCallback(async (taskId: string) => {
    try {
      console.log(`🗑️ [TaskBoard] Deleting task: ${taskId}`);
      await taskService.deleteTask(taskId);
      showSuccess('Task deleted successfully');
      refreshTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      showError('Failed to delete task');
    }
  }, [showSuccess, showError, refreshTasks]);

  const handleNewTaskInStatus = useCallback((statusId: StatusCode) => {
    setSelectedTask(null);
    setInitialStatus(statusId);
    setNewTaskModalOpen(true);
  }, []);

  const handleCloseTaskModal = useCallback(() => {
    setNewTaskModalOpen(false);
    setSelectedTask(null);
    setInitialStatus(null);
  }, []);

  // Prevent modal state from being affected by frequent re-renders
  useEffect(() => {
    if (newTaskModalOpen) {
      console.log('🎯 [TaskBoard] New Task Modal opened - preserving state');
      // Pause polling to prevent interference with modal state
      pausePolling('new-task-modal');
    } else {
      // Resume polling when modal closes
      resumePolling('new-task-modal');
    }
    
    // Cleanup: ensure polling is resumed if component unmounts while modal is open
    return () => {
      if (newTaskModalOpen) {
        resumePolling('new-task-modal');
      }
    };
  }, [newTaskModalOpen, pausePolling, resumePolling]);

  if (isLoading) {
    return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
          <p className="mt-2 text-gray-600">Loading tasks...</p>
      </div>
    </div>
    );
  }

  const filteredTaskCount = columns.reduce((sum, col) => sum + col.tasks.length, 0);
  const totalTaskCount = tasks.filter(t => t.team === teamFilter).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {isAdmin ? 'Task Board' : 'My Tasks'}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {isAdmin ? (
              <>
                {hasActiveFilters ? `${filteredTaskCount} of ${totalTaskCount}` : totalTaskCount} tasks • {columns.length} columns
                {isConnected ? (
                  <span className="text-green-600 ml-2 inline-flex">
                    <Wifi className="w-4 h-4" />
                  </span>
                ) : (
                  <span className="text-red-600 ml-2 inline-flex">
                    <WifiOff className="w-4 h-4" />
                  </span>
                )}
              </>
            ) : (
              <>
                {hasActiveFilters ? `${filteredTaskCount} of ${totalTaskCount}` : totalTaskCount} personal tasks • {columns.length} columns
                {isConnected ? (
                  <span className="text-green-600 ml-2 inline-flex">
                    <Wifi className="w-4 h-4" />
                  </span>
                ) : (
                  <span className="text-red-600 ml-2 inline-flex">
                    <WifiOff className="w-4 h-4" />
                  </span>
                )}
              </>
            )}
          </p>
        </div>
        </div>
        
      {/* Minimal Modern Filter Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-5">
          <div className="flex items-center justify-between gap-8">
            {/* Team Toggle - Minimal Design */}
            <div className="flex items-center gap-8">
              <div className="relative">
                <div className="flex bg-gray-50 rounded-xl p-1">
                  <button
                    onClick={() => setTeamFilter('creative')}
                    className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ease-out ${
                      teamFilter === 'creative'
                        ? 'bg-blue-500 text-white shadow-md transform translate-y-[-1px]'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Creative
                  </button>
                  <button
                    onClick={() => setTeamFilter('web')}
                    className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ease-out ${
                      teamFilter === 'web'
                        ? 'bg-blue-500 text-white shadow-md transform translate-y-[-1px]'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Web
                  </button>
        </div>
      </div>
      
              {/* Minimal Divider */}
              <div className="h-5 w-px bg-gray-200"></div>

              {/* Filter Controls - Minimal Design */}
              <div className="flex items-center gap-3">
                {/* Search Bar - Minimal */}
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 transition-colors duration-200 group-focus-within:text-gray-600" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-72 pl-10 pr-8 py-2.5 text-sm bg-gray-50 border-0 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:shadow-sm placeholder-gray-400 transition-all duration-200"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-md transition-colors duration-200"
                    >
                      <X className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  )}
                </div>

                {/* Employee Dropdown - Only for Admins */}
                {isAdmin && (
                  <div className="relative" ref={employeeDropdownRef}>
                    <button
                      onClick={() => {
                        setIsEmployeeDropdownOpen(!isEmployeeDropdownOpen);
                        setIsClientDropdownOpen(false);
                      }}
                      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border transition-all duration-200 min-w-[140px] ${
                        selectedEmployee 
                          ? 'bg-blue-50 border-blue-200 text-blue-700' 
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span className="truncate">
                        {selectedEmployee || `${teamFilter === 'creative' ? 'Creative' : 'Web'} Staff`}
                      </span>
                      <ChevronDown className={`w-4 h-4 ml-auto transition-transform duration-200 ${isEmployeeDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {isEmployeeDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-100 z-[9999] max-h-48 overflow-y-auto animate-in slide-in-from-top-2 duration-200">
                        <div className="p-1">
                          <button
                            onClick={() => handleEmployeeSelect('')}
                            className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors duration-150 ${
                              !selectedEmployee 
                                ? 'bg-blue-50 text-blue-700' 
                                : 'hover:bg-gray-50 text-gray-700'
                            }`}
                          >
                            All {teamFilter === 'creative' ? 'Creative' : 'Web'} Staff
                          </button>
                          {employees.map(employee => (
                            <button
                              key={employee}
                              onClick={() => handleEmployeeSelect(employee)}
                              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors duration-150 ${
                                selectedEmployee === employee 
                                  ? 'bg-blue-50 text-blue-700' 
                                  : 'hover:bg-gray-50 text-gray-700'
                              }`}
                            >
                              {employee}
                            </button>
                          ))}
                </div>
              </div>
                  )}
                </div>
                )}

                {/* Client Dropdown - Team Oriented & Minimal */}
                <div className="relative" ref={clientDropdownRef}>
              <button 
                    onClick={() => {
                      setIsClientDropdownOpen(!isClientDropdownOpen);
                      setIsEmployeeDropdownOpen(false);
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border transition-all duration-200 min-w-[140px] ${
                      selectedClient 
                        ? 'bg-orange-50 border-orange-200 text-orange-700' 
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span className="truncate">
                      {selectedClient || `${teamFilter === 'creative' ? 'Creative' : 'Web'} Clients`}
                    </span>
                    <ChevronDown className={`w-4 h-4 ml-auto transition-transform duration-200 ${isClientDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
                  
                  {isClientDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-100 z-[9999] max-h-48 overflow-y-auto animate-in slide-in-from-top-2 duration-200">
                      <div className="p-1">
              <button 
                          onClick={() => handleClientSelect('')}
                          className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors duration-150 ${
                            !selectedClient 
                              ? 'bg-orange-50 text-orange-700' 
                              : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          All {teamFilter === 'creative' ? 'Creative' : 'Web'} Clients
              </button>
                        {clients.map(client => (
              <button 
                            key={client}
                            onClick={() => handleClientSelect(client)}
                            className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors duration-150 ${
                              selectedClient === client 
                                ? 'bg-orange-50 text-orange-700' 
                                : 'hover:bg-gray-50 text-gray-700'
                            }`}
                          >
                            {client}
              </button>
                        ))}
                      </div>
            </div>
          )}
                </div>
              </div>
            </div>

            {/* Right side - Action Buttons */}
            <div className="flex items-center gap-3">
              {/* Clear Filter Indicator */}
              {hasActiveFilters && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    {[searchTerm && 'Search', (isAdmin && selectedEmployee) && 'Staff', selectedClient && 'Client'].filter(Boolean).length} active
                  </div>
              <button 
                    onClick={clearFilters}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
              >
                    <X className="w-3 h-3" />
                    Clear
              </button>
            </div>
          )}
              
              {/* Action Buttons - Only for Admins */}
              {isAdmin && (
              <button 
                  onClick={() => setNewTaskModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:shadow-md"
              >
                  <Plus className="w-4 h-4" />
                  Add Task
              </button>
          )}
        </div>
            </div>
        </div>
      </div>
      
      {/* Task Board with Horizontal Scrolling */}
      <div className="relative">
        {/* Scroll buttons */}
        {columns.length > 3 && (
          <>
            <button 
              onClick={scrollLeft} 
              className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-white rounded-full p-1.5 shadow-md border border-gray-200 hover:bg-gray-50 transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <button 
              onClick={scrollRight} 
              className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-white rounded-full p-1.5 shadow-md border border-gray-200 hover:bg-gray-50 transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </>
        )}
        
        <DragDropContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
          {columns.length > 0 ? (
            <div className="overflow-x-auto">
          <div 
            ref={scrollContainerRef} 
            className="flex gap-5 pb-4"
            onScroll={handleScroll}
            style={{ 
              minWidth: `${columns.length * 350}px`,
              width: 'max-content'
            }}
          >
              {columns.map(column => (
                  <div key={column.id} className="w-[330px] flex-shrink-0">
                    <Card className="h-full flex flex-col">
                      <CardHeader className="pb-2 border-b border-gray-100 flex-shrink-0">
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center min-w-0 flex-1">
                            <div
                              className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                              style={{ backgroundColor: column.color }}
                            />
                            <span className="truncate text-sm font-medium">{column.name}</span>
                          </div>
                          <span className="bg-gray-100 text-gray-700 text-xs font-medium rounded-full px-2.5 py-1 ml-2 flex-shrink-0">
                            {column.tasks.length}
              </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 flex-1 flex flex-col min-h-0">
                        <Droppable droppableId={column.id} type="TASK">
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`flex-1 flex flex-col min-h-[200px] transition-colors duration-150 ${
                                snapshot.isDraggingOver ? 'bg-blue-50/50 rounded-md' : ''
                              }`}
                            >
                              {column.tasks.length === 0 ? (
                                <div className="flex items-center justify-center h-20 border-2 border-dashed border-gray-200 rounded-md mt-2">
                                  <p className="text-sm text-gray-500">
                                    {hasActiveFilters 
                                      ? 'No matching tasks' 
                                      : isAdmin 
                                        ? 'No tasks' 
                                        : 'No personal tasks'
                                    }
                                  </p>
            </div>
                              ) : (
                                <div className="flex-1 space-y-2 min-h-0">
                                  {column.tasks.map((task, index) => (
                                    <Draggable key={task.id} draggableId={task.id} index={index}>
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                          className={`mb-3 transform select-none transition-all duration-200 ${
                                            snapshot.isDragging 
                                              ? 'z-50 shadow-xl opacity-95 scale-[1.02] rotate-1' 
                                              : 'hover:shadow-md'
                                          }`}
            style={{ 
                                            ...provided.draggableProps.style,
                                            willChange: snapshot.isDragging ? 'transform' : 'auto',
                                          }}
                                        >
                                          <TaskCard
                                            task={task}
                                            isDragging={snapshot.isDragging}
                                            onClick={isAdmin ? () => handleTaskClick(task) : undefined}
                                            onDelete={isAdmin ? handleTaskDelete : undefined}
                                          />
                                        </div>
                                      )}
                                    </Draggable>
              ))}
                    </div>
                              )}
                              {provided.placeholder}
                              
                              {/* Add New Task Button - Only for Admins */}
                              {isAdmin ? (
                                <div className="mt-4 flex justify-center flex-shrink-0">
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    icon={Plus}
                                    onClick={() => handleNewTaskInStatus(column.status)}
                                    className="w-full bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 hover:text-gray-800 transition-all duration-200"
                                  >
                                    <span className="text-xs font-medium">New Task</span>
                                  </Button>
                                </div>
                              ) : (
                                <div className="mt-4 flex justify-center flex-shrink-0">
                                  <div className="text-xs text-gray-400 text-center py-2">
                                    Only admins can create tasks
                                  </div>
                      </div>
                    )}
              </div>
                          )}
                        </Droppable>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
                    </div>
          ) : (
            <div className="flex justify-center items-center py-10 border-2 border-dashed border-gray-200 rounded-lg">
              <p className="text-gray-500">
                {hasActiveFilters 
                  ? `No tasks found for ${teamFilter} team matching your filters` 
                  : isAdmin
                    ? `No columns found for ${teamFilter} team`
                    : `No personal tasks found for ${teamFilter} team`
                }
              </p>
            </div>
          )}
        </DragDropContext>
      </div>
      
      {/* New Task Modal - Only for Admins */}
      {isAdmin && newTaskModalOpen && (
      <NewTaskModal
        isOpen={newTaskModalOpen}
        onClose={handleCloseTaskModal}
        initialData={selectedTask ? selectedTask : initialStatus ? { status: initialStatus, team: teamFilter } : { team: teamFilter }}
      />
      )}
    </div>
  );
};

export default TaskBoard;