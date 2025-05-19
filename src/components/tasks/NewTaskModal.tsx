import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useStatus } from '../../contexts/StatusContext';
import { Task, Priority, TeamType, Status } from '../../types';
import { Plus, ChevronDown, ArrowRight } from 'lucide-react';
import NewClientModal from '../clients/NewClientModal';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<Task>;
}

const NewTaskModal: React.FC<NewTaskModalProps> = ({
  isOpen,
  onClose,
  initialData
}) => {
  const { clients, users, addTask, updateTask } = useData();
  const { currentUser } = useAuth();
  const { getStatusesByTeam, statuses } = useStatus();
  
  const [newClientModalOpen, setNewClientModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    status: 'not_started',
    priority: 'medium',
    assigneeId: '',
    clientId: '',
    team: currentUser?.team || 'creative',
    dueDate: new Date().toISOString().split('T')[0]
  });
  
  // Set form data when initialData changes
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setFormData({
        ...formData,
        ...initialData
      });
    } else {
      // Reset to default values if no initialData
      setFormData({
        title: '',
        description: '',
        status: 'not_started',
        priority: 'medium',
        assigneeId: '',
        clientId: '',
        team: currentUser?.team || 'creative',
        dueDate: new Date().toISOString().split('T')[0]
      });
    }
  }, [initialData, currentUser?.team]);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Get team-specific statuses
  const teamStatuses = getStatusesByTeam(formData.team as TeamType || 'creative');
  
  // Update status if team changes
  useEffect(() => {
    if (teamStatuses.length > 0 && !initialData?.id && !formData.status) {
      setFormData(prev => ({
        ...prev,
        status: teamStatuses[0].id as Status
      }));
    }
  }, [formData.team, teamStatuses, initialData, formData.status]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for the field being changed
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.clientId) {
      newErrors.clientId = 'Client is required';
    }
    
    if (!formData.assigneeId) {
      newErrors.assigneeId = 'Assignee is required';
    }
    
    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    if (initialData?.id) {
      // Update existing task
      updateTask({
        ...formData,
        id: initialData.id,
        createdAt: initialData.createdAt || new Date().toISOString().split('T')[0],
        createdBy: initialData.createdBy || currentUser?.id || '',
      } as Task);
    } else {
      // Add new task
      addTask({
        ...formData,
        createdBy: currentUser?.id || '',
      } as Omit<Task, 'id' | 'createdAt'>);
    }
    
    onClose();
  };
  
  const handleOpenNewClientModal = () => {
    setNewClientModalOpen(true);
  };
  
  const handleCloseNewClientModal = () => {
    setNewClientModalOpen(false);
  };
  
  // Filter users based on team selection
  const teamUsers = users.filter(user => 
    user.team === formData.team || user.role === 'admin'
  );
  
  // Generate status options from team statuses
  const statusOptions = teamStatuses.map(status => ({
    value: status.id,
    label: status.name
  }));
  
  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' }
  ];
  
  const teamOptions = [
    { value: 'creative', label: 'Creative Team' },
    { value: 'web', label: 'Web Team' }
  ];
  
  const clientOptions = clients.map(client => ({
    value: client.id,
    label: client.name
  }));
  
  const userOptions = teamUsers.map(user => ({
    value: user.id,
    label: user.name
  }));

  // Function to find and move to the next status
  const moveToNextStatus = () => {
    if (!formData.status || !formData.team) return;
    
    const teamSpecificStatuses = getStatusesByTeam(formData.team as TeamType);
    const currentStatusIndex = teamSpecificStatuses.findIndex(s => s.id === formData.status);
    
    if (currentStatusIndex >= 0 && currentStatusIndex < teamSpecificStatuses.length - 1) {
      const nextStatus = teamSpecificStatuses[currentStatusIndex + 1];
      setFormData(prev => ({
        ...prev,
        status: nextStatus.id as Status
      }));
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={initialData?.id ? 'Edit Task' : 'Create New Task'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Task Title"
            name="title"
            value={formData.title || ''}
            onChange={handleChange}
            error={errors.title}
            fullWidth
            required
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description || ''}
              onChange={handleChange}
              rows={3}
              className="block w-full border border-gray-300 rounded-md py-2.5 px-3 bg-white hover:border-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 focus:shadow-sm text-sm"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client
              </label>
              <div className="flex items-center space-x-2">
                <div className="flex-grow relative">
                  <select
                    name="clientId"
                    value={formData.clientId || ''}
                    onChange={handleChange}
                    className={`block w-full pl-3 pr-10 py-2.5 text-base rounded-md border appearance-none transition-all duration-200 ${errors.clientId ? 'border-red-300 focus:ring-red-400 focus:border-red-500' : 'border-gray-300 hover:border-gray-400 focus:ring-blue-200 focus:border-blue-500'} bg-white focus:outline-none focus:ring-2 focus:shadow-sm sm:text-sm`}
                    required
                  >
                    <option value="">Select a client...</option>
                    {clientOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                  {errors.clientId && (
                    <p className="mt-1.5 text-sm text-red-600">
                      {errors.clientId}
                    </p>
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Plus}
                  type="button"
                  onClick={handleOpenNewClientModal}
                >
                  New
                </Button>
              </div>
            </div>
            
            <Select
              label="Team"
              name="team"
              options={teamOptions}
              value={formData.team as string || ''}
              onChange={handleChange}
              fullWidth
              required
            />
            
            <Select
              label="Assignee"
              name="assigneeId"
              options={userOptions}
              value={formData.assigneeId || ''}
              onChange={handleChange}
              error={errors.assigneeId}
              fullWidth
              required
            />
            
            <Select
              label="Priority"
              name="priority"
              options={priorityOptions}
              value={formData.priority as string || ''}
              onChange={handleChange}
              fullWidth
              required
            />
            
            <Input
              label="Due Date"
              name="dueDate"
              type="date"
              value={formData.dueDate || ''}
              onChange={handleChange}
              error={errors.dueDate}
              fullWidth
              required
            />
          </div>
          
          {/* Improved Status Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Status
            </label>
            <div className="flex flex-col space-y-4">
              {/* Visual Status Flow - Two rows by default */}
              <div className="flex flex-col space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {teamStatuses.slice(0, 5).map((status) => (
                    <div 
                      key={status.id}
                      onClick={() => setFormData(prev => ({ ...prev, status: status.id as Status }))}
                      className={`
                        cursor-pointer rounded-md py-2 px-1 flex items-center justify-center text-center text-xs font-medium border transition-all duration-200 h-[44px]
                        ${formData.status === status.id 
                          ? 'border-2 shadow-md transform scale-105' 
                          : 'border opacity-70 hover:opacity-100'}
                      `}
                      style={{ 
                        borderColor: status.color,
                        backgroundColor: `${status.color}15`, // Very light version of the color
                        color: status.color 
                      }}
                    >
                      <span className="line-clamp-2">{status.name}</span>
                    </div>
                  ))}
                </div>
                
                {/* Second row */}
                {teamStatuses.length > 5 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {teamStatuses.slice(5, 10).map((status) => (
                      <div 
                        key={status.id}
                        onClick={() => setFormData(prev => ({ ...prev, status: status.id as Status }))}
                        className={`
                          cursor-pointer rounded-md py-2 px-1 flex items-center justify-center text-center text-xs font-medium border transition-all duration-200 h-[44px]
                          ${formData.status === status.id 
                            ? 'border-2 shadow-md transform scale-105' 
                            : 'border opacity-70 hover:opacity-100'}
                        `}
                        style={{ 
                          borderColor: status.color,
                          backgroundColor: `${status.color}15`, // Very light version of the color
                          color: status.color 
                        }}
                      >
                        <span className="line-clamp-2">{status.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Move to Next Status Button */}
              {initialData?.id && formData.status && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  icon={ArrowRight}
                  onClick={moveToNextStatus}
                  className="self-end bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <span className="font-medium text-sm">Move to Next Status</span>
                </Button>
              )}
              
              {/* Hidden Original Status Dropdown for Form Submission */}
              <input
                type="hidden"
                name="status"
                value={formData.status as string || ''}
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={onClose}
              type="button"
              className="bg-white text-blue-600 border border-blue-300 hover:bg-blue-50 hover:text-blue-800 shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95"
            >
              <span className="font-medium text-sm">Cancel</span>
            </Button>
            <Button
              variant="primary"
              type="submit"
              className="bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95"
            >
              <span className="font-medium text-sm">
                {initialData?.id ? 'Update Task' : 'Create Task'}
              </span>
            </Button>
          </div>
        </form>
      </Modal>
      
      <NewClientModal
        isOpen={newClientModalOpen}
        onClose={handleCloseNewClientModal}
      />
    </>
  );
};

export default NewTaskModal;