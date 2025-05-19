import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import { useData } from '../contexts/DataContext';
import { Settings as SettingsIcon, Bell, UserCog, Shield } from 'lucide-react';

const Settings: React.FC = () => {
  const { teams, updateTeam, getUserById } = useData();
  
  // Mock settings state
  const [appSettings, setAppSettings] = useState({
    emailNotifications: true,
    reportReminders: true,
    taskDeadlineAlert: true,
    darkMode: false,
    autoLogout: 60
  });
  
  const handleSettingChange = (setting: string, value: boolean | number) => {
    setAppSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };
  
  const handleTeamUpdate = (teamId: string, field: string, value: string) => {
    const team = teams.find(t => t.id === teamId);
    
    if (team) {
      updateTeam({
        ...team,
        [field]: value
      });
    }
  };
  
  const logoutOptions = [
    { value: '30', label: '30 minutes' },
    { value: '60', label: '1 hour' },
    { value: '120', label: '2 hours' },
    { value: '240', label: '4 hours' },
    { value: '0', label: 'Never' }
  ];

  return (
    <div className="space-y-6">
      {/* App Settings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <SettingsIcon className="h-5 w-5 mr-2 text-blue-600" />
            Application Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 flex items-center">
              <Bell className="h-4 w-4 mr-2 text-blue-600" />
              Notifications
            </h3>
            
            <div className="ml-6 space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="emailNotifications" className="text-sm text-gray-700">Email notifications</label>
                <div className="relative inline-block w-10 mr-2 align-middle select-none">
                  <input
                    type="checkbox"
                    id="emailNotifications"
                    checked={appSettings.emailNotifications}
                    onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`block h-6 rounded-full w-10 ${appSettings.emailNotifications ? 'bg-blue-600' : 'bg-gray-300'} transition-colors duration-200`}
                  ></div>
                  <div
                    className={`dot absolute left-1 top-1 bg-white h-4 w-4 rounded-full transition-transform duration-200 ${appSettings.emailNotifications ? 'transform translate-x-4' : ''}`}
                  ></div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <label htmlFor="reportReminders" className="text-sm text-gray-700">Daily report reminders</label>
                <div className="relative inline-block w-10 mr-2 align-middle select-none">
                  <input
                    type="checkbox"
                    id="reportReminders"
                    checked={appSettings.reportReminders}
                    onChange={(e) => handleSettingChange('reportReminders', e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`block h-6 rounded-full w-10 ${appSettings.reportReminders ? 'bg-blue-600' : 'bg-gray-300'} transition-colors duration-200`}
                  ></div>
                  <div
                    className={`dot absolute left-1 top-1 bg-white h-4 w-4 rounded-full transition-transform duration-200 ${appSettings.reportReminders ? 'transform translate-x-4' : ''}`}
                  ></div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <label htmlFor="taskDeadlineAlert" className="text-sm text-gray-700">Task deadline alerts</label>
                <div className="relative inline-block w-10 mr-2 align-middle select-none">
                  <input
                    type="checkbox"
                    id="taskDeadlineAlert"
                    checked={appSettings.taskDeadlineAlert}
                    onChange={(e) => handleSettingChange('taskDeadlineAlert', e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`block h-6 rounded-full w-10 ${appSettings.taskDeadlineAlert ? 'bg-blue-600' : 'bg-gray-300'} transition-colors duration-200`}
                  ></div>
                  <div
                    className={`dot absolute left-1 top-1 bg-white h-4 w-4 rounded-full transition-transform duration-200 ${appSettings.taskDeadlineAlert ? 'transform translate-x-4' : ''}`}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 flex items-center">
              <Shield className="h-4 w-4 mr-2 text-blue-600" />
              Security
            </h3>
            
            <div className="ml-6">
              <Select
                label="Auto logout after inactivity"
                options={logoutOptions}
                value={appSettings.autoLogout.toString()}
                onChange={(e) => handleSettingChange('autoLogout', parseInt(e.target.value))}
                fullWidth={false}
                className="max-w-xs"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t border-gray-200 flex justify-end pt-4">
          <Button variant="primary">Save Settings</Button>
        </CardFooter>
      </Card>
      
      {/* Team Settings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <UserCog className="h-5 w-5 mr-2 text-blue-600" />
            Team Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {teams.map((team) => {
              const manager = getUserById(team.managerId);
              
              return (
                <div key={team.id} className="bg-gray-50 p-4 rounded-md">
                  <h3 className="font-medium text-gray-900 mb-3">{team.name}</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Team Name"
                      value={team.name}
                      onChange={(e) => handleTeamUpdate(team.id, 'name', e.target.value)}
                      fullWidth
                    />
                    
                    <Select
                      label="Team Manager"
                      options={[
                        { value: manager?.id || '', label: manager?.name || 'Select manager...' },
                        ...useData().getUsersByTeam(team.id)
                          .filter(user => user.role !== 'admin' && user.id !== manager?.id)
                          .map(user => ({
                            value: user.id,
                            label: user.name
                          }))
                      ]}
                      value={team.managerId}
                      onChange={(e) => handleTeamUpdate(team.id, 'managerId', e.target.value)}
                      fullWidth
                    />
                  </div>
                  
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Team Description
                    </label>
                    <textarea
                      value={team.description}
                      onChange={(e) => handleTeamUpdate(team.id, 'description', e.target.value)}
                      rows={2}
                      className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
        <CardFooter className="border-t border-gray-200 flex justify-end pt-4">
          <Button variant="primary">Save Team Settings</Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Settings;