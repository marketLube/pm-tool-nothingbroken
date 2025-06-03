import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useDroppable,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import {
  CSS,
} from '@dnd-kit/utilities';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import TaskCard from '../components/tasks/TaskCard';
import Button from '../components/ui/Button';
import ButtonGroup from '../components/ui/ButtonGroup';
import NewTaskModal from '../components/tasks/NewTaskModal';
import NewClientModal from '../components/clients/NewClientModal';
import LiveIndicator from '../components/ui/LiveIndicator';
import { useData } from '../contexts/DataContext';
import { useStatus } from '../contexts/StatusContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Task, Status, TeamType, StatusCode } from '../types';
import { Plus, Search, Filter, Users, Briefcase, ChevronLeft, ChevronRight, ChevronDown, Palette, Code } from 'lucide-react';
import Avatar from '../components/ui/Avatar';
import { useDebounce } from '../hooks/useDebounce';

// Column type to help with type safety
interface Column {
  id: string;
  status: StatusCode;
  team: TeamType;
  name: string;
  color: string;
  tasks: Task[];
}

// 🔥 PERFORMANCE OPTIMIZATION: Memoized components to prevent unnecessary re-renders
const MemoizedTaskCard = React.memo(TaskCard);

// 🔥 OPTIMIZED: Draggable Task with minimal re-renders
interface DraggableTaskProps {
  task: Task;
  onClick: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const DraggableTask = React.memo<DraggableTaskProps>(({ 
  task, 
  onClick, 
  onDelete 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: task.id,
    // 🔥 PERFORMANCE: Remove disabled check for faster initialization
  });

  const style = useMemo(() => ({
    transform: CSS.Transform.toString(transform),
    transition,
    // 🔥 OPTIMIZATION: Use CSS transforms for better performance
    willChange: isDragging ? 'transform' : 'auto',
  }), [transform, transition, isDragging]);

  const handleClick = useCallback(() => onClick(task), [onClick, task]);
  const handleDelete = useCallback(() => onDelete(task.id), [onDelete, task.id]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`mb-3 transform select-none ${
        isDragging ? 'z-50 shadow-xl opacity-95 scale-[1.02] rotate-1' : 'hover:shadow-md transition-shadow duration-200'
      }`}
    >
      <MemoizedTaskCard
        task={task}
        isDragging={isDragging}
        onClick={handleClick}
        onDelete={handleDelete}
      />
    </div>
  );
});

DraggableTask.displayName = 'DraggableTask';

// 🔥 OPTIMIZED: Droppable Column with virtualization support
interface DroppableColumnProps {
  column: Column;
  onNewTask: (statusId: StatusCode) => void;
  onTaskClick: (task: Task) => void;
  onTaskDelete: (taskId: string) => void;
}

const DroppableColumn = React.memo<DroppableColumnProps>(({
  column,
  onNewTask,
  onTaskClick,
  onTaskDelete,
}) => {
  const { currentUser, isAdmin } = useAuth();
  
  const {
    isOver,
    setNodeRef
  } = useDroppable({
    id: column.id,
  });

  // 🔥 MEMOIZED: Permission check
  const canCreateTaskInStatus = useMemo(() => 
    isAdmin || (currentUser?.allowedStatuses?.includes(column.status) || false),
    [isAdmin, currentUser?.allowedStatuses, column.status]
  );

  const handleNewTask = useCallback(() => onNewTask(column.status), [onNewTask, column.status]);

  // 🔥 VIRTUALIZATION: Only render visible tasks if more than 20
  const shouldVirtualize = column.tasks.length > 20;
  const tasksToRender = shouldVirtualize ? column.tasks.slice(0, 20) : column.tasks;

  return (
    <div className="h-full flex flex-col">
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
          <div
            ref={setNodeRef}
            className={`space-y-2 min-h-[200px] h-full flex flex-col transition-colors duration-150 ${
              isOver ? 'bg-blue-50/50 rounded-md' : ''
            }`}
          >
            {column.tasks.length === 0 ? (
              <div className="flex items-center justify-center h-20 border-2 border-dashed border-gray-200 rounded-md mt-2">
                <p className="text-sm text-gray-500">No tasks</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <SortableContext 
                  items={column.tasks.map(task => task.id)} 
                  strategy={verticalListSortingStrategy}
                >
                  {tasksToRender.map((task) => (
                    <DraggableTask
                      key={task.id}
                      task={task}
                      onClick={onTaskClick}
                      onDelete={onTaskDelete}
                    />
                  ))}
                  {shouldVirtualize && column.tasks.length > 20 && (
                    <div className="text-xs text-gray-500 text-center py-2">
                      +{column.tasks.length - 20} more tasks
                    </div>
                  )}
                </SortableContext>
              </div>
            )}
            
            {canCreateTaskInStatus && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Plus}
                  onClick={handleNewTask}
                  className="w-full bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 hover:text-gray-800 transition-all duration-200"
                >
                  <span className="text-xs font-medium">New Task</span>
                </Button>
              </div>
            )}
            
            {!canCreateTaskInStatus && (
              <div className="mt-4 flex justify-center">
                <div className="text-xs text-gray-400 text-center py-2">
                  No permission to create tasks in this status
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

DroppableColumn.displayName = 'DroppableColumn';

const TaskBoard: React.FC = () => {
  // ---------------------------------------------------
  // Context and state hooks
  // ---------------------------------------------------
  const { tasks: allTasks, updateTaskStatus, searchTasks, setDragOperationActive, clients, users } = useData();
  const { getStatusesByTeam } = useStatus();
  const { currentUser, isAdmin } = useAuth();
  const { showError, showSuccess } = useNotification();
  
  // UI state
  const [newTaskModalOpen, setNewTaskModalOpen] = useState(false);
  const [newClientModalOpen, setNewClientModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [initialStatus, setInitialStatus] = useState<StatusCode | null>(null);
  
  // Filtering state - default to creative team
  const [viewMode, setViewMode] = useState<'all' | 'my-tasks'>('all');
  const [teamFilter, setTeamFilter] = useState<TeamType>('creative');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'createdDate' | 'dueDate' | 'title' | 'none'>('none');
  
  // Database search state
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Debounce search query to avoid too many database calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  // Scrolling state
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // 🔥 SIMPLIFIED: Drag operation state
  const [isDragging, setIsDragging] = useState(false);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const dragTaskRef = useRef<Task | null>(null);
  
  // 🔥 OPTIMIZED: Enhanced sensors with better performance
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Reduced from 8px for faster activation
        delay: 50,   // Reduced from 100ms for snappier response
        tolerance: 3, // Reduced tolerance for more precision
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // ---------------------------------------------------
  // 🔥 MEMOIZED: Derived state and computations
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
    clients.filter(client => client.team === teamFilter),
    [clients, teamFilter]
  );
  
  // Current team status columns - heavily memoized
  const statusColumns = useMemo(() => {
    const allColumns = getStatusesByTeam(teamFilter);
    
    // Filter columns based on user permissions (non-admin users only see allowed statuses)
    if (!isAdmin && currentUser?.allowedStatuses) {
      return allColumns.filter(column => 
        currentUser.allowedStatuses?.includes(column.id) || false
      );
    }
    
    return allColumns;
  }, [getStatusesByTeam, teamFilter, isAdmin, currentUser?.allowedStatuses]);
  
  // 🔥 OPTIMIZED: Database search effect with better caching
  useEffect(() => {
    let isCancelled = false;
    
    const performSearch = async () => {
      if (isDragging) return; // Skip during drag operations
      
      setIsSearching(true);
      
      try {
        const filters = {
          team: teamFilter,
          searchQuery: debouncedSearchQuery,
          clientId: clientFilter !== 'all' ? clientFilter : undefined,
          assigneeId: employeeFilter !== 'all' ? employeeFilter : undefined,
          sortBy,
          ...(viewMode === 'my-tasks' && currentUser ? { userId: currentUser.id } : {})
        };

        const searchResults = await searchTasks(filters);
        
        if (!isCancelled) {
          setFilteredTasks(searchResults);
        }
      } catch (error) {
        console.error('Error performing database search:', error);
        if (!isCancelled) {
          setFilteredTasks([]);
        }
      } finally {
        if (!isCancelled) {
          setIsSearching(false);
        }
      }
    };

    performSearch();
    
    return () => {
      isCancelled = true;
    };
  }, [
    teamFilter,
    clientFilter,
    employeeFilter,
    debouncedSearchQuery,
    sortBy,
    viewMode,
    currentUser?.id,
    searchTasks,
    isDragging
  ]);
  
  // 🔥 HIGHLY OPTIMIZED: Organized columns with tasks
  const columns = useMemo(() => {
    if (statusColumns.length === 0) {
      return [];
    }
    
    // Create column map
    const columnMap: Column[] = statusColumns.map(column => ({
      id: `${column.team}_${column.id}`,
      status: column.id,
      team: column.team,
      name: column.name,
      color: column.color,
      tasks: []
    }));
    
    // Distribute tasks to columns
    filteredTasks.forEach(task => {
      // Permission check for non-admin users
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
  }, [statusColumns, filteredTasks, isAdmin, currentUser?.allowedStatuses]);
  
  // ---------------------------------------------------
  // 🔥 OPTIMIZED: Event handlers
  // ---------------------------------------------------
  
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
  
  const handleNewTaskInStatus = useCallback((statusId: StatusCode) => {
    setSelectedTask(null);
    setInitialStatus(statusId);
    setNewTaskModalOpen(true);
  }, []);
  
  const handleTaskDelete = useCallback((taskId: string) => {
    // Optimistic update
    setFilteredTasks(prev => prev.filter(task => task.id !== taskId));
  }, []);
  
  // ---------------------------------------------------
  // 🔥 ULTRA-FAST: Drag and Drop handlers
  // ---------------------------------------------------
  
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    
    // Store dragged task reference
    const task = filteredTasks.find(t => t.id === active.id);
    dragTaskRef.current = task || null;
    
    setActiveId(active.id);
    setIsDragging(true);
    setDragOperationActive(true);
    
    // Visual feedback
    document.body.style.cursor = 'grabbing';
    document.body.classList.add('dragging');
  }, [filteredTasks, setDragOperationActive]);
  
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    // Cleanup
    setIsDragging(false);
    setActiveId(null);
    setDragOperationActive(false);
    dragTaskRef.current = null;
    
    document.body.style.cursor = '';
    document.body.classList.remove('dragging');
    
    if (!over) return;
    
    const activeTask = filteredTasks.find(task => task.id === active.id);
    if (!activeTask) return;
    
    // Find target column
    const targetColumn = columns.find(col => 
      col.id === over.id || col.tasks.some(task => task.id === over.id)
    );
    
    if (!targetColumn) return;
    
    // Validation checks
    if (activeTask.team !== targetColumn.team) {
      showError('Cannot move tasks between different teams.');
      return;
    }
    
    if (!isAdmin && currentUser?.allowedStatuses && !currentUser.allowedStatuses.includes(targetColumn.status)) {
      showError(`You don't have permission to move tasks to "${targetColumn.name}" status.`);
      return;
    }
    
    // Update if status changed
    if (activeTask.status !== targetColumn.status) {
      try {
        // Optimistic update
        setFilteredTasks(prev => 
          prev.map(task => 
            task.id === activeTask.id 
              ? { ...task, status: targetColumn.status }
              : task
          )
        );
        
        // Database update
        await updateTaskStatus(activeTask.id, targetColumn.status);
        showSuccess(`Task moved to ${targetColumn.name}`);
      } catch (error) {
        console.error('Failed to update task status:', error);
        showError('Failed to update task status. Please try again.');
        
        // Revert optimistic update
        setFilteredTasks(prev => 
          prev.map(task => 
            task.id === activeTask.id 
              ? { ...task, status: activeTask.status }
              : task
          )
        );
      }
    }
  }, [columns, filteredTasks, updateTaskStatus, isAdmin, currentUser?.allowedStatuses, showError, showSuccess, setDragOperationActive]);
  
  // Get active task for drag overlay
  const activeTask = useMemo(() => {
    if (!activeId) return null;
    return dragTaskRef.current || filteredTasks.find(task => task.id === activeId) || null;
  }, [activeId, filteredTasks]);
  
  // Scroll handlers
  const scrollLeft = useCallback(() => {
    scrollContainerRef.current?.scrollBy({ left: -300, behavior: 'smooth' });
  }, []);
  
  const scrollRight = useCallback(() => {
    scrollContainerRef.current?.scrollBy({ left: 300, behavior: 'smooth' });
  }, []);
  
  // Clear filters
  const handleClearFilters = useCallback(() => {
    setEmployeeFilter('all');
    setClientFilter('all');
    setSearchQuery('');
    setSortBy('none');
  }, []);
  
  // ---------------------------------------------------
  // Main render
  // ---------------------------------------------------
  
  if (isSearching && filteredTasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
          <p className="mt-2 text-gray-600">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {teamFilter === 'creative' ? 'Creative Team' : 'Web Team'} Tasks
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {filteredTasks.length} tasks • {columns.length} columns
            </p>
          </div>
          <LiveIndicator className="flex-shrink-0" />
        </div>
        
        <div className="flex space-x-3">
          <Button
            variant="primary"
            size="sm"
            icon={Briefcase}
            onClick={() => setNewClientModalOpen(true)}
            className="shadow-md hover:shadow-lg bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 transition-all duration-200"
          >
            <span className="text-sm font-semibold text-white">New Client</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setNewTaskModalOpen(true)}
            className="shadow-md hover:shadow-lg bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 transition-all duration-200"
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
                onChange={(value) => setTeamFilter(value as TeamType)}
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
                  {/* Use system clients (including 'Unassigned') */}
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
            
            <div className="md:col-span-2 h-10">
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
                  <option value="unassigned">
                    Unassigned Tasks
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
            
            <div className="md:col-span-2 h-10">
              <div className="relative h-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="h-4 w-4 text-gray-400" />
                </div>
                <select
                  className="block w-full h-full pl-10 pr-10 py-2 text-sm border border-gray-300 rounded-md bg-white appearance-none transition-all duration-200 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 focus:shadow-sm text-ellipsis"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'createdDate' | 'dueDate' | 'title' | 'none')}
                >
                  <option value="none">No Sorting</option>
                  <option value="createdDate">Sort by Created Date</option>
                  <option value="dueDate">Sort by Due Date</option>
                  <option value="title">Sort by Title</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </div>
            
            <div className="md:col-span-2 h-10">
              <div className="relative h-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {isSearching ? (
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-blue-500 rounded-full animate-spin"></div>
                  ) : (
                    <Search className="h-4 w-4 text-gray-400" />
                  )}
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
          {(employeeFilter !== 'all' || clientFilter !== 'all' || searchQuery.trim() !== '' || sortBy !== 'none') && (
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
      {(employeeFilter !== 'all' || clientFilter !== 'all' || teamFilter === 'web' || sortBy !== 'none') && (
        <div className="flex flex-wrap gap-2 mb-4">
          {employeeFilter !== 'all' && (
            <div className="inline-flex items-center bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-sm">
              <span className="mr-1">{teamFilter === 'creative' ? 'Creative Team Member:' : 'Web Team Member:'}</span>
              <span className="font-medium">
                {employeeFilter === 'unassigned' 
                  ? 'Unassigned Tasks' 
                  : filteredUsers.find(u => u.id === employeeFilter)?.name
                }
              </span>
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
              <span className="font-medium">
                {clients.find(c => c.id === clientFilter)?.name}
              </span>
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
          {sortBy !== 'none' && (
            <div className="inline-flex items-center bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-sm">
              <span className="mr-1">Sorted by:</span>
              <span className="font-medium flex items-center">
                <Filter className="h-3.5 w-3.5 mr-1" />
                {sortBy === 'createdDate' ? 'Created Date' : 
                 sortBy === 'dueDate' ? 'Due Date' : 
                 sortBy === 'title' ? 'Title' : 'None'}
              </span>
              <button 
                className="ml-2 text-amber-500 hover:text-amber-700 transition-colors"
                onClick={() => setSortBy('none')}
              >
                &times;
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Task Board with Ultra-Fast Drag & Drop */}
      <div className="relative">
        {/* Scroll buttons */}
        {columns.length > 3 && (
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
        
        {/* 🔥 ULTRA-FAST DndContext */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {columns.length > 0 ? (
            <div 
              ref={scrollContainerRef} 
              className="grid grid-cols-1 gap-5 overflow-x-auto pb-4 hide-scrollbar"
              style={{ 
                gridTemplateColumns: `repeat(${columns.length}, minmax(330px, 1fr))`, 
                scrollbarWidth: 'none', 
                msOverflowStyle: 'none' 
              }}
            >
              {columns.map(column => (
                <DroppableColumn
                  key={column.id}
                  column={column}
                  onNewTask={handleNewTaskInStatus}
                  onTaskClick={handleTaskClick}
                  onTaskDelete={handleTaskDelete}
                />
              ))}
            </div>
          ) : (
            <div className="flex justify-center items-center py-10 border-2 border-dashed border-gray-200 rounded-lg">
              <p className="text-gray-500">No columns found for {teamFilter} team</p>
            </div>
          )}

          {/* 🔥 OPTIMIZED DragOverlay */}
          <DragOverlay>
            {activeTask ? (
              <div className="opacity-95 scale-105 rotate-2 shadow-2xl">
                <MemoizedTaskCard
                  task={activeTask}
                  isDragging={true}
                  onClick={() => {}}
                  onDelete={() => {}}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
      
      {/* Modals */}
      <NewTaskModal
        isOpen={newTaskModalOpen}
        onClose={handleCloseTaskModal}
        initialData={selectedTask ? selectedTask : initialStatus ? { status: initialStatus, team: teamFilter } : { team: teamFilter }}
      />
      
      <NewClientModal
        isOpen={newClientModalOpen}
        onClose={() => setNewClientModalOpen(false)}
        team={teamFilter}
      />
    </div>
  );
};

export default TaskBoard;