import React, { useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { getIndiaDate } from '../../utils/timezone';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../ui/Card';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

const RecentReports: React.FC = () => {
  const { 
    reports,
    users,
    getUserById
  } = useData();
  
  // Get recent reports for current user
  const recentReports = useMemo(() => {
    return reports
      .filter(report => report.submitted)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [reports]);

  const getStatusBadge = (report: typeof reports[0]) => {
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
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Daily Work Reports</CardTitle>
      </CardHeader>
      <CardContent>
        {recentReports.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {recentReports.map((report) => {
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
                          {report.totalHours} hours · {report.tasks.length} tasks
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(report)}
                    </div>
                  </div>
                  
                  {report.submitted && (
                    <div className="mt-3 text-sm text-gray-600">
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span>Tasks worked on:</span>
                        {report.tasks.map((task, index) => (
                          <span key={task.taskId}>
                            {index > 0 && ", "}
                            {task.hours}h on Task #{task.taskId.replace('task', '')}
                          </span>
                        ))}
                      </div>
                      
                      {report.approved === false && report.feedback && (
                        <div className="mt-2 p-2 bg-red-50 text-red-700 text-xs rounded">
                          <strong>Feedback:</strong> {report.feedback}
                        </div>
                      )}
                      
                      {report.approved === null && (
                        <div className="mt-2 flex space-x-2">
                          <Button
                            size="xs"
                            variant="primary"
                            icon={CheckCircle}
                          >
                            Approve
                          </Button>
                          <Button
                            size="xs"
                            variant="secondary"
                            icon={XCircle}
                          >
                            Reject
                          </Button>
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
            <p>No reports submitted today</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentReports;