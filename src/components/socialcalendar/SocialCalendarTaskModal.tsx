import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { 
  Calendar, 
  Clock, 
  User, 
  Building, 
  AlertTriangle,
  CheckCircle,
  Users,
  Type,
  FileText
} from 'lucide-react';
import { TeamType, Client, User as UserType } from '../../types';
import { getIndiaDate } from '../../utils/timezone';

interface SocialCalendarTask {
  id: string;
  title: string;
  description: string;
  date: string;
  clientId: string;
  team: TeamType;
  assigneeId?: string;
  startTime?: string;
  endTime?: string;
  priority: 'low' | 'medium' | 'high';
  createdBy: string;
  createdAt: string;
}

interface SocialCalendarTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<SocialCalendarTask, 'id' | 'createdAt' | 'createdBy'>) => void;
  editingTask?: SocialCalendarTask | null;
  selectedDate?: Date | null;
  clients: Client[];
  users: UserType[];
}

const SocialCalendarTaskModal: React.FC<SocialCalendarTaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTask,
  selectedDate,
  clients,
  users
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : getIndiaDate(),
    clientId: '',
    team: 'creative' as TeamType,
    assigneeId: '',
    startTime: '',
    endTime: '',
    priority: 'medium' as 'low' | 'medium' | 'high'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes or editing task changes
  useEffect(() => {
    if (editingTask) {
      setFormData({
        title: editingTask.title,
        description: editingTask.description,
        date: editingTask.date,
        clientId: editingTask.clientId,
        team: editingTask.team,
        assigneeId: editingTask.assigneeId || '',
        startTime: editingTask.startTime || '',
        endTime: editingTask.endTime || '',
        priority: editingTask.priority
      });
    } else {
      setFormData({
        title: '',
        description: '',
        date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : getIndiaDate(),
        clientId: '',
        team: 'creative',
        assigneeId: '',
        startTime: '',
        endTime: '',
        priority: 'medium'
      });
    }
    setErrors({});
  }, [editingTask, selectedDate, isOpen]);

  // Filter clients and users based on selected team
  const teamClients = clients.filter(client => client.team === formData.team);
  const teamUsers = users.filter(user => 
    user.isActive && (user.team === formData.team || user.role === 'admin')
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    if (!formData.clientId) {
      newErrors.clientId = 'Client is required';
    }

    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      newErrors.endTime = 'End time must be after start time';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onSave(formData);
  };

  const teamOptions = [
    { value: 'creative', label: 'Creative Team' },
    { value: 'web', label: 'Web Team' }
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low Priority' },
    { value: 'medium', label: 'Medium Priority' },
    { value: 'high', label: 'High Priority' }
  ];

  const clientOptions = [
    { value: '', label: 'Select a client...' },
    ...teamClients.map(client => ({
      value: client.id,
      label: client.name
    }))
  ];

  const userOptions = [
    { value: '', label: 'No assignee' },
    ...teamUsers.map(user => ({
      value: user.id,
      label: `${user.name} ${user.role === 'admin' ? '(Admin)' : user.role === 'manager' ? '(Manager)' : ''}`
    }))
  ];

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'low': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingTask ? 'Edit Social Calendar Task' : 'Add New Social Calendar Task'}
      size="lg"
    >
      <div className="space-y-6">
        {/* Header with icon */}
        <div className="flex items-center pb-4 border-b">
          <Calendar className="h-6 w-6 mr-3 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            {editingTask ? 'Edit Social Calendar Task' : 'Add New Social Calendar Task'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Task Title */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Type className="h-4 w-4 mr-1" />
              Task Title *
            </label>
            <Input
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter task title..."
              error={errors.title}
              fullWidth
              className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Task Description */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <FileText className="h-4 w-4 mr-1" />
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter task description..."
              rows={3}
              className="block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          {/* Date and Team Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Calendar className="h-4 w-4 mr-1" />
                Date *
              </label>
              <Input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                error={errors.date}
                fullWidth
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Users className="h-4 w-4 mr-1" />
                Team *
              </label>
              <Select
                name="team"
                value={formData.team}
                onChange={handleInputChange}
                options={teamOptions}
                fullWidth
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Client and Assignee Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Building className="h-4 w-4 mr-1" />
                Client *
              </label>
              <Select
                name="clientId"
                value={formData.clientId}
                onChange={handleInputChange}
                options={clientOptions}
                error={errors.clientId}
                fullWidth
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <User className="h-4 w-4 mr-1" />
                Assignee
              </label>
              <Select
                name="assigneeId"
                value={formData.assigneeId}
                onChange={handleInputChange}
                options={userOptions}
                fullWidth
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Time and Priority Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Clock className="h-4 w-4 mr-1" />
                Start Time
              </label>
              <Input
                type="time"
                name="startTime"
                value={formData.startTime}
                onChange={handleInputChange}
                fullWidth
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Clock className="h-4 w-4 mr-1" />
                End Time
              </label>
              <Input
                type="time"
                name="endTime"
                value={formData.endTime}
                onChange={handleInputChange}
                error={errors.endTime}
                fullWidth
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                {getPriorityIcon(formData.priority)}
                Priority
              </label>
              <Select
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                options={priorityOptions}
                fullWidth
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Task Preview */}
          {formData.title && (
            <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-l-blue-500">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Task Preview</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <span className="font-medium text-gray-600 w-20">Title:</span>
                  <span className="text-gray-900">{formData.title}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-medium text-gray-600 w-20">Date:</span>
                  <div className="text-center">
                    <span className="text-gray-900">{format(new Date(formData.date), 'MMMM d, yyyy')}</span>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="font-medium text-gray-600 w-20">Team:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    formData.team === 'creative' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {formData.team === 'creative' ? 'Creative' : 'Web'}
                  </span>
                </div>
                {formData.clientId && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-600 w-20">Client:</span>
                    <span className="text-gray-900">
                      {clients.find(c => c.id === formData.clientId)?.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="px-6 bg-blue-600 hover:bg-blue-700"
            >
              {editingTask ? 'Update Task' : 'Create Task'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default SocialCalendarTaskModal; 