import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import { 
  AlertTriangle, 
  Calendar,
  Edit,
  Trash2,
  MoreVertical,
  Clock
} from 'lucide-react';
import { Task } from '../../types';
import { useData } from '../../contexts/DataContext';
import { format, parseISO, startOfDay, isBefore } from 'date-fns';
import { getIndiaDateTime } from '../../utils/timezone';
import { useStatus } from '../../contexts/StatusContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

// Import BadgeVariant type
type BadgeVariant = 
  | 'default' 
  | 'primary' 
  | 'success' 
  | 'warning' 
  | 'danger' 
  | 'info' 
  | 'purple'
  | 'indigo'
  | 'orange'
  | 'amber'
  | 'pink';

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
  onClick?: () => void;
  onDelete?: (taskId: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  isDragging = false,
  onClick,
  onDelete
}) => {
  const { getUserById, getClientById, deleteTask } = useData();
  const { statuses } = useStatus();
  const [showActions, setShowActions] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const { showError } = useNotification();

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setShowActions(false);
      }
    };

    if (showActions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActions]);
  
  const assignee = task.assigneeId ? getUserById(task.assigneeId) : null;
  const client = task.clientId ? getClientById(task.clientId) : null;
  
  // 🔥 DEBUG: Log if assignee is missing when it should exist
  if (task.assigneeId && !assignee) {
    console.warn(`TaskCard: Assignee not found for task "${task.title}" (assigneeId: ${task.assigneeId})`);
  }
  
  // Get the actual status object from StatusContext
  const currentStatus = statuses.find(
    s => s.id === task.status && s.team === task.team
  );
  
  // Get status display name - use the status name from StatusContext or format the status ID as fallback
  const getStatusDisplayName = () => {
    if (currentStatus) {
      return currentStatus.name;
    }
    
    // Fallback: format the status ID if no matching status found
    if (typeof task.status === 'string') {
      return task.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
    
    return 'Unknown Status';
  };
  
  // Calculate if task is overdue using IST
  const dueDate = parseISO(task.dueDate);
  const todayIST = startOfDay(getIndiaDateTime());
  const isOverdue = isBefore(dueDate, todayIST) && task.status !== 'done';
  
  // Format due date in a human-readable way
  const formattedDueDate = format(dueDate, 'MMM d, yyyy');
  
  // Determine the status and priority colors
  const getStatusColor = () => {
    // Find the matching status for this task
    const matchingStatus = statuses.find(
      s => s.id === task.status && s.team === task.team
    );
    
    // If we found a matching status with a color, use its color variant
    if (matchingStatus) {
      // Map the color to a variant if needed
      const colorToVariant: Record<string, BadgeVariant> = {
        '#94a3b8': 'default',
        '#6b7280': 'default',
        '#a78bfa': 'purple',
        '#8b5cf6': 'indigo',
        '#3b82f6': 'primary',
        '#2563eb': 'primary',
        '#f97316': 'warning',
        '#fb923c': 'amber',
        '#ec4899': 'pink',
        '#22c55e': 'success',
      };
      
      return colorToVariant[matchingStatus.color] || 'default';
    }
    
    // Creative team statuses - fallback
    if (task.team === 'creative') {
      switch (task.status) {
        case 'not_started': return 'default';
        case 'scripting': return 'purple';
        case 'script_confirmed': return 'indigo';
        case 'shoot_pending': return 'orange';
        case 'shoot_finished': return 'amber';
        case 'edit_pending': return 'primary';
        case 'client_approval': return 'pink';
        case 'approved': return 'success';
        default: return 'default';
      }
    }
    
    // Web team statuses - fallback
    if (task.team === 'web') {
      switch (task.status) {
        case 'proposal_awaiting': return 'default';
        case 'not_started': return 'default';
        case 'ui_started': return 'purple';
        case 'ui_finished': return 'indigo';
        case 'development_started': return 'primary';
        case 'development_finished': return 'primary';
        case 'testing': return 'warning';
        case 'handed_over': return 'amber';
        case 'client_reviewing': return 'pink';
        case 'completed': return 'success';
        case 'in_progress': return 'primary';
        case 'done': return 'success';
        default: return 'default';
      }
    }
    
    // Fallback for legacy statuses
    switch (task.status) {
      case 'in_progress': return 'primary';
      case 'done': return 'success';
      default: return 'default';
    }
  };
  
  const getPriorityColor = () => {
    switch (task.priority) {
      case 'low': return 'default';
      case 'medium': return 'warning';
      case 'high': return 'danger';
      default: return 'default';
    }
  };

  // Get priority color for the left border
  const getPriorityBorderColor = () => {
    switch (task.priority) {
      case 'low': return 'rgb(156, 163, 175)'; // grey for Low
      case 'medium': return 'rgb(234, 179, 8)'; // yellow for Medium
      case 'high': return 'rgb(220, 38, 38)'; // red for High
      default: return 'rgb(156, 163, 175)';
    }
  };

  // Handle delete task
  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(task.id);
      } catch (error) {
        console.error('Failed to delete task:', error);
        showError(`Failed to delete task: ${error instanceof Error ? error.message : 'Unknown error occurred'}. Please try again.`);
      }
    }
  };

  // Handle card click
  const handleCardClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <Card 
      className={`group mb-3 ${isDragging ? 'opacity-60' : ''} ${isDeleting ? 'opacity-50' : ''} cursor-pointer animate-hover-rise animate-tap relative overflow-hidden border-l-[6px] h-full shadow-sm hover:shadow-md transition-all duration-200`}
      style={{ borderLeftColor: getPriorityBorderColor() }}
      onClick={handleCardClick}
      hover
    >
      {/* Client Name Banner at top */}
      <div className="absolute top-0 left-0 right-0 py-1.5 px-3 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-b border-indigo-100">
        <div className="flex items-center">
          <span className="text-xs font-bold tracking-wide uppercase text-indigo-800 truncate">{client?.name || 'Unassigned Client'}</span>
        </div>
      </div>
      
      {/* Action menu - visible on hover */}
      <div className="task-actions absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="relative" ref={actionMenuRef}>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 bg-white/90 hover:bg-white shadow-sm border border-gray-200"
            onClick={(e) => {
              e.stopPropagation();
              setShowActions(!showActions);
            }}
          >
            <MoreVertical className="h-3 w-3 text-gray-600" />
          </Button>
          
          {showActions && (
            <div className="absolute top-7 right-0 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50 min-w-[120px]">
              <button
                className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowActions(false);
                  if (onClick) onClick();
                }}
              >
                <Edit className="h-3 w-3 mr-2" />
                Edit Task
              </button>
              <button
                className="w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <Trash2 className="h-3 w-3 mr-2" />
                {isDeleting ? 'Deleting...' : 'Delete Task'}
              </button>
            </div>
          )}
        </div>
      </div>
      
      <CardContent className="p-4 pt-8 flex flex-col h-full">
        {/* Status and Priority Row */}
        <div className="flex justify-between items-center mb-2.5">
          <Badge variant={getStatusColor()} size="sm" className="py-0.5">
            {getStatusDisplayName()}
          </Badge>
          <Badge variant={getPriorityColor()} size="sm" className="py-0.5">
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
          </Badge>
        </div>
        
        {/* Task Title */}
        <h3 className="font-medium text-secondary-900 text-sm tracking-tight mb-2 line-clamp-2">{task.title}</h3>
        
        {/* Task Description */}
        <p className="caption-text text-secondary-600 mb-3 line-clamp-2 flex-grow">{task.description}</p>
        
        {/* Footer with Assignee and Due Date */}
        <div className="mt-auto pt-2 border-t border-gray-100 space-y-2">
          {/* Assignee */}
          {assignee ? (
            <div className="flex items-center">
              <Avatar 
                src={assignee.avatar} 
                name={assignee.name} 
                size="xs" 
              />
              <span className="ml-1.5 text-xs font-medium text-secondary-700">{assignee.name}</span>
            </div>
          ) : task.assigneeId ? (
            // Show assigneeId if user data is missing but ID exists
            <div className="flex items-center">
              <div className="w-6 h-6 rounded-full bg-orange-200 flex items-center justify-center">
                <span className="text-xs text-orange-600">!</span>
              </div>
              <span className="ml-1.5 text-xs font-medium text-orange-600 italic">
                Assignee ID: {task.assigneeId.slice(0, 8)}... (User not found)
              </span>
            </div>
          ) : (
            // Truly unassigned task
            <div className="flex items-center">
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-xs text-gray-500">?</span>
              </div>
              <span className="ml-1.5 text-xs font-medium text-gray-500 italic">Unassigned</span>
            </div>
          )}
          
          {/* Due Date */}
          <div className="flex items-center text-xs">
            <Calendar className="h-3 w-3 mr-1 text-secondary-500" />
            <span className={`${isOverdue ? 'text-danger-600 font-medium' : 'text-secondary-500'} flex items-center`}>
              {isOverdue && <AlertTriangle className="h-3 w-3 mr-1 text-danger-500" />}
              {formattedDueDate}
            </span>
          </div>
          
          {/* Created Date */}
          <div className="flex items-center text-xs">
            <Clock className="h-3 w-3 mr-1 text-secondary-400" />
            <span className="text-secondary-400">
              Created {task.createdAt ? format(parseISO(task.createdAt), 'MMM dd, yyyy') : 'Unknown'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TaskCard;