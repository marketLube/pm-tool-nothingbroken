import React, { useState } from 'react';
import { useStatus, Status } from '../../contexts/StatusContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { TeamType } from '../../types';

interface StatusFormData {
  name: string;
  color: string;
}

interface StatusSidebarProps {
  team?: TeamType;
}

const StatusSidebar: React.FC<StatusSidebarProps> = ({ team }) => {
  const { statuses, addStatus, updateStatus, deleteStatus, getStatusesByTeam } = useStatus();
  const { userTeam } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<StatusFormData>({
    name: '',
    color: '#3b82f6'
  });

  // Use the provided team prop if available, otherwise use the user's team
  const currentTeam = team || userTeam || 'creative';
  const teamStatuses = getStatusesByTeam(currentTeam);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    addStatus({
      ...formData,
      team: currentTeam,
      order: teamStatuses.length
    });

    setFormData({ name: '', color: '#3b82f6' });
    setIsAdding(false);
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Status Management</span>
          <Button
            variant="ghost"
            size="sm"
            icon={Plus}
            onClick={() => setIsAdding(true)}
          >
            Add Status
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isAdding && (
          <form onSubmit={handleSubmit} className="mb-4 p-3 bg-gray-50 rounded-md">
            <Input
              label="Status Name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              fullWidth
              required
            />
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                className="h-8 w-full rounded cursor-pointer"
              />
            </div>
            <div className="flex justify-end space-x-2 mt-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsAdding(false)}
                type="button"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
              >
                Add Status
              </Button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {teamStatuses.map((status) => (
            <div
              key={status.id}
              className="flex items-center justify-between p-2 bg-white border rounded-md group hover:bg-gray-50"
            >
              <div className="flex items-center">
                <GripVertical className="h-4 w-4 text-gray-400 mr-2" />
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: status.color }}
                />
                <span className="text-sm font-medium">{status.name}</span>
              </div>
              <Button
                variant="ghost"
                size="xs"
                icon={Trash2}
                onClick={() => deleteStatus(status.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <span className="sr-only">Delete</span>
              </Button>
            </div>
          ))}

          {teamStatuses.length === 0 && (
            <div className="text-center p-4 border border-dashed rounded-md">
              <p className="text-sm text-gray-500">No statuses defined for this team yet</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StatusSidebar;