import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import ButtonGroup from '../components/ui/ButtonGroup';
import { BarChart3, PieChart as PieChartIcon, Users, CheckCircle } from 'lucide-react';
import { useData } from '../contexts/DataContext';

const Analytics: React.FC = () => {
  const { tasks, reports, analytics, getUsersByTeam } = useData();
  const [teamFilter, setTeamFilter] = useState<'creative' | 'web' | 'all'>('all');
  
  // Task status data
  const getTaskStatusData = () => {
    const filteredTasks = teamFilter === 'all' 
      ? tasks 
      : tasks.filter(task => task.team === teamFilter);
    
    const notStarted = filteredTasks.filter(task => task.status === 'not_started').length;
    const inProgress = filteredTasks.filter(task => task.status === 'in_progress').length;
    const done = filteredTasks.filter(task => task.status === 'done').length;
    
    return [
      { name: 'Not Started', value: notStarted, color: '#94a3b8' },
      { name: 'In Progress', value: inProgress, color: '#3b82f6' },
      { name: 'Done', value: done, color: '#22c55e' }
    ];
  };
  
  // Team comparison data (only if all teams selected)
  const getTeamComparisonData = () => {
    return [
      {
        name: 'Task Completion',
        creative: analytics.creative.taskCompletion,
        web: analytics.web.taskCompletion
      },
      {
        name: 'Report Submission',
        creative: analytics.creative.reportSubmission,
        web: analytics.web.reportSubmission
      },
      {
        name: 'Overdue Tasks',
        creative: analytics.creative.overdueTasksCount,
        web: analytics.web.overdueTasksCount
      }
    ];
  };
  
  // Team member performance
  const getTeamMemberPerformance = () => {
    const teamMembers = teamFilter === 'all'
      ? [...getUsersByTeam('creative'), ...getUsersByTeam('web')]
      : getUsersByTeam(teamFilter);
    
    // Deduplicate in case admin appears in both teams
    const uniqueMembers = Array.from(new Map(teamMembers.map(member => 
      [member.id, member]
    )).values());
    
    return uniqueMembers.map(member => {
      const memberTasks = tasks.filter(task => task.assigneeId === member.id);
      const completedTasks = memberTasks.filter(task => task.status === 'done').length;
      const completionRate = memberTasks.length > 0 
        ? Math.round((completedTasks / memberTasks.length) * 100) 
        : 0;
      
      const memberReports = reports.filter(report => report.userId === member.id);
      const submittedReports = memberReports.filter(report => report.submitted).length;
      
      return {
        name: member.name,
        taskCompletion: completionRate,
        totalTasks: memberTasks.length,
        reportsSubmitted: submittedReports
      };
    }).filter(member => member.totalTasks > 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
        
        <ButtonGroup
          options={[
            { value: 'all', label: 'All Teams' },
            { value: 'creative', label: 'Creative Team' },
            { value: 'web', label: 'Web Team' }
          ]}
          value={teamFilter}
          onChange={(value) => setTeamFilter(value as 'creative' | 'web' | 'all')}
        />
      </div>
      
      {/* Main analytics grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <PieChartIcon className="h-5 w-5 mr-2 text-blue-600" />
              Task Status Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={getTaskStatusData()}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {getTaskStatusData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        {/* Team Comparison (only if all teams selected) */}
        {teamFilter === 'all' && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                Team Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={getTeamComparisonData()}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="creative" name="Creative Team" fill="#f59e0b" />
                    <Bar dataKey="web" name="Web Team" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Team Member Performance */}
        <Card className={teamFilter === 'all' ? 'lg:col-span-2' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Users className="h-5 w-5 mr-2 text-blue-600" />
              {teamFilter === 'all' ? 'All Team Members' : `${teamFilter === 'creative' ? 'Creative' : 'Web'} Team Members`} Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={getTeamMemberPerformance()}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="taskCompletion" name="Task Completion %" fill="#22c55e" />
                  <Bar dataKey="totalTasks" name="Total Tasks" fill="#3b82f6" />
                  <Bar dataKey="reportsSubmitted" name="Reports Submitted" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        {teamFilter !== 'all' && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-blue-600" />
                {teamFilter === 'creative' ? 'Creative' : 'Web'} Team KPIs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-gray-200">
                <div className="py-4 first:pt-0">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Task Completion Rate</span>
                    <span className="text-lg font-bold text-blue-600">{analytics[teamFilter].taskCompletion}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${analytics[teamFilter].taskCompletion}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="py-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Report Submission Compliance</span>
                    <span className="text-lg font-bold text-green-600">{analytics[teamFilter].reportSubmission}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-green-600 h-2.5 rounded-full" 
                      style={{ width: `${analytics[teamFilter].reportSubmission}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="py-4 last:pb-0">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Overdue Tasks</span>
                    <span className="text-lg font-bold text-red-600">{analytics[teamFilter].overdueTasksCount}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500">
                      {analytics[teamFilter].overdueTasksCount === 0 
                        ? 'No overdue tasks - great job!' 
                        : `${analytics[teamFilter].overdueTasksCount} task${analytics[teamFilter].overdueTasksCount === 1 ? '' : 's'} need attention`}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Analytics;