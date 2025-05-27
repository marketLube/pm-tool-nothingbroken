import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useStatus } from '../contexts/StatusContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import TaskCard from '../components/tasks/TaskCard';
import { Layers, PaintBucket, LayoutList, CheckCircle, Clock, AlertTriangle, CalendarClock, AlertCircle } from 'lucide-react';
import Avatar from '../components/ui/Avatar';
import { Status, StatusCode, TeamType } from '../types';
import { canAccessStatus } from '../utils/auth/permissions';

interface TeamStatsCardProps {
  title: string;
  value: number | string;
  description: string;
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
  gradientFrom?: string;
  gradientTo?: string;
}

const TeamStatsCard: React.FC<TeamStatsCardProps> = ({
  title,
  value,
  description,
  icon,
  bgColor,
  textColor,
  gradientFrom,
  gradientTo
}) => {
  // Dynamic gradient background
  const gradientBg = gradientFrom && gradientTo 
    ? `bg-gradient-to-r from-${gradientFrom} to-${gradientTo}` 
    : bgColor.replace('border-', 'bg-');
  
  return (
    <Card className={`flex-shrink-0 w-64 overflow-hidden transform transition-all duration-200 hover:shadow-md hover:-translate-y-1 border border-gray-100`}>
      <div className={`absolute top-0 left-0 w-1 h-full ${gradientBg}`}></div>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className={`text-sm font-semibold ${textColor}`}>{title}</CardTitle>
        <div className={`flex items-center justify-center h-8 w-8 rounded-full ${gradientBg} text-white shadow-sm`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-1">
          <div className={`text-3xl font-bold ${textColor}`}>{value}</div>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
};

const Dashboard: React.FC = () => {
  const { isAdmin, userTeam, currentUser } = useAuth();
  const { tasks, getTasksByTeam } = useData();
  const { statuses, getStatusesByTeam } = useStatus();
  
  // Get tasks for each team
  const creativeTasks = getTasksByTeam('creative');
  const webTasks = getTasksByTeam('web');
  
  // Get statuses for each team
  const creativeStatuses = getStatusesByTeam('creative');
  const webStatuses = getStatusesByTeam('web');
  
  // Filter tasks based on role for display
  const displayCreativeTasks = isAdmin || userTeam === 'creative' 
    ? creativeTasks.filter(task => task.status !== 'approved')
    : [];
    
  const displayWebTasks = isAdmin || userTeam === 'web' 
    ? webTasks.filter(task => task.status !== 'completed')
    : [];

  // Get Creative team stats with actual statuses (excluding completed tasks)
  const creativeTotal = creativeTasks.filter(task => task.status !== 'approved').length;
  
  // Creative team - group by actual status categories
  const creativeCompleted = creativeTasks.filter(task => task.status === 'approved').length;
  
  const creativeInProgress = creativeTasks.filter(task => 
    ['scripting', 'script_confirmed', 'shoot_pending', 'shoot_finished', 'edit_pending', 'client_approval'].includes(task.status)
  ).length;
  
  const creativeNotStarted = creativeTasks.filter(task => task.status === 'not_started').length;
  
  const creativeCompletionRate = creativeTotal > 0 
    ? Math.round((creativeCompleted / creativeTotal) * 100) 
    : 0;

  // Calculate overdue and upcoming tasks for Creative team
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);
  
  const creativeOverdueTasks = creativeTasks.filter(task => 
    task.status !== 'approved' && 
    task.dueDate && 
    new Date(task.dueDate) < today
  ).length;
  
  const creativeUpcomingTasks = creativeTasks.filter(task => 
    task.status !== 'approved' && 
    task.dueDate && 
    new Date(task.dueDate) >= today && 
    new Date(task.dueDate) <= nextWeek
  ).length;

  // Get Web team stats with actual statuses (excluding completed tasks)
  const webTotal = webTasks.filter(task => task.status !== 'completed').length;
  
  // Web team - group by actual status categories
  const webCompleted = webTasks.filter(task => task.status === 'completed').length;
  
  const webInProgress = webTasks.filter(task => 
    ['ui_started', 'ui_finished', 'development_started', 'development_finished', 'testing', 'handed_over', 'client_reviewing'].includes(task.status)
  ).length;
  
  const webNotStarted = webTasks.filter(task => 
    ['not_started', 'proposal_awaiting'].includes(task.status)
  ).length;
  
  const webCompletionRate = webTotal > 0 
    ? Math.round((webCompleted / webTotal) * 100) 
    : 0;
     
  // Calculate overdue and upcoming tasks for Web team
  const webOverdueTasks = webTasks.filter(task => 
    task.status !== 'completed' && 
    task.dueDate && 
    new Date(task.dueDate) < today
  ).length;
  
  const webUpcomingTasks = webTasks.filter(task => 
    task.status !== 'completed' && 
    task.dueDate && 
    new Date(task.dueDate) >= today && 
    new Date(task.dueDate) <= nextWeek
  ).length;

  // Function to check if user has access to a status
  const hasAccessToStatus = (status: Status): boolean => {
    if (!currentUser) return false;
    if (isAdmin) return true;
    if (status.team !== userTeam) return false;
    
    // For non-admin users, check specific status permissions
    return currentUser.allowedStatuses?.includes(status.id) || false;
  };

  // Filter status cards to only show ones the user has access to
  const filteredCreativeStatuses = creativeStatuses.filter(hasAccessToStatus);
  const filteredWebStatuses = webStatuses.filter(hasAccessToStatus);

  // Only show team sections that the user has access to
  const showCreativeTeam = isAdmin || userTeam === 'creative';
  const showWebTeam = isAdmin || userTeam === 'web';

  // Handle task deletion
  const handleTaskDelete = (taskId: string) => {
    // The task will be automatically removed from the UI via the DataContext
    // No additional action needed here as the context will update the state
  };

  return (
    <div className="space-y-6">
      {/* Creative Team Statistics */}
      {showCreativeTeam && (
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap">
            <div className="flex items-center">
              <PaintBucket className="h-5 w-5 text-purple-600 mr-2" />
              <h2 className="text-lg font-medium text-gray-800">Creative Team</h2>
            </div>
            <div className="flex space-x-3">
              {creativeOverdueTasks > 0 && (
                <div className="flex items-center text-xs bg-red-50 text-red-700 px-2 py-1 rounded-full">
                  <AlertCircle className="h-3.5 w-3.5 mr-1" />
                  <span>{creativeOverdueTasks} overdue</span>
                </div>
              )}
              {creativeUpcomingTasks > 0 && (
                <div className="flex items-center text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full">
                  <CalendarClock className="h-3.5 w-3.5 mr-1" />
                  <span>{creativeUpcomingTasks} upcoming</span>
                </div>
              )}
            </div>
          </div>
          <div className="overflow-x-auto pb-2">
            <div className="flex space-x-4 p-1 min-w-min">
              <TeamStatsCard
                title="Total Tasks"
                value={creativeTotal}
                description="Active creative team tasks"
                icon={<Layers className="h-5 w-5" />}
                bgColor="border-purple-100"
                textColor="text-purple-700"
                gradientFrom="purple-500"
                gradientTo="pink-500"
              />
              
              {/* Only show status cards the user has access to */}
              {filteredCreativeStatuses.map(status => {
                const tasksInStatus = creativeTasks.filter(task => task.status === status.id).length;
                const percentage = creativeTotal > 0 ? Math.round((tasksInStatus / creativeTotal) * 100) : 0;
                
                let icon = <Clock className="h-5 w-5" />;
                let cardBgColor = 'border-purple-100';
                let cardTextColor = 'text-purple-700';
                let gradientFrom = 'purple-500';
                let gradientTo = 'pink-500';
                
                // Set icons and colors based on status
                if (status.id === 'approved' || status.id === 'completed') {
                  icon = <CheckCircle className="h-5 w-5" />;
                  cardBgColor = 'border-green-100';
                  cardTextColor = 'text-green-700';
                  gradientFrom = 'green-500';
                  gradientTo = 'emerald-500';
                } else if (status.id === 'not_started' || status.id === 'proposal_awaiting') {
                  icon = <AlertTriangle className="h-5 w-5" />;
                  cardBgColor = 'border-gray-100';
                  cardTextColor = 'text-gray-700';
                  gradientFrom = 'gray-400';
                  gradientTo = 'gray-500';
                }
                
                const title = status.name
                  .split('_')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ');
                
                return (
                  <TeamStatsCard
                    key={status.id}
                    title={title}
                    value={tasksInStatus}
                    description={`${percentage}% of total tasks`}
                    icon={icon}
                    bgColor={cardBgColor}
                    textColor={cardTextColor}
                    gradientFrom={gradientFrom}
                    gradientTo={gradientTo}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
      
      {/* Web Team Statistics */}
      {showWebTeam && (
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap">
            <div className="flex items-center">
              <LayoutList className="h-5 w-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-medium text-gray-800">Web Team</h2>
            </div>
            <div className="flex space-x-3">
              {webOverdueTasks > 0 && (
                <div className="flex items-center text-xs bg-red-50 text-red-700 px-2 py-1 rounded-full">
                  <AlertCircle className="h-3.5 w-3.5 mr-1" />
                  <span>{webOverdueTasks} overdue</span>
                </div>
              )}
              {webUpcomingTasks > 0 && (
                <div className="flex items-center text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full">
                  <CalendarClock className="h-3.5 w-3.5 mr-1" />
                  <span>{webUpcomingTasks} upcoming</span>
                </div>
              )}
            </div>
          </div>
          <div className="overflow-x-auto pb-2">
            <div className="flex space-x-4 p-1 min-w-min">
              <TeamStatsCard
                title="Total Tasks"
                value={webTotal}
                description="Active web team tasks"
                icon={<Layers className="h-5 w-5" />}
                bgColor="border-blue-100"
                textColor="text-blue-700"
                gradientFrom="blue-500"
                gradientTo="cyan-500"
              />

              {/* Only show status cards the user has access to */}
              {filteredWebStatuses.map(status => {
                const tasksInStatus = webTasks.filter(task => task.status === status.id).length;
                const percentage = webTotal > 0 ? Math.round((tasksInStatus / webTotal) * 100) : 0;
                
                let icon = <Clock className="h-5 w-5" />;
                let cardBgColor = 'border-blue-100';
                let cardTextColor = 'text-blue-700';
                let gradientFrom = 'blue-500';
                let gradientTo = 'cyan-500';
                
                // Set icons and colors based on status
                if (status.id === 'approved' || status.id === 'completed') {
                  icon = <CheckCircle className="h-5 w-5" />;
                  cardBgColor = 'border-green-100';
                  cardTextColor = 'text-green-700';
                  gradientFrom = 'green-500';
                  gradientTo = 'emerald-500';
                } else if (status.id === 'not_started' || status.id === 'proposal_awaiting') {
                  icon = <AlertTriangle className="h-5 w-5" />;
                  cardBgColor = 'border-gray-100';
                  cardTextColor = 'text-gray-700';
                  gradientFrom = 'gray-400';
                  gradientTo = 'gray-500';
                }
                
                const title = status.name
                  .split('_')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ');
                
                return (
                  <TeamStatsCard
                    key={status.id}
                    title={title}
                    value={tasksInStatus}
                    description={`${percentage}% of total tasks`}
                    icon={icon}
                    bgColor={cardBgColor}
                    textColor={cardTextColor}
                    gradientFrom={gradientFrom}
                    gradientTo={gradientTo}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
      
      {/* Team Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Creative Team Tasks */}
        {showCreativeTeam && (
          <div>
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                  <PaintBucket className="h-5 w-5 mr-2 text-purple-600" />
                  Creative Team Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="max-h-[500px] overflow-y-auto pr-2">
                  {displayCreativeTasks.length > 0 ? (
                    <div className="grid gap-4">
                      {displayCreativeTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onDelete={handleTaskDelete}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  <p>No active tasks found</p>
                </div>
              )}
                </div>
            </CardContent>
          </Card>
        </div>
        )}
        
        {/* Web Team Tasks */}
        {showWebTeam && (
          <div>
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <LayoutList className="h-5 w-5 mr-2 text-blue-600" />
                  Web Team Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[500px] overflow-y-auto pr-2">
                  {displayWebTasks.length > 0 ? (
                    <div className="grid gap-4">
                      {displayWebTasks.map(task => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onDelete={handleTaskDelete}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-gray-500">
                      <p>No active tasks found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

