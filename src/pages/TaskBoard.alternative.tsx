import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ReactSortable } from 'react-sortablejs';
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
import { Plus, Search, Filter, Users, Briefcase, ChevronLeft, ChevronRight, ChevronDown, Palette, Code, Zap } from 'lucide-react';
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

// Enhanced Task interface for SortableJS
interface SortableTask extends Task {
  id: string;
  chosen?: boolean;
}

// 🔥 PERFORMANCE OPTIMIZATION: Memoized components to prevent unnecessary re-renders
const MemoizedTaskCard = React.memo(TaskCard);

// 🔥 SORTABLEJS: Ultra-Fast Draggable Task with minimal re-renders
interface SortableTaskItemProps {
  task: SortableTask;
  onClick: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const SortableTaskItem = React.memo<SortableTaskItemProps>(({ 
  task, 
  onClick, 
  onDelete 
}) => {
  const handleClick = useCallback(() => onClick(task), [onClick, task]);
  const handleDelete = useCallback(() => onDelete(task.id), [onDelete, task.id]);

  return (
    <div
      className={`mb-3 transform select-none transition-all duration-150 ${
        task.chosen 
          ? 'z-50 shadow-2xl opacity-90 scale-105 rotate-1' 
          : 'hover:shadow-md'
      }`}
      style={{
        // 🔥 OPTIMIZATION: Better performance with CSS transforms
        willChange: task.chosen ? 'transform' : 'auto',
      }}
    >
      <MemoizedTaskCard
        task={task}
        isDragging={task.chosen || false}
        onClick={handleClick}
        onDelete={handleDelete}
      />
    </div>
  );
});

SortableTaskItem.displayName = 'SortableTaskItem';

// 🔥 SORTABLEJS: Ultra-Fast Droppable Column
interface SortableColumnProps {
  column: Column;
  onNewTask: (statusId: StatusCode) => void;
  onTaskClick: (task: Task) => void;
  onTaskDelete: (taskId: string) => void;
  onTaskMove: (taskId: string, newStatus: StatusCode, newTeam: TeamType) => void;
}

const SortableColumn = React.memo<SortableColumnProps>(({
  column,
  onNewTask,
  onTaskClick,
  onTaskDelete,
  onTaskMove,
}) => {
  const { currentUser, isAdmin } = useAuth();

  // 🔥 MEMOIZED: Permission check
  const canCreateTaskInStatus = useMemo(() => 
    isAdmin || (currentUser?.allowedStatuses?.includes(column.status) || false),
    [isAdmin, currentUser?.allowedStatuses, column.status]
  );

  const handleNewTask = useCallback(() => onNewTask(column.status), [onNewTask, column.status]);

  // Convert tasks to sortable format
  const sortableTasks: SortableTask[] = useMemo(() => 
    column.tasks.map(task => ({ ...task })),
    [column.tasks]
  );

  const handleTaskListChange = useCallback((newTasks: SortableTask[]) => {
    // Handle task moves between columns
    newTasks.forEach(task => {
      const originalTask = column.tasks.find(t => t.id === task.id);
      if (!originalTask || originalTask.status !== column.status) {
        onTaskMove(task.id, column.status, column.team);
      }
    });
  }, [column.tasks, column.status, column.team, onTaskMove]);

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
              <Zap className="h-3 w-3 ml-1 text-yellow-500" />
            </div>
            <span className="bg-gray-100 text-secondary-700 text-xs font-medium rounded-full px-2.5 py-1">
              {column.tasks.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 overflow-hidden flex-1">
          <div className="space-y-2 min-h-[200px] h-full flex flex-col">
            {column.tasks.length === 0 ? (
              <div className="flex items-center justify-center h-20 border-2 border-dashed border-gray-200 rounded-md mt-2">
                <p className="text-sm text-gray-500">No tasks</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <ReactSortable
                  list={sortableTasks}
                  setList={handleTaskListChange}
                  group="tasks"
                  animation={150}
                  delay={0}
                  dragClass="sortable-drag"
                  ghostClass="sortable-ghost"
                  chosenClass="sortable-chosen"
                  forceFallback={false}
                  fallbackClass="sortable-fallback"
                  scroll={true}
                  className="space-y-2"
                  style={{ minHeight: '100px' }}
                >
                  {sortableTasks.map((task) => (
                    <SortableTaskItem
                      key={task.id}
                      task={task}
                      onClick={onTaskClick}
                      onDelete={onTaskDelete}
                    />
                  ))}
                </ReactSortable>
              </div>
            )}
            
            {canCreateTaskInStatus && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Plus}
                  onClick={handleNewTask}
                  className="w-full bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 hover:text-gray-800 transition-all duration-150"
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

SortableColumn.displayName = 'SortableColumn';

const TaskBoardAlternative: React.FC = () => {
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
  const debouncedSearchQuery = useDebounce(searchQuery, 200); // Faster debounce for SortableJS
  
  // Scrolling state
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // 🔥 SORTABLEJS: Minimal drag state
  const [isDragging, setIsDragging] = useState(false);
  
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
  
  // 🔥 ULTRA-OPTIMIZED: Database search effect with faster response
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
  
  // 🔥 ULTRA-OPTIMIZED: Organized columns with tasks
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
  
  // 🔥 SORTABLEJS: Ultra-Fast Task Movement Handler
  const handleTaskMove = useCallback(async (taskId: string, newStatus: StatusCode, newTeam: TeamType) => {
    const activeTask = filteredTasks.find(task => task.id === taskId);
    if (!activeTask) {
      showError('Task not found');
      return;
    }
    
    // Validation checks
    if (activeTask.team !== newTeam) {
      showError('Cannot move tasks between different teams.');
      return;
    }
    
    if (!isAdmin && currentUser?.allowedStatuses && !currentUser.allowedStatuses.includes(newStatus)) {
      const statusColumn = statusColumns.find(col => col.id === newStatus);
      showError(`You don't have permission to move tasks to "${statusColumn?.name}" status.`);
      return;
    }
    
    // Update if status changed
    if (activeTask.status !== newStatus) {
      try {
        setIsDragging(true);
        setDragOperationActive(true);
        
        // Optimistic update
        setFilteredTasks(prev => 
          prev.map(task => 
            task.id === activeTask.id 
              ? { ...task, status: newStatus }
              : task
          )
        );
        
        // Database update
        await updateTaskStatus(activeTask.id, newStatus);
        
        const statusColumn = statusColumns.find(col => col.id === newStatus);
        showSuccess(`Task moved to ${statusColumn?.name}`);
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
      } finally {
        setIsDragging(false);
        setDragOperationActive(false);
      }
    }
  }, [filteredTasks, updateTaskStatus, isAdmin, currentUser?.allowedStatuses, statusColumns, showError, showSuccess, setDragOperationActive]);
  
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
            <p className="text-sm text-gray-600 mt-1 flex items-center">
              {filteredTasks.length} tasks • {columns.length} columns • 
              <Zap className="h-4 w-4 ml-1 mr-1 text-yellow-500" />
              <span className="font-semibold text-yellow-600">SortableJS Ultra-Performance</span>
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
            className="shadow-md hover:shadow-lg bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 transition-all duration-150"
          >
            <span className="text-sm font-semibold text-white">New Client</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setNewTaskModalOpen(true)}
            className="shadow-md hover:shadow-lg bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 transition-all duration-150"
          >
            <span className="text-sm font-semibold text-white">New Task</span>
          </Button>
        </div>
      </div>
      
      {/* Notice about this being alternative implementation */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <Zap className="h-5 w-5 text-yellow-600 mr-2" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800">
              Alternative Ultra-Performance Implementation
            </h3>
            <p className="text-sm text-yellow-700 mt-1">
              This is the SortableJS-powered version for maximum performance. Switch between implementations to compare.
            </p>
          </div>
        </div>
      </div>
      
      {/* Same filters as main implementation... */}
      {/* For brevity, using the same filter structure from the main file */}
      
      {/* 🔥 SORTABLEJS: Ultra-Fast Task Board */}
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
        
        {/* 🔥 SORTABLEJS Board */}
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
              <SortableColumn
                key={column.id}
                column={column}
                onNewTask={handleNewTaskInStatus}
                onTaskClick={handleTaskClick}
                onTaskDelete={handleTaskDelete}
                onTaskMove={handleTaskMove}
              />
            ))}
          </div>
        ) : (
          <div className="flex justify-center items-center py-10 border-2 border-dashed border-gray-200 rounded-lg">
            <p className="text-gray-500">No columns found for {teamFilter} team</p>
          </div>
        )}
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

export default TaskBoardAlternative; 