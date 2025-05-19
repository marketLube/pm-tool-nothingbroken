import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import ButtonGroup from '../components/ui/ButtonGroup';
import { useAuth } from '../contexts/AuthContext';
import StatusSidebar from '../components/status/StatusSidebar';
import { AlertCircle } from 'lucide-react';

const Status: React.FC = () => {
  const { isAdmin, userTeam } = useAuth();
  const [teamFilter, setTeamFilter] = useState<'creative' | 'web'>(userTeam as 'creative' | 'web' || 'creative');
  
  // If not admin, show access denied
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600">Only administrators can manage statuses.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div></div>
        
        <div className="w-48">
          <ButtonGroup
            fullWidth
            options={[
              { value: 'creative', label: 'Creative' },
              { value: 'web', label: 'Web' }
            ]}
            value={teamFilter}
            onChange={(value) => setTeamFilter(value as 'creative' | 'web')}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">
              {teamFilter === 'creative' ? 'Creative Team' : 'Web Team'} Statuses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              These statuses will be available for {teamFilter === 'creative' ? 'Creative Team' : 'Web Team'} tasks.
              Each team has its own set of statuses.
            </p>
          </CardContent>
        </Card>
        
        <div className="md:col-span-2">
          <StatusSidebar team={teamFilter} />
        </div>
      </div>
    </div>
  );
};

export default Status; 