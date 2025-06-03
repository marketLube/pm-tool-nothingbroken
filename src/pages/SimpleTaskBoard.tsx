import React, { useState, useMemo, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import TaskCard from '../components/tasks/TaskCard';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { useStatus } from '../contexts/StatusContext';
import { useNotification } from '../contexts/NotificationContext';
import { useSimpleRealtime, useTaskRefresh } from '../contexts/SimpleRealtimeContext';
import { Task, StatusCode, TeamType } from '../types';
import { Plus } from 'lucide-react';
import * as taskService from '../services/taskService';

interface Column {
  id: string;
  status: StatusCode;
  team: TeamType;
  name: string;
  color: string;
  tasks: Task[];
}

const SimpleTaskBoard: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const { getStatusesByTeam } = useStatus();
  const { showError, showSuccess } = useNotification();
  const { refreshTasks, isConnected } = useSimpleRealtime();
  const { tasks, isLoading } = useTaskRefresh();
  
  const [teamFilter, setTeamFilter] = useState<TeamType>('creative');
  const [isDragging, setIsDragging] = useState(false);

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

  // Organize tasks into columns
  const columns = useMemo(() => {
    if (statusColumns.length === 0) return [];
    
    const columnMap: Column[] = statusColumns.map(column => ({
      id: `${column.team}_${column.id}`,
      status: column.id,
      team: column.team,
      name: column.name,
      color: column.color,
      tasks: []
    }));
    
    // Filter tasks by team and distribute to columns
    const teamTasks = tasks.filter(task => task.team === teamFilter);
    
    teamTasks.forEach(task => {
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
  }, [statusColumns, tasks, teamFilter, isAdmin, currentUser?.allowedStatuses]);

  // Drag handlers with optimistic updates
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
    
    if (!isAdmin && currentUser?.allowedStatuses && !currentUser.allowedStatuses.includes(targetColumn.status)) {
      showError(`You don't have permission to move tasks to "${targetColumn.name}" status`);
      return;
    }
    
    if (task.status === targetColumn.status) return;
    
    try {
      console.log(`🔄 [SimpleTaskBoard] Moving task ${task.id} to ${targetColumn.status}`);
      
      // Update database
      await taskService.updateTaskStatus(task.id, targetColumn.status);
      
      console.log(`✅ [SimpleTaskBoard] Task moved successfully`);
      showSuccess(`Task moved to ${targetColumn.name}`);
      
      // Trigger immediate refresh for all browsers
      refreshTasks();
      
    } catch (error) {
      console.error('Failed to update task status:', error);
      showError('Failed to update task status. Please try again.');
    }
  }, [tasks, columns, isAdmin, currentUser?.allowedStatuses, showError, showSuccess, refreshTasks]);

  const handleTaskClick = useCallback(() => {
    console.log('Task clicked - opening edit modal (not implemented yet)');
    // Add task modal logic here if needed
  }, []);

  const handleTaskDelete = useCallback(async (taskId: string) => {
    try {
      console.log(`🗑️ [SimpleTaskBoard] Deleting task: ${taskId}`);
      await taskService.deleteTask(taskId);
      showSuccess('Task deleted successfully');
      refreshTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      showError('Failed to delete task');
    }
  }, [showSuccess, showError, refreshTasks]);

  if (isLoading && tasks.length === 0) {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Simple {teamFilter === 'creative' ? 'Creative' : 'Web'} Team Tasks
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {tasks.filter(t => t.team === teamFilter).length} tasks • {columns.length} columns
            {isConnected && <span className="text-green-600 ml-2">🟢 Connected (Polling every 3s)</span>}
            {!isConnected && <span className="text-red-600 ml-2">🔴 Disconnected</span>}
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Button
            variant={teamFilter === 'creative' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setTeamFilter('creative')}
          >
            Creative Team
          </Button>
          <Button
            variant={teamFilter === 'web' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setTeamFilter('web')}
          >
            Web Team
          </Button>
          
          {/* Debug button to test manual refresh */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              console.log('🔄 [Debug] Manual refresh triggered');
              refreshTasks();
            }}
          >
            🔄 Force Refresh
          </Button>
        </div>
      </div>

      {/* Task Board */}
      <DragDropContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
        {columns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {columns.map(column => (
              <Card key={column.id} className="h-fit">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: column.color }}
                      />
                      <span>{column.name}</span>
                    </div>
                    <span className="bg-gray-100 text-gray-700 text-xs font-medium rounded-full px-2.5 py-1">
                      {column.tasks.length}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <Droppable droppableId={column.id} type="TASK">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-[200px] transition-colors duration-150 ${
                          snapshot.isDraggingOver ? 'bg-blue-50 rounded-md p-2' : ''
                        }`}
                      >
                        {column.tasks.length === 0 ? (
                          <div className="flex items-center justify-center h-20 border-2 border-dashed border-gray-200 rounded-md">
                            <p className="text-sm text-gray-500">No tasks</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {column.tasks.map((task, index) => (
                              <Draggable key={task.id} draggableId={task.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`transform transition-all duration-200 ${
                                      snapshot.isDragging 
                                        ? 'shadow-xl opacity-95 scale-105 rotate-2' 
                                        : 'hover:shadow-md'
                                    }`}
                                  >
                                    <TaskCard
                                      task={task}
                                      isDragging={snapshot.isDragging}
                                      onClick={handleTaskClick}
                                      onDelete={handleTaskDelete}
                                    />
                                  </div>
                                )}
                              </Draggable>
                            ))}
                          </div>
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex justify-center items-center py-10 border-2 border-dashed border-gray-200 rounded-lg">
            <p className="text-gray-500">No columns found for {teamFilter} team</p>
          </div>
        )}
      </DragDropContext>
    </div>
  );
};

export default SimpleTaskBoard; 