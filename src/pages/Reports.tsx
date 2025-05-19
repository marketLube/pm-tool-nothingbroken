import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, subDays, parseISO, isWithinInterval } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  Edit, 
  Clock, 
  Calendar, 
  Filter,
  Users,
  Briefcase,
  BarChart2 
} from 'lucide-react';
import { TeamType } from '../types';

// Define date filter types
type DateFilterType = 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'custom';

const Reports: React.FC = () => {
  const { currentUser, isAdmin, isManager } = useAuth();
  const { 
    reports, 
    users, 
    clients, 
    getReportsByDate, 
    getUserById, 
    getTaskById, 
    submitReport, 
    approveReport 
  } = useData();
  
  // State for the report creation form
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<{taskId: string, hours: number, notes: string}[]>([
    { taskId: '', hours: 0, notes: '' }
  ]);
  const [feedbackText, setFeedbackText] = useState('');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  // Filter states
  const [dateFilter, setDateFilter] = useState<DateFilterType>('today');
  const [customStartDate, setCustomStartDate] = useState<string>(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [teamFilter, setTeamFilter] = useState<'all' | TeamType>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'approved' | 'rejected' | 'pending'>('all');
  
  // Get dates based on filter
  const getFilterDates = () => {
    const today = new Date();
    
    switch (dateFilter) {
      case 'today':
        return { startDate: format(today, 'yyyy-MM-dd'), endDate: format(today, 'yyyy-MM-dd') };
      case 'yesterday':
        const yesterday = subDays(today, 1);
        return { startDate: format(yesterday, 'yyyy-MM-dd'), endDate: format(yesterday, 'yyyy-MM-dd') };
      case 'last7':
        return { startDate: format(subDays(today, 6), 'yyyy-MM-dd'), endDate: format(today, 'yyyy-MM-dd') };
      case 'last30':
        return { startDate: format(subDays(today, 29), 'yyyy-MM-dd'), endDate: format(today, 'yyyy-MM-dd') };
      case 'thisMonth':
        return { 
          startDate: format(startOfMonth(today), 'yyyy-MM-dd'), 
          endDate: format(endOfMonth(today), 'yyyy-MM-dd') 
        };
      case 'custom':
        return { startDate: customStartDate, endDate: customEndDate };
      default:
        return { startDate: format(today, 'yyyy-MM-dd'), endDate: format(today, 'yyyy-MM-dd') };
    }
  };

  // Get filtered reports
  const getFilteredReports = () => {
    const { startDate, endDate } = getFilterDates();
    
    // Filter by date range
    let filteredReports = reports.filter(report => {
      const reportDate = parseISO(report.date);
      return isWithinInterval(reportDate, {
        start: parseISO(startDate),
        end: parseISO(endDate)
      });
    });
    
    // Filter by team if needed
    if (teamFilter !== 'all') {
      const teamUserIds = users
        .filter(user => user.team === teamFilter)
        .map(user => user.id);
      
      filteredReports = filteredReports.filter(report => teamUserIds.includes(report.userId));
    }
    
    // Filter by employee if needed
    if (employeeFilter !== 'all') {
      filteredReports = filteredReports.filter(report => report.userId === employeeFilter);
    }
    
    // Filter by report status if needed
    if (statusFilter !== 'all') {
      if (statusFilter === 'submitted') {
        filteredReports = filteredReports.filter(report => report.submitted);
      } else if (statusFilter === 'approved') {
        filteredReports = filteredReports.filter(report => report.approved === true);
      } else if (statusFilter === 'rejected') {
        filteredReports = filteredReports.filter(report => report.approved === false);
      } else if (statusFilter === 'pending') {
        filteredReports = filteredReports.filter(report => report.submitted && report.approved === null);
      }
    }
    
    // Filter by client (by looking at associated tasks) if needed
    if (clientFilter !== 'all') {
      filteredReports = filteredReports.filter(report => {
        // Check if any tasks in this report are for the selected client
        const reportTaskIds = report.tasks.map(t => t.taskId);
        const reportTasks = reportTaskIds.map(id => getTaskById(id)).filter(Boolean);
        return reportTasks.some(task => task?.clientId === clientFilter);
      });
    }
    
    // If not admin or manager, only show current user's reports
    if (!isAdmin && !isManager) {
      filteredReports = filteredReports.filter(report => report.userId === currentUser?.id);
    }
    
    return filteredReports;
  };
  
  // Filtered reports based on all selected filters
  const filteredReports = getFilteredReports();
  
  // Get today's date
  const today = format(new Date(), 'yyyy-MM-dd');
  
  // Check if current user has submitted a report today
  const hasSubmittedToday = currentUser 
    ? reports.some(report => report.userId === currentUser.id && report.date === today && report.submitted)
    : false;
  
  // Get active users for the employee filter
  const activeUsers = users.filter(user => user.isActive);
  
  // Get team-specific users when team filter is applied
  const filteredUsers = teamFilter === 'all' 
    ? activeUsers 
    : activeUsers.filter(user => user.team === teamFilter || user.role === 'admin');

  // Reset employee filter when team filter changes
  useEffect(() => {
    setEmployeeFilter('all');
  }, [teamFilter]);
  
  // Calculate total hours for filtered reports
  const totalHoursLogged = filteredReports.reduce((total, report) => total + report.totalHours, 0);
  
  // Calculate average hours per report
  const averageHoursPerReport = filteredReports.length > 0 
    ? (totalHoursLogged / filteredReports.length).toFixed(1) 
    : '0';
  
  // Handle form actions
  const handleAddTask = () => {
    setSelectedTasks([...selectedTasks, { taskId: '', hours: 0, notes: '' }]);
  };
  
  const handleRemoveTask = (index: number) => {
    if (selectedTasks.length > 1) {
      const newTasks = [...selectedTasks];
      newTasks.splice(index, 1);
      setSelectedTasks(newTasks);
    }
  };
  
  const handleTaskChange = (index: number, field: 'taskId' | 'hours' | 'notes', value: string | number) => {
    const newTasks = [...selectedTasks];
    newTasks[index] = { ...newTasks[index], [field]: value };
    setSelectedTasks(newTasks);
  };
  
  const handleSubmitReport = () => {
    if (!currentUser) return;
    
    setIsSubmitting(true);
    
    // Calculate total hours
    const totalHours = selectedTasks.reduce((sum, task) => sum + (Number(task.hours) || 0), 0);
    
    // Filter out incomplete task entries
    const validTasks = selectedTasks.filter(task => task.taskId && task.hours > 0);
    
    if (validTasks.length === 0) {
      // Show error
      setIsSubmitting(false);
      return;
    }
    
    // Submit the report
    submitReport(currentUser.id, {
      date: today,
      tasks: validTasks,
      totalHours
    });
    
    // Reset form
    setSelectedTasks([{ taskId: '', hours: 0, notes: '' }]);
    setIsSubmitting(false);
  };
  
  const handleApproveReport = (reportId: string, approved: boolean) => {
    approveReport(reportId, approved, approved ? '' : feedbackText);
    setSelectedReportId(null);
    setFeedbackText('');
  };

  // Helper to format date ranges for display
  const getDateRangeDisplay = () => {
    const { startDate, endDate } = getFilterDates();
    if (startDate === endDate) {
      return format(parseISO(startDate), 'MMMM d, yyyy');
    }
    return `${format(parseISO(startDate), 'MMM d')} - ${format(parseISO(endDate), 'MMM d, yyyy')}`;
  };
  
  // Determine status badge styling
  const getReportStatusBadge = (report: typeof reports[0]) => {
    if (!report.submitted) {
      return <Badge variant="warning">Not Submitted</Badge>;
    }
    
    if (report.approved === null) {
      return <Badge variant="info">Pending Review</Badge>;
    }
    
    if (report.approved) {
      return <Badge variant="success">Approved</Badge>;
    }
    
    return <Badge variant="danger">Needs Revision</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">Daily Reports</h1>
        
        {(isAdmin || isManager) && filteredReports.length > 0 && (
          <div className="flex items-center space-x-3 text-sm text-gray-600">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1 text-blue-600" />
              <span>Total Hours: <strong>{totalHoursLogged}</strong></span>
            </div>
            <div className="flex items-center">
              <BarChart2 className="h-4 w-4 mr-1 text-purple-600" />
              <span>Avg: <strong>{averageHoursPerReport}h</strong> per report</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Filters Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <Filter className="h-5 w-5 mr-2 text-blue-600" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Date Filter */}
            <div className="md:col-span-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <div className="flex space-x-2">
                <select
                  className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as DateFilterType)}
                >
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="last7">Last 7 Days</option>
                  <option value="last30">Last 30 Days</option>
                  <option value="thisMonth">This Month</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>
              
              {dateFilter === 'custom' && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Team Filter - Only for admins */}
            {isAdmin && (
              <div className="md:col-span-2">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Team
                  </label>
                  <select
                    className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={teamFilter}
                    onChange={(e) => setTeamFilter(e.target.value as 'all' | TeamType)}
                  >
                    <option value="all">All Teams</option>
                    <option value="creative">Creative Team</option>
                    <option value="web">Web Team</option>
                  </select>
                </div>
              </div>
            )}
            
            {/* Employee Filter */}
            <div className="md:col-span-2">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee
                </label>
                <select
                  className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={employeeFilter}
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                  disabled={!isAdmin && !isManager}
                >
                  <option value="all">All Employees</option>
                  {filteredUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} {user.role === 'admin' ? '(Admin)' : user.role === 'manager' ? '(Manager)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Client Filter */}
            <div className="md:col-span-2">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client
                </label>
                <select
                  className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                >
                  <option value="all">All Clients</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Status Filter */}
            <div className="md:col-span-2">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'submitted' | 'approved' | 'rejected' | 'pending')}
                >
                  <option value="all">All Statuses</option>
                  <option value="submitted">Submitted</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="pending">Pending Review</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Active Filters */}
          {(teamFilter !== 'all' || employeeFilter !== 'all' || clientFilter !== 'all' || dateFilter !== 'today') && (
            <div className="flex flex-wrap gap-2 mt-4">
              <div className="inline-flex items-center bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
                <Calendar className="h-3.5 w-3.5 mr-1" />
                <span>{getDateRangeDisplay()}</span>
              </div>
              
              {teamFilter !== 'all' && (
                <div className="inline-flex items-center bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm">
                  <Users className="h-3.5 w-3.5 mr-1" />
                  <span>{teamFilter === 'creative' ? 'Creative Team' : 'Web Team'}</span>
                  <button 
                    className="ml-2 text-green-500 hover:text-green-700"
                    onClick={() => setTeamFilter('all')}
                  >
                    &times;
                  </button>
                </div>
              )}
              
              {employeeFilter !== 'all' && (
                <div className="inline-flex items-center bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm">
                  <Users className="h-3.5 w-3.5 mr-1" />
                  <span>{filteredUsers.find(u => u.id === employeeFilter)?.name}</span>
                  <button 
                    className="ml-2 text-purple-500 hover:text-purple-700"
                    onClick={() => setEmployeeFilter('all')}
                  >
                    &times;
                  </button>
                </div>
              )}
              
              {clientFilter !== 'all' && (
                <div className="inline-flex items-center bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full text-sm">
                  <Briefcase className="h-3.5 w-3.5 mr-1" />
                  <span>{clients.find(c => c.id === clientFilter)?.name}</span>
                  <button 
                    className="ml-2 text-yellow-500 hover:text-yellow-700"
                    onClick={() => setClientFilter('all')}
                  >
                    &times;
                  </button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Submit Report Section - Only show for regular users and if they haven't submitted today */}
      {!hasSubmittedToday && !isAdmin && !isManager && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <FileText className="h-5 w-5 mr-2 text-blue-600" />
              Submit Today's Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-md text-blue-800 text-sm mb-4">
                Please log all the tasks you've worked on today.
              </div>
              
              {selectedTasks.map((task, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-md">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-5">
                      <Select
                        label="Task"
                        options={[
                          { value: '', label: 'Select a task...' },
                          ...useData().getTasksByUser(currentUser?.id || '').map(task => ({
                            value: task.id,
                            label: task.title
                          }))
                        ]}
                        value={task.taskId}
                        onChange={(e) => handleTaskChange(index, 'taskId', e.target.value)}
                        fullWidth
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Input
                        label="Hours"
                        type="number"
                        min="0"
                        step="0.5"
                        value={task.hours.toString()}
                        onChange={(e) => handleTaskChange(index, 'hours', parseFloat(e.target.value))}
                        fullWidth
                      />
                    </div>
                    <div className="md:col-span-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notes
                        </label>
                        <textarea
                          value={task.notes}
                          onChange={(e) => handleTaskChange(index, 'notes', e.target.value)}
                          className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {selectedTasks.length > 1 && (
                    <div className="mt-2 text-right">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleRemoveTask(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              
              <div className="flex justify-between">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleAddTask}
                >
                  Add Another Task
                </Button>
                
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSubmitReport}
                  isLoading={isSubmitting}
                  disabled={selectedTasks.some(task => !task.taskId || task.hours <= 0)}
                >
                  Submit Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Reports List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <Clock className="h-5 w-5 mr-2 text-blue-600" />
            Reports for {getDateRangeDisplay()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReports.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {filteredReports.map((report) => {
                const user = getUserById(report.userId);
                
                return (
                  <div key={report.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar
                          src={user?.avatar}
                          name={user?.name}
                          size="sm"
                        />
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">
                            {user?.name || 'Unknown User'}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {user?.team === 'creative' ? 'Creative Team' : 'Web Team'} · {report.totalHours} hours · {report.tasks.length} tasks · {format(parseISO(report.date), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getReportStatusBadge(report)}
                      </div>
                    </div>
                    
                    {report.submitted && (
                      <div className="mt-3 text-sm text-gray-600">
                        <h5 className="font-medium mb-1">Tasks worked on:</h5>
                        <ul className="list-disc pl-5 space-y-1">
                          {report.tasks.map((taskEntry) => {
                            const task = getTaskById(taskEntry.taskId);
                            const client = task ? clients.find(c => c.id === task.clientId) : null;
                            
                            return (
                              <li key={taskEntry.taskId}>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <span className="font-medium">{task?.title || `Task #${taskEntry.taskId}`}</span> - {taskEntry.hours} hours
                                    {client && <span className="text-xs text-gray-500 ml-2">({client.name})</span>}
                                  </div>
                                  
                                  <div>
                                    {task && (
                                      <Badge 
                                        variant={
                                          task.status === 'done' ? 'success' : 
                                          task.status === 'in_progress' ? 'warning' : 
                                          'default'
                                        }
                                        size="sm"
                                      >
                                        {task.status.replace('_', ' ')}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                
                                {taskEntry.notes && (
                                  <div className="text-xs text-gray-500 mt-1 bg-gray-50 p-2 rounded">
                                    {taskEntry.notes}
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                        
                        {report.approved === false && report.feedback && (
                          <div className="mt-3 p-3 bg-red-50 text-red-700 text-sm rounded">
                            <strong>Feedback:</strong> {report.feedback}
                          </div>
                        )}
                        
                        {(isAdmin || isManager) && report.approved === null && (
                          <div className="mt-3">
                            {selectedReportId === report.id ? (
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Feedback (only required if rejecting)
                                  </label>
                                  <textarea
                                    value={feedbackText}
                                    onChange={(e) => setFeedbackText(e.target.value)}
                                    className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    rows={2}
                                  />
                                </div>
                                <div className="flex space-x-2">
                                  <Button
                                    size="xs"
                                    variant="primary"
                                    icon={CheckCircle}
                                    onClick={() => handleApproveReport(report.id, true)}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="xs"
                                    variant="danger"
                                    icon={XCircle}
                                    disabled={!feedbackText.trim()}
                                    onClick={() => handleApproveReport(report.id, false)}
                                  >
                                    Reject
                                  </Button>
                                  <Button
                                    size="xs"
                                    variant="secondary"
                                    onClick={() => setSelectedReportId(null)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button
                                size="xs"
                                variant="primary"
                                icon={Edit}
                                onClick={() => setSelectedReportId(report.id)}
                              >
                                Review Report
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {!report.submitted && (
                      <div className="mt-3 flex items-center text-sm text-amber-600">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>Report not submitted yet</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-6 text-center text-gray-500">
              <Clock className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p>No reports found for the selected filters</p>
            </div>
          )}
        </CardContent>
        {filteredReports.length > 0 && (
          <CardFooter className="bg-gray-50 px-4 py-3 text-right">
            <p className="text-sm text-gray-600">
              Showing {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''} · Total Hours: {totalHoursLogged}
            </p>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default Reports;