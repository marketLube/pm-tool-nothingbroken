import React, { useState, useEffect } from 'react';
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
  BarChart3,
  AlertCircle,
  Users
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
  const { analytics, searchTasks } = useData();
  const [taskData, setTaskData] = useState({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    notStartedTasks: 0,
    completionRate: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  
  // Database search effect
  useEffect(() => {
    const loadTaskStats = async () => {
      setIsLoading(true);
      try {
        // Build search filters
        const filters = {
          team: teamFilter,
          sortBy: 'createdDate' as const
        };

        const searchResults = await searchTasks(filters);
        
        // Calculate statistics from search results
        const totalTasks = searchResults.length;
        const completedTasks = searchResults.filter(task => task.status === 'done').length;
        const inProgressTasks = searchResults.filter(task => task.status === 'in_progress').length;
        const notStartedTasks = searchResults.filter(task => task.status === 'not_started').length;
        
        // Calculate completion rate
        const completionRate = totalTasks > 0 
          ? Math.round((completedTasks / totalTasks) * 100) 
          : 0;
          
        setTaskData({
          totalTasks,
          completedTasks,
          inProgressTasks,
          notStartedTasks,
          completionRate
        });
        
        console.log(`[TaskStats Database Search] Found ${totalTasks} tasks for ${teamFilter || 'all teams'}`);
      } catch (error) {
        console.error('Error loading task stats:', error);
        // Set default values on error
        setTaskData({
          totalTasks: 0,
          completedTasks: 0,
          inProgressTasks: 0,
          notStartedTasks: 0,
          completionRate: 0
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadTaskStats();
  }, [teamFilter, searchTasks]);
    
  // Get analytics data for overdue tasks
  const teamAnalytics = teamFilter 
    ? analytics[teamFilter] 
    : {
        taskCompletion: taskData.completionRate,
        reportSubmission: (analytics.web.reportSubmission + analytics.creative.reportSubmission) / 2,
        overdueTasksCount: analytics.web.overdueTasksCount + analytics.creative.overdueTasksCount
      };

  const stats = [
    {
      title: 'Total Tasks',
      value: isLoading ? '...' : taskData.totalTasks.toString(),
      icon: BarChart3,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Completed',
      value: isLoading ? '...' : taskData.completedTasks.toString(),
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'In Progress',
      value: isLoading ? '...' : taskData.inProgressTasks.toString(),
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      title: 'Overdue',
      value: isLoading ? '...' : teamAnalytics.overdueTasksCount.toString(),
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stat.value}
                </p>
                {stat.title === 'Completed' && !isLoading && (
                  <p className="text-xs text-gray-500 mt-1">
                    {taskData.completionRate}% completion rate
                  </p>
                )}
              </div>
              <div className={`p-3 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default TaskStats;