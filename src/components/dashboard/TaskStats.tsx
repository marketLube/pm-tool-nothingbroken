import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../ui/Card';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  BarChart
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { TeamType } from '../../types';

interface TaskStatsCardProps {
  title: string;
  value: number | string;
  description: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

const TaskStatsCard: React.FC<TaskStatsCardProps> = ({
  title,
  value,
  description,
  icon,
  trend,
  trendValue
}) => {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
        {trend && trendValue && (
          <div className="flex items-center mt-2">
            <span className={`text-xs font-medium ${
              trend === 'up' ? 'text-green-600' : 
              trend === 'down' ? 'text-red-600' : 
              'text-gray-600'
            }`}>
              {trendValue}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface TaskStatsProps {
  teamFilter?: TeamType;
}

const TaskStats: React.FC<TaskStatsProps> = ({ teamFilter }) => {
  const { tasks, analytics } = useData();
  
  // Filter tasks by team if filter is applied
  const filteredTasks = teamFilter 
    ? tasks.filter(task => task.team === teamFilter)
    : tasks;
  
  // Calculate task statistics
  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter(task => task.status === 'done').length;
  const inProgressTasks = filteredTasks.filter(task => task.status === 'in_progress').length;
  const notStartedTasks = filteredTasks.filter(task => task.status === 'not_started').length;
  
  // Calculate completion rate
  const completionRate = totalTasks > 0 
    ? Math.round((completedTasks / totalTasks) * 100) 
    : 0;
    
  // Get analytics data
  const teamAnalytics = teamFilter 
    ? analytics[teamFilter] 
    : {
        taskCompletion: Math.round((completedTasks / Math.max(totalTasks, 1)) * 100),
        reportSubmission: (analytics.web.reportSubmission + analytics.creative.reportSubmission) / 2,
        overdueTasksCount: analytics.web.overdueTasksCount + analytics.creative.overdueTasksCount
      };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <TaskStatsCard
        title="Completed Tasks"
        value={completedTasks}
        description={`${completionRate}% completion rate`}
        icon={<CheckCircle className="h-5 w-5 text-green-500" />}
        trend="up"
        trendValue={`${completionRate}% of total tasks`}
      />
      
      <TaskStatsCard
        title="In Progress"
        value={inProgressTasks}
        description={`${Math.round((inProgressTasks / Math.max(totalTasks, 1)) * 100)}% of total tasks`}
        icon={<Clock className="h-5 w-5 text-blue-500" />}
      />
      
      <TaskStatsCard
        title="Not Started"
        value={notStartedTasks}
        description={`${Math.round((notStartedTasks / Math.max(totalTasks, 1)) * 100)}% of total tasks`}
        icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
      />
      
      <TaskStatsCard
        title="Overdue Tasks"
        value={teamAnalytics.overdueTasksCount}
        description="Tasks past their due date"
        icon={<BarChart className="h-5 w-5 text-red-500" />}
        trend={teamAnalytics.overdueTasksCount > 2 ? 'down' : 'up'}
        trendValue={teamAnalytics.overdueTasksCount > 2 ? 'Action needed' : 'On track'}
      />
    </div>
  );
};

export default TaskStats;