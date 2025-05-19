import React from 'react';
import { Card, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';
import { 
  AlertTriangle, 
  Calendar,
  Edit
} from 'lucide-react';
import { Task } from '../../types';
import { useData } from '../../contexts/DataContext';
import { format, isPast, isToday } from 'date-fns';
import { useStatus } from '../../contexts/StatusContext';

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
}

const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  isDragging = false,
  onClick
}) => {
  const { getUserById, getClientById } = useData();
  const { statuses } = useStatus();
  
  const assignee = getUserById(task.assigneeId);
  const client = getClientById(task.clientId);
  
  // Calculate if task is overdue
  const dueDate = new Date(task.dueDate);
  const isOverdue = isPast(dueDate) && !isToday(dueDate) && task.status !== 'done';
  
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

  return (
    <Card 
      className={`group mb-3 ${isDragging ? 'opacity-60' : ''} cursor-pointer animate-hover-rise animate-tap relative overflow-hidden border-l-[6px] h-full shadow-sm hover:shadow-md transition-shadow duration-200`}
      style={{ borderLeftColor: getPriorityBorderColor() }}
      onClick={onClick}
      hover
    >
      {/* Client Name Banner at top */}
      <div className="absolute top-0 left-0 right-0 py-1.5 px-3 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-b border-indigo-100">
        <div className="flex items-center">
          <span className="text-xs font-bold tracking-wide uppercase text-indigo-800 truncate">{client?.name}</span>
        </div>
      </div>
      
      {/* Edit indicator - visible on hover with animation */}
      <div className="absolute top-0 right-0 bg-blue-500 p-1 rounded-bl-md opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <Edit className="h-3 w-3 text-white" />
      </div>
      
      <CardContent className="p-4 pt-8 flex flex-col h-full">
        {/* Status and Priority Row */}
        <div className="flex justify-between items-center mb-2.5">
          <Badge variant={getStatusColor()} size="sm" className="py-0.5">
            {task.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
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
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
          {/* Assignee */}
          {assignee && (
            <div className="flex items-center">
              <Avatar 
                src={assignee.avatar} 
                name={assignee.name} 
                size="xs" 
              />
              <span className="ml-1.5 text-xs font-medium text-secondary-700">{assignee.name.split(' ')[0]}</span>
            </div>
          )}
          
          {/* Due Date */}
          <div className="flex items-center text-xs">
            <Calendar className="h-3 w-3 mr-1 text-secondary-500" />
            <span className={isOverdue ? 'text-danger-600 font-medium' : 'text-secondary-500'}>
              {isOverdue && <AlertTriangle className="h-3 w-3 mr-1 inline text-danger-500" />}
              {formattedDueDate}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TaskCard;