import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import TaskCard from '../components/tasks/TaskCard';
import { Layers, PaintBucket, LayoutList, CheckCircle, Clock, AlertTriangle, CalendarClock, AlertCircle } from 'lucide-react';
import Avatar from '../components/ui/Avatar';

interface TeamStatsCardProps {
  title: string;
  value: number | string;
  description: string;
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
}

const TeamStatsCard: React.FC<TeamStatsCardProps> = ({
  title,
  value,
  description,
  icon,
  bgColor,
  textColor
}) => {
  return (
    <Card className={`flex-shrink-0 w-60 border ${bgColor} bg-opacity-10`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className={`text-sm font-medium ${textColor}`}>{title}</CardTitle>
        <div className={`${textColor}`}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${textColor}`}>{value}</div>
        <p className="text-xs text-gray-600 mt-1">{description}</p>
      </CardContent>
    </Card>
  );
};

const Dashboard: React.FC = () => {
  const { isAdmin, userTeam, currentUser } = useAuth();
  const { tasks, getTasksByTeam } = useData();
  
  // Get tasks for each team
  const creativeTasks = getTasksByTeam('creative');
  const webTasks = getTasksByTeam('web');
  
  // Filter tasks based on role for display
  const displayCreativeTasks = isAdmin || userTeam === 'creative' 
    ? creativeTasks.filter(task => task.status !== 'approved')
    : [];
    
  const displayWebTasks = isAdmin || userTeam === 'web' 
    ? webTasks.filter(task => task.status !== 'completed')
    : [];

  // Get Creative team stats with actual statuses
  const creativeTotal = creativeTasks.length;
  
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

  // Get Web team stats with actual statuses
  const webTotal = webTasks.length;
  
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

  // Creative team detailed status counts
  const creativeScripting = creativeTasks.filter(task => task.status === 'scripting').length;
  const creativeScriptConfirmed = creativeTasks.filter(task => task.status === 'script_confirmed').length;
  const creativeShootPending = creativeTasks.filter(task => task.status === 'shoot_pending').length;
  const creativeShootFinished = creativeTasks.filter(task => task.status === 'shoot_finished').length;
  const creativeEditPending = creativeTasks.filter(task => task.status === 'edit_pending').length;
  const creativeClientApproval = creativeTasks.filter(task => task.status === 'client_approval').length;

  // Web team detailed status counts
  const webProposalAwaiting = webTasks.filter(task => task.status === 'proposal_awaiting').length;
  const webUiStarted = webTasks.filter(task => task.status === 'ui_started').length;
  const webUiFinished = webTasks.filter(task => task.status === 'ui_finished').length;
  const webDevStarted = webTasks.filter(task => task.status === 'development_started').length;
  const webDevFinished = webTasks.filter(task => task.status === 'development_finished').length;
  const webTesting = webTasks.filter(task => task.status === 'testing').length;
  const webHandedOver = webTasks.filter(task => task.status === 'handed_over').length;
  const webClientReviewing = webTasks.filter(task => task.status === 'client_reviewing').length;

  return (
    <div className="space-y-6">
      {/* Creative Team Statistics */}
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
          <div className="flex space-x-4 min-w-min">
            <TeamStatsCard
              title="Total Tasks"
              value={creativeTotal}
              description="All creative team tasks"
              icon={<Layers className="h-5 w-5" />}
              bgColor="border-purple-100"
              textColor="text-purple-700"
            />
            <TeamStatsCard
              title="Not Started"
              value={creativeNotStarted}
              description={`${Math.round((creativeNotStarted / Math.max(creativeTotal, 1)) * 100)}% of total tasks`}
              icon={<AlertTriangle className="h-5 w-5" />}
              bgColor="border-gray-100"
              textColor="text-gray-700"
            />
            <TeamStatsCard
              title="Scripting"
              value={creativeScripting}
              description="Scripts in progress"
              icon={<Clock className="h-5 w-5" />}
              bgColor="border-purple-100"
              textColor="text-purple-700"
            />
            <TeamStatsCard
              title="Script Confirmed"
              value={creativeScriptConfirmed}
              description="Ready for production"
              icon={<CheckCircle className="h-5 w-5" />}
              bgColor="border-indigo-100"
              textColor="text-indigo-700"
            />
            <TeamStatsCard
              title="Shoot Pending"
              value={creativeShootPending}
              description="Awaiting shoot"
              icon={<Clock className="h-5 w-5" />}
              bgColor="border-orange-100"
              textColor="text-orange-700"
            />
            <TeamStatsCard
              title="Shoot Finished"
              value={creativeShootFinished}
              description="Shoot completed"
              icon={<CheckCircle className="h-5 w-5" />}
              bgColor="border-amber-100"
              textColor="text-amber-700"
            />
            <TeamStatsCard
              title="Edit Pending"
              value={creativeEditPending}
              description="In post-production"
              icon={<Clock className="h-5 w-5" />}
              bgColor="border-blue-100"
              textColor="text-blue-700"
            />
            <TeamStatsCard
              title="Client Approval"
              value={creativeClientApproval}
              description="Awaiting client feedback"
              icon={<Clock className="h-5 w-5" />}
              bgColor="border-pink-100"
              textColor="text-pink-700"
            />
            <TeamStatsCard
              title="Approved"
              value={creativeCompleted}
              description={`${creativeCompletionRate}% completion rate`}
              icon={<CheckCircle className="h-5 w-5" />}
              bgColor="border-green-100"
              textColor="text-green-700"
            />
          </div>
        </div>
      </div>
      
      {/* Web Team Statistics */}
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
          <div className="flex space-x-4 min-w-min">
            <TeamStatsCard
              title="Total Tasks"
              value={webTotal}
              description="All web team tasks"
              icon={<Layers className="h-5 w-5" />}
              bgColor="border-blue-100"
              textColor="text-blue-700"
            />
            <TeamStatsCard
              title="Proposal Awaiting"
              value={webProposalAwaiting}
              description="Needs proposal"
              icon={<AlertTriangle className="h-5 w-5" />}
              bgColor="border-gray-100"
              textColor="text-gray-700"
            />
            <TeamStatsCard
              title="Not Started"
              value={webTasks.filter(task => task.status === 'not_started').length}
              description="Yet to begin"
              icon={<AlertTriangle className="h-5 w-5" />}
              bgColor="border-gray-100"
              textColor="text-gray-700"
            />
            <TeamStatsCard
              title="UI Started"
              value={webUiStarted}
              description="Design in progress"
              icon={<Clock className="h-5 w-5" />}
              bgColor="border-purple-100"
              textColor="text-purple-700"
            />
            <TeamStatsCard
              title="UI Finished"
              value={webUiFinished}
              description="Design completed"
              icon={<CheckCircle className="h-5 w-5" />}
              bgColor="border-indigo-100"
              textColor="text-indigo-700"
            />
            <TeamStatsCard
              title="Development Started"
              value={webDevStarted}
              description="In development"
              icon={<Clock className="h-5 w-5" />}
              bgColor="border-blue-100"
              textColor="text-blue-700"
            />
            <TeamStatsCard
              title="Development Finished"
              value={webDevFinished}
              description="Development completed"
              icon={<CheckCircle className="h-5 w-5" />}
              bgColor="border-cyan-100"
              textColor="text-cyan-700"
            />
            <TeamStatsCard
              title="Testing"
              value={webTesting}
              description="QA in progress"
              icon={<Clock className="h-5 w-5" />}
              bgColor="border-orange-100"
              textColor="text-orange-700"
            />
            <TeamStatsCard
              title="Handed Over"
              value={webHandedOver}
              description="Ready for review"
              icon={<CheckCircle className="h-5 w-5" />}
              bgColor="border-amber-100"
              textColor="text-amber-700"
            />
            <TeamStatsCard
              title="Client Reviewing"
              value={webClientReviewing}
              description="Client feedback stage"
              icon={<Clock className="h-5 w-5" />}
              bgColor="border-pink-100"
              textColor="text-pink-700"
            />
            <TeamStatsCard
              title="Completed"
              value={webCompleted}
              description={`${webCompletionRate}% completion rate`}
              icon={<CheckCircle className="h-5 w-5" />}
              bgColor="border-green-100"
              textColor="text-green-700"
            />
          </div>
        </div>
      </div>
      
      {/* Team Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Creative Team Tasks */}
        {(isAdmin || userTeam === 'creative') && (
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
        {(isAdmin || userTeam === 'web') && (
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

