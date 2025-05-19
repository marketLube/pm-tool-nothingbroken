import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult, DraggableProvided, DraggableStateSnapshot, DroppableProvided, DroppableStateSnapshot, ResponderProvided } from 'react-beautiful-dnd';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import TaskCard from '../components/tasks/TaskCard';
import Button from '../components/ui/Button';
import ButtonGroup from '../components/ui/ButtonGroup';
import NewTaskModal from '../components/tasks/NewTaskModal';
import NewClientModal from '../components/clients/NewClientModal';
import { useData } from '../contexts/DataContext';
import { useStatus } from '../contexts/StatusContext';
import { useAuth } from '../contexts/AuthContext';
import { Task, Status, TeamType } from '../types';
import { Plus, Search, Filter, Users, Briefcase, ChevronLeft, ChevronRight, ChevronDown, Palette, Code } from 'lucide-react';
import Avatar from '../components/ui/Avatar';
import { Status as StatusObject } from '../contexts/StatusContext';

// Column type to help with type safety
interface Column {
  id: string;
  status: Status;
  team: TeamType;
  name: string;
  color: string;
  tasks: Task[];
}

// IMPORTANT: Using a fixed ID to ensure the DragDropContext doesn't remount
const BOARD_ID = 'task-board-fixed';

const TaskBoard: React.FC = () => {
  // ---------------------------------------------------
  // Context and state hooks
  // ---------------------------------------------------
  const { tasks: allTasks, updateTaskStatus, getTasksByTeam, getTasksByUser, clients, users, getClientById } = useData();
  const { getStatusesByTeam } = useStatus();
  const { currentUser, isAdmin } = useAuth();
  
  // UI state
  const [newTaskModalOpen, setNewTaskModalOpen] = useState(false);
  const [newClientModalOpen, setNewClientModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [initialStatus, setInitialStatus] = useState<Status | null>(null);
  
  // Filtering state - default to creative team
  const [viewMode, setViewMode] = useState<'all' | 'my-tasks'>('all');
  const [teamFilter, setTeamFilter] = useState<TeamType>('creative');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Scrolling state
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  
  // Enhanced initialization and drag operation state
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [columnsReady, setColumnsReady] = useState(false);
  const initAttemptedRef = useRef(false);
  const columnsRef = useRef<Column[]>([]);
  const forceUpdateRef = useRef(0);
  
  // ---------------------------------------------------
  // Derived state and memoization
  // ---------------------------------------------------
  
  // Team-specific users and clients
  const activeUsers = useMemo(() => 
    users.filter(user => user.isActive), 
    [users]
  );
  
  const filteredUsers = useMemo(() => 
    activeUsers.filter(user => user.team === teamFilter || user.role === 'admin'),
    [activeUsers, teamFilter]
  );
  
  const filteredClients = useMemo(() => 
    clients.filter(client => {
      return allTasks.some(task => 
        task.clientId === client.id && task.team === teamFilter
      );
    }),
    [clients, allTasks, teamFilter]
  );
  
  // Current team status columns
  const statusColumns = useMemo(() => {
    const columns = getStatusesByTeam(teamFilter);
    console.log(`[Status Columns] Loaded ${columns.length} columns for ${teamFilter} team`);
    return columns;
  }, [getStatusesByTeam, teamFilter]);
  
  // Filtered tasks based on view mode and filters
  const filteredTasks = useMemo(() => {
    let filtered: Task[];
    
    // Step 1: Filter by view mode
    if (viewMode === 'my-tasks' && currentUser) {
      filtered = getTasksByUser(currentUser.id);
    } else if (isAdmin) {
      filtered = [...allTasks];
    } else {
      filtered = getTasksByTeam(currentUser?.team || 'creative');
    }
    
    // Step 2: Apply team filter
    filtered = filtered.filter(task => task.team === teamFilter);
    
    // Step 3: Apply client filter if needed
    if (clientFilter !== 'all') {
      filtered = filtered.filter(task => task.clientId === clientFilter);
    }
    
    // Step 4: Apply employee filter if needed
    if (employeeFilter !== 'all') {
      filtered = filtered.filter(task => task.assigneeId === employeeFilter);
    }
    
    // Step 5: Apply search filter if needed
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(task => {
        const client = getClientById(task.clientId);
        return (
          task.title.toLowerCase().includes(query) || 
               task.description.toLowerCase().includes(query) ||
          (client && client.name.toLowerCase().includes(query))
        );
      });
    }
    
    console.log(`[Filtered Tasks] Found ${filtered.length} tasks for ${teamFilter} team`);
    return filtered;
  }, [
    allTasks, 
    viewMode, 
    teamFilter, 
    clientFilter, 
    employeeFilter, 
    searchQuery,
    currentUser,
    getTasksByUser,
    getTasksByTeam,
    getClientById,
    isAdmin
  ]);
  
  // Organized columns with tasks - our single source of truth for the drag and drop
  const columns = useMemo(() => {
    if (statusColumns.length === 0) {
      console.warn('[Columns] No status columns found for team:', teamFilter);
      return [];
    }
    
    if (filteredTasks.length === 0 && allTasks.length > 0) {
      console.log('[Columns] No tasks found for current filter settings, but data exists');
    }
    
    // Create a column map that will store all columns and their tasks
    const columnMap: Column[] = statusColumns.map(column => ({
      id: `${column.team}_${column.id}`,
      status: column.id as Status,
      team: column.team,
      name: column.name,
      color: column.color,
      tasks: []
    }));
    
    // Distribute all filtered tasks to their respective columns
    filteredTasks.forEach(task => {
      // Find the column this task belongs to
      const column = columnMap.find(
        col => col.team === task.team && col.status === task.status
      );
      
      // If column found, add task to it
      if (column) {
        column.tasks.push(task);
      } else {
        console.warn(`[Columns] Could not find column for task ${task.id} with status ${task.status} and team ${task.team}`);
      }
    });
    
    // Log initialization progress
    console.log(`[Columns] Created ${columnMap.length} columns with ${filteredTasks.length} tasks distributed`);
    
    // Store in ref for initialization checks
    columnsRef.current = columnMap;
    
    // Trigger columnsReady state if not already set
    if (!columnsReady && columnMap.length > 0) {
      setColumnsReady(true);
    }
    
    return columnMap;
  }, [statusColumns, filteredTasks, teamFilter, allTasks.length, columnsReady]);
  
  // ---------------------------------------------------
  // Effects
  // ---------------------------------------------------
  
  // Main initialization effect - ensures drag system is ready
  useEffect(() => {
    // Only initialize once we have verified everything is loaded
    const initializeDragSystem = async () => {
      // Skip if already initialized or if columns aren't ready yet
      if (isInitialized || !columnsReady) return;
      
      console.log('[Init] Starting drag system initialization...');
      setIsLoading(true);
      
      try {
        // Allow DOM to fully render the columns
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Verify columns are present in the DOM
        if (columnsRef.current.length > 0) {
          setIsInitialized(true);
          console.log('[Init] Drag system successfully initialized 🟢');
        } else {
          console.warn('[Init] Columns not ready yet, will retry');
          setColumnsReady(false);
          // Force an update to try again
          forceUpdateRef.current += 1;
        }
      } catch (error) {
        console.error('[Init] Error initializing drag system:', error);
      } finally {
        setIsLoading(false);
        initAttemptedRef.current = true;
      }
    };

    initializeDragSystem();
  }, [isInitialized, columnsReady, columnsRef.current.length]);
  
  // Reset initialization when changing teams
  useEffect(() => {
    // When team changes, reset the initialization flow
    console.log(`[Team Change] Switching to ${teamFilter} team, resetting initialization`);
    setIsInitialized(false);
    setColumnsReady(false);
    initAttemptedRef.current = false;
    
    // Clean up any drag operations
    setIsDragging(false);
    document.body.style.cursor = '';
    document.body.classList.remove('dragging');
    
    // Force reinitialization after team data loads
    const timer = setTimeout(() => {
      setColumnsReady(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [teamFilter]);
  
  // Initial data loading effect
  useEffect(() => {
    // When tasks change, signal that we need to prepare columns
    if (allTasks.length > 0 && !columnsReady) {
      console.log('[Data] Tasks loaded, preparing columns...');
      setColumnsReady(true);
    }
  }, [allTasks, columnsReady]);
  
  // Update scroll buttons visibility
  useEffect(() => {
    setShowScrollButtons(statusColumns.length > 3);
  }, [statusColumns.length]);
  
  // Reset filters when team changes
  useEffect(() => {
    setEmployeeFilter('all');
    setClientFilter('all');
  }, [teamFilter]);
  
  // ---------------------------------------------------
  // Event handlers
  // ---------------------------------------------------
  
  // Scroll handlers
  const scrollLeft = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  }, []);
  
  const scrollRight = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  }, []);
  
  // Team filter change
  const handleTeamFilterChange = useCallback((value: TeamType) => {
    console.log(`[Team Change] User requested team change from ${teamFilter} to ${value}`);
    setTeamFilter(value);
  }, [teamFilter]);
  
  // Task modal handlers
  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task);
    setInitialStatus(null);
    setNewTaskModalOpen(true);
  }, []);
  
  const handleCloseTaskModal = useCallback(() => {
    setNewTaskModalOpen(false);
    setSelectedTask(null);
    setInitialStatus(null);
  }, []);
  
  const handleNewTaskInStatus = useCallback((statusId: Status) => {
    setSelectedTask(null);
    setInitialStatus(statusId);
    setNewTaskModalOpen(true);
  }, []);
  
  const handleCloseClientModal = useCallback(() => {
    setNewClientModalOpen(false);
  }, []);

  // Clear filters button
  const handleClearFilters = useCallback(() => {
    setEmployeeFilter('all');
    setClientFilter('all');
    setSearchQuery('');
  }, []);
  
  // ---------------------------------------------------
  // Drag and Drop handlers
  // ---------------------------------------------------
  
  const handleDragStart = useCallback(() => {
    if (!isInitialized) {
      console.warn('[Drag] Attempted to drag before initialization');
      return;
    }
    
    setIsDragging(true);
    document.body.style.cursor = 'grabbing';
    document.body.classList.add('dragging');
  }, [isInitialized]);
  
  const handleDragEnd = useCallback((result: DropResult, provided: ResponderProvided) => {
    setIsDragging(false);
    document.body.style.cursor = '';
    document.body.classList.remove('dragging');
    
    // If there's no destination, do nothing
    if (!result.destination) {
      return;
    }
    
    // Identify source and destination columns
    const sourceColId = result.source.droppableId;
    const destColId = result.destination.droppableId;
    
    // If dropped in the same place, do nothing
    if (
      sourceColId === destColId &&
      result.source.index === result.destination.index
    ) {
      return;
    }
    
    console.log(`[Drag] Moving task from ${sourceColId} to ${destColId}`);
    
    // Get the task that was moved
    const sourceColumn = columns.find(col => col.id === sourceColId);
    if (!sourceColumn) {
      console.error(`[Drag] Source column ${sourceColId} not found`);
      return;
    }
    
    const taskId = result.draggableId;
    const taskToMove = sourceColumn.tasks.find(task => task.id === taskId);
    if (!taskToMove) {
      console.error(`[Drag] Task ${taskId} not found in source column`);
      return;
    }
    
    // Extract team and status from the destination column ID
    const destColumn = columns.find(col => col.id === destColId);
    if (!destColumn) {
      console.error(`[Drag] Destination column ${destColId} not found`);
      return;
    }
    
    // Ensure we're not trying to move a task between teams
    if (taskToMove.team !== destColumn.team) {
      console.error(`[Drag] Cannot move task between teams: ${taskToMove.team} to ${destColumn.team}`);
      return;
    }
    
    // Get the new status from the destination column
    const newStatus = destColumn.status;
    
    // Only update if the status changed
    if (taskToMove.status !== newStatus) {
      console.log(`[Drag] Updating task ${taskId} status from ${taskToMove.status} to ${newStatus}`);
      
      // Update task status
      updateTaskStatus(taskId, newStatus);
    }
  }, [columns, updateTaskStatus]);
  
  // ---------------------------------------------------
  // Render functions
  // ---------------------------------------------------
  
  // Render a task within a column
  const renderTask = useCallback((task: Task, index: number) => (
    <Draggable
      key={task.id}
      draggableId={task.id}
      index={index}
      isDragDisabled={!isInitialized}
    >
      {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`mb-3 transform transition-transform duration-150 select-none ${
            snapshot.isDragging ? 'z-50 shadow-lg opacity-90 scale-105' : ''
          }`}
          style={{
            ...provided.draggableProps.style,
            cursor: isInitialized ? (snapshot.isDragging ? 'grabbing' : 'grab') : 'not-allowed'
          }}
        >
          <TaskCard
            task={task}
            isDragging={snapshot.isDragging}
            onClick={() => handleTaskClick(task)}
          />
        </div>
      )}
    </Draggable>
  ), [handleTaskClick, isInitialized]);
  
  // Render a column with its tasks
  const renderColumn = useCallback((column: Column) => (
    <div key={column.id} className="h-full flex flex-col">
      <Card className="flex-1 h-full" hover>
        <CardHeader className="pb-2 border-b border-gray-100">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <div
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: column.color }}
              />
              <span>{column.name}</span>
            </div>
            <span className="bg-gray-100 text-secondary-700 text-xs font-medium rounded-full px-2.5 py-1">
              {column.tasks.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 overflow-hidden flex-1">
          <Droppable droppableId={column.id} type="task">
            {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`space-y-2 min-h-[200px] h-full flex flex-col ${
                  snapshot.isDraggingOver ? 'bg-gray-50 rounded-md' : ''
                }`}
              >
                {column.tasks.length === 0 ? (
                  <div className="flex items-center justify-center h-20 border-2 border-dashed border-gray-200 rounded-md mt-2">
                    <p className="text-sm text-gray-500">No tasks</p>
                  </div>
                ) : (
                  <div className="flex-1">
                    {column.tasks.map((task, index) => renderTask(task, index))}
                  </div>
                )}
                {provided.placeholder}
                
                {/* Add New Task Button */}
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Plus}
                    onClick={() => handleNewTaskInStatus(column.status)}
                    className="w-full bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 hover:text-gray-800 transition-all duration-300"
                  >
                    <span className="text-xs font-medium">New Task</span>
                  </Button>
                </div>
              </div>
            )}
          </Droppable>
        </CardContent>
      </Card>
    </div>
  ), [handleNewTaskInStatus, renderTask]);
  
  // Render loading state
  const renderLoading = useCallback(() => (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
        <p className="mt-2 text-gray-600">Loading task board...</p>
      </div>
    </div>
  ), []);
  
  // Helper to force rendering key
  const getRenderKey = useCallback(() => {
    return `${BOARD_ID}-${teamFilter}-${forceUpdateRef.current}`;
  }, [teamFilter, forceUpdateRef.current]);
  
  // ---------------------------------------------------
  // Main render
  // ---------------------------------------------------
  
  if (!columnsReady && allTasks.length === 0) {
    return renderLoading();
  }

  return (
    <div className="space-y-6">
      {/* Header with title and action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {teamFilter === 'creative' ? 'Creative Team' : 'Web Team'} Tasks
          </h1>
          {isLoading && !isInitialized && (
            <p className="text-sm text-amber-600 mt-1 animate-pulse">
              Initializing drag and drop system...
            </p>
          )}
        </div>
        
        <div className="flex space-x-3">
          <Button
            variant="primary"
            size="sm"
            icon={Briefcase}
            onClick={() => setNewClientModalOpen(true)}
            className="shadow-md hover:shadow-lg bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 transition-all duration-300"
          >
            <span className="text-sm font-semibold text-white">New Client</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setNewTaskModalOpen(true)}
            className="shadow-md hover:shadow-lg bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 transition-all duration-300"
          >
            <span className="text-sm font-semibold text-white">New Task</span>
          </Button>
        </div>
      </div>
      
      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-2 h-10">
              <ButtonGroup
                fullWidth
                options={[
                  { value: 'all', label: 'All Tasks' },
                  { value: 'my-tasks', label: 'My Tasks' }
                ]}
                value={viewMode}
                onChange={(value) => setViewMode(value as 'all' | 'my-tasks')}
                className="h-full"
              />
            </div>
            
            <div className="md:col-span-2 h-10">
              <ButtonGroup
                fullWidth
                options={[
                  { value: 'creative', label: 'Creative', icon: Palette },
                  { value: 'web', label: 'Web', icon: Code }
                ]}
                    value={teamFilter}
                onChange={(value) => handleTeamFilterChange(value as TeamType)}
                customStyles={{
                  creative: 'bg-purple-600 text-white hover:bg-purple-700',
                  web: 'bg-blue-600 text-white hover:bg-blue-700'
                }}
                className="h-full"
              />
              </div>
            
            <div className="md:col-span-2 h-10">
              <div className="relative h-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {teamFilter === 'creative' ? (
                    <Palette className="h-4 w-4 text-purple-400" />
                  ) : (
                    <Code className="h-4 w-4 text-blue-400" />
                  )}
                </div>
                <select
                  className="block w-full h-full pl-10 pr-10 py-2 text-sm border border-gray-300 rounded-md bg-white appearance-none transition-all duration-200 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 focus:shadow-sm text-ellipsis"
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                >
                  <option value="all">
                    {teamFilter === 'creative' ? 'All Creative Clients' : 'All Web Clients'} 
                    ({filteredClients.length})
                  </option>
                  {filteredClients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </div>
            
            <div className="md:col-span-3 h-10">
              <div className="relative h-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Users className="h-4 w-4 text-gray-400" />
                </div>
                <select
                  className="block w-full h-full pl-10 pr-10 py-2 text-sm border border-gray-300 rounded-md bg-white appearance-none transition-all duration-200 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 focus:shadow-sm text-ellipsis"
                  value={employeeFilter}
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                >
                  <option value="all">
                    {teamFilter === 'creative' ? 'All Creative Team' : 'All Web Team'} 
                    ({filteredUsers.filter(u => u.team === teamFilter).length})
                  </option>
                  {filteredUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} {user.role === 'admin' ? '(Admin)' : user.role === 'manager' ? '(Manager)' : ''}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </div>
            
            <div className="md:col-span-3 h-10">
              <div className="relative h-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search tasks..."
                  className="block w-full h-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md bg-white transition-all duration-200 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 focus:shadow-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          {/* Clear All Filters Button */}
          {(employeeFilter !== 'all' || clientFilter !== 'all' || searchQuery.trim() !== '') && (
            <div className="mt-3 flex justify-end">
              <button 
                className="text-sm text-primary-600 hover:text-primary-800 font-medium flex items-center hover:underline animate-tap"
                onClick={handleClearFilters}
              >
                <span>Clear All Filters</span>
              </button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Applied Filters Tags */}
      {(employeeFilter !== 'all' || clientFilter !== 'all' || teamFilter === 'web') && (
        <div className="flex flex-wrap gap-2 mb-4">
          {employeeFilter !== 'all' && (
            <div className="inline-flex items-center bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-sm">
              <span className="mr-1">{teamFilter === 'creative' ? 'Creative Team Member:' : 'Web Team Member:'}</span>
              <span className="font-medium">{filteredUsers.find(u => u.id === employeeFilter)?.name}</span>
              <button 
                className="ml-2 text-primary-500 hover:text-primary-700 transition-colors"
                onClick={() => setEmployeeFilter('all')}
              >
                &times;
              </button>
            </div>
          )}
          {clientFilter !== 'all' && (
            <div className="inline-flex items-center bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm">
              <span className="mr-1">{teamFilter === 'creative' ? 'Creative Client:' : 'Web Client:'}</span>
              <span className="font-medium">{clients.find(c => c.id === clientFilter)?.name}</span>
              <button 
                className="ml-2 text-purple-500 hover:text-purple-700 transition-colors"
                onClick={() => setClientFilter('all')}
              >
                &times;
              </button>
            </div>
          )}
          {teamFilter === 'web' && (
            <div className="inline-flex items-center bg-success-50 text-success-700 px-3 py-1 rounded-full text-sm">
              <span className="mr-1">Team:</span>
              <span className="font-medium flex items-center">
                <Code className="h-3.5 w-3.5 mr-1" />
                Web Team
              </span>
              <button 
                className="ml-2 text-success-500 hover:text-success-700 transition-colors"
                onClick={() => setTeamFilter('creative')}
              >
                &times;
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Task Board with Drag & Drop */}
      <div className="relative">
        {/* Scroll buttons */}
        {showScrollButtons && (
          <>
            <button 
              onClick={scrollLeft} 
              className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-white rounded-full p-1.5 shadow-md border border-gray-200 hover:bg-gray-50 transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-5 w-5 text-secondary-600" />
            </button>
            <button 
              onClick={scrollRight} 
              className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-white rounded-full p-1.5 shadow-md border border-gray-200 hover:bg-gray-50 transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-5 w-5 text-secondary-600" />
            </button>
          </>
        )}
        
        {/* DragDropContext with unique key for each team to ensure proper initialization */}
        <DragDropContext 
          key={getRenderKey()}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {isLoading && !isInitialized ? (
            <div className="flex justify-center items-center py-10">
              <div className="inline-block w-8 h-8 border-4 border-t-purple-500 border-gray-200 rounded-full animate-spin"></div>
              <span className="ml-3 text-gray-600">
                Preparing {teamFilter === 'creative' ? 'Creative' : 'Web'} Team tasks for drag and drop...
              </span>
            </div>
          ) : columns.length > 0 ? (
          <div 
            ref={scrollContainerRef} 
            className="grid grid-cols-1 gap-5 overflow-x-auto pb-4 hide-scrollbar"
            style={{ 
                gridTemplateColumns: `repeat(${columns.length}, minmax(330px, 1fr))`, 
              scrollbarWidth: 'none', 
              msOverflowStyle: 'none' 
            }}
          >
              {/* Render columns */}
              {columns.map(column => renderColumn(column))}
                    </div>
          ) : (
            <div className="flex justify-center items-center py-10 border-2 border-dashed border-gray-200 rounded-lg">
              <p className="text-gray-500">No columns found for {teamFilter} team</p>
                      </div>
                    )}
        </DragDropContext>
      </div>
      
      {/* Modals */}
      <NewTaskModal
        isOpen={newTaskModalOpen}
        onClose={handleCloseTaskModal}
        initialData={selectedTask ? selectedTask : initialStatus ? { status: initialStatus } : undefined}
      />
      
      <NewClientModal
        isOpen={newClientModalOpen}
        onClose={handleCloseClientModal}
      />
    </div>
  );
};

export default TaskBoard;