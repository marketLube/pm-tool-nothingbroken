import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import ButtonGroup from '../components/ui/ButtonGroup';
import { useAuth } from '../contexts/AuthContext';
import StatusSidebar from '../components/status/StatusSidebar';
import { 
  AlertCircle, 
  Settings, 
  Palette, 
  Users, 
  Shield,
  Layers,
  Target,
  Workflow
} from 'lucide-react';

const Status: React.FC = () => {
  const { isAdmin, userTeam } = useAuth();
  const [teamFilter, setTeamFilter] = useState<'creative' | 'web'>(userTeam as 'creative' | 'web' || 'creative');
  
  // If not admin, show access denied with better styling
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card className="text-center p-8 shadow-lg border-0 bg-white">
            <div className="animate-fadeIn">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
                <Shield className="h-8 w-8 text-red-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-3">Access Restricted</h1>
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                Status management is restricted to administrators only. Please contact your system administrator for access.
              </p>
              <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
                <AlertCircle className="h-4 w-4" />
                <span>Administrator privileges required</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="animate-fadeIn">
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardContent className="py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 shadow-lg">
                  <Settings className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 flex items-center">
                    Status Management
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Configure workflow statuses for your teams
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <Workflow className="h-4 w-4" />
                  <span>Team Workflows</span>
                </div>
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
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Team Info Card */}
        <div className="lg:col-span-4 animate-slideIn">
          <Card className="h-full bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 shadow-sm hover:shadow-md transition-all duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center text-blue-900">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-100 mr-3">
                  {teamFilter === 'creative' ? (
                    <Palette className="h-4 w-4 text-blue-600" />
                  ) : (
                    <Target className="h-4 w-4 text-blue-600" />
                  )}
                </div>
                {teamFilter === 'creative' ? 'Creative Team' : 'Web Team'} Workflow
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-white/60 rounded-lg border border-blue-100">
                  <Users className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Team Focus</p>
                    <p className="text-xs text-blue-700">
                      {teamFilter === 'creative' 
                        ? 'Content creation, scripting, and video production workflows'
                        : 'Web development, UI/UX design, and deployment processes'
                      }
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-white/60 rounded-lg border border-blue-100">
                  <Layers className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Status Management</p>
                    <p className="text-xs text-blue-700">
                      Customize workflow stages to match your team's process
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-white/80 rounded-lg border border-blue-100">
                <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
                  <Workflow className="h-4 w-4 mr-2" />
                  Quick Tips
                </h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Drag statuses to reorder workflow stages</li>
                  <li>• Use colors to categorize status types</li>
                  <li>• Keep status names clear and concise</li>
                  <li>• Consider your team's actual workflow</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Status Management */}
        <div className="lg:col-span-8 animate-slideIn" style={{ animationDelay: '100ms' }}>
          <StatusSidebar team={teamFilter} />
        </div>
      </div>
    </div>
  );
};

export default Status; 