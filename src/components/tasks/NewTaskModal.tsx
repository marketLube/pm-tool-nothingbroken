import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useStatus } from '../../contexts/StatusContext';
import { useNotification } from '../../contexts/NotificationContext';
import { Task, Priority, TeamType, Status, StatusCode } from '../../types';
import { Plus, ChevronDown, ArrowRight, Trash2, User, Building2, AlertTriangle } from 'lucide-react';
import NewClientModal from '../clients/NewClientModal';
import { format, startOfDay, parseISO } from 'date-fns';
import { getIndiaDate, getIndiaTodayForValidation, getIndiaDateTime } from '../../utils/timezone';
import DeleteConfirmationModal from '../ui/DeleteConfirmationModal';
import { validateTaskAssignment, getUsersWithStatusAccess, canUserAccessStatus } from '../../utils/statusPermissions';

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
  const { clients, users, addTask, updateTask, deleteTask } = useData();
  const { currentUser, isAdmin } = useAuth();
  const { getStatusesByTeam, statuses } = useStatus();
  const { showError, showSuccess } = useNotification();
  
  const [newClientModalOpen, setNewClientModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    status: 'not_started',
    priority: 'medium',
    assigneeId: currentUser?.id || '',
    clientId: '',
    team: currentUser?.team || 'creative',
    dueDate: getIndiaDate() // Use India timezone for default date
  });
  
  // Set form data when initialData changes
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setFormData({
        title: '',
        description: '',
        status: 'not_started',
        priority: 'medium',
        assigneeId: currentUser?.id || '',
        clientId: '',
        team: currentUser?.team || 'creative',
        dueDate: getIndiaDate(), // Use India timezone for default date
        ...initialData // Override defaults with initial data
      });
    } else {
      // Reset to default values if no initialData
      setFormData({
        title: '',
        description: '',
        status: 'not_started',
        priority: 'medium',
        assigneeId: currentUser?.id || '',
        clientId: '',
        team: currentUser?.team || 'creative',
        dueDate: getIndiaDate() // Use India timezone for default date
      });
    }
  }, [initialData?.id, currentUser?.team, currentUser?.id]); // Add currentUser?.id as dependency
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  
  // Date validation - minimum date is today in India timezone
  const today = getIndiaTodayForValidation();
  
  // Check if task is past due
  const isTaskPastDue = !!initialData?.dueDate &&
    parseISO(initialData.dueDate) < startOfDay(parseISO(today));
  
  // For admins: allow editing overdue tasks but protect due date
  // For normal users: lock entire task if past due
  const canEditTask = isAdmin || !isTaskPastDue;
  const isDueDateLocked = isTaskPastDue; // Lock due date for ALL users (including admins) if task is past due
  
  // Get team-specific statuses
  const teamStatuses = getStatusesByTeam(formData.team as TeamType || 'creative');
  
  // Update status if team changes
  useEffect(() => {
    if (teamStatuses.length > 0 && !initialData?.id && !formData.status) {
      setFormData(prev => ({
        ...prev,
        status: teamStatuses[0].id as StatusCode
      }));
    }
  }, [formData.team, teamStatuses.length, initialData?.id]); // More specific dependencies

  // Clear client selection if current client doesn't belong to the selected team
  useEffect(() => {
    if (formData.clientId && formData.team) {
      const currentClient = clients.find(client => client.id === formData.clientId);
      if (currentClient && currentClient.team !== formData.team) {
        setFormData(prev => ({
          ...prev,
          clientId: ''
        }));
      }
    }
  }, [formData.team, formData.clientId, clients]);
  
  // Clear assignee if they don't have access to the selected status
  useEffect(() => {
    if (formData.assigneeId && formData.status) {
      const assignee = users.find(user => user.id === formData.assigneeId);
      if (assignee && !canUserAccessStatus(assignee, formData.status)) {
        setFormData(prev => ({
          ...prev,
          assigneeId: ''
        }));
        
        // Show notification about why the assignee was cleared
        showError(`${assignee.name} doesn't have access to the selected status. Please choose a different assignee.`);
      }
    }
  }, [formData.status, formData.assigneeId, users, showError]);
  
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
    
    // Require client selection
    if (!formData.clientId) {
      newErrors.clientId = 'Client selection is required';
    }
    
    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
    } else {
      // If task is past due and user is admin, only lock due date changes
      if (isDueDateLocked && formData.dueDate !== initialData?.dueDate) {
        newErrors.dueDate = isAdmin 
          ? 'Due date cannot be changed for overdue tasks (admin restriction)'
          : 'Due date is locked (task is past due)';
      } else if (!isDueDateLocked) {
        // For new tasks or non-past-due tasks, prevent setting past dates
        const isNewTask = !initialData?.id;
        const dueDateChanged = formData.dueDate !== initialData?.dueDate;
        
        if ((isNewTask || dueDateChanged) && formData.dueDate < today) {
          newErrors.dueDate = 'Due date cannot be in the past';
        }
      }
    }
    
    // Validate task assignment permissions
    if (formData.assigneeId && formData.status) {
      const assignmentValidation = validateTaskAssignment(
        formData.assigneeId,
        formData.status,
        users
      );
      
      if (!assignmentValidation.isValid) {
        newErrors.assigneeId = assignmentValidation.error || 'Invalid assignment';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    // Additional validation for past dates (defense against bypasses)
    // If task is past due and user is admin, only prevent due date changes
    if (isDueDateLocked && formData.dueDate !== initialData?.dueDate) {
      setErrors(prev => ({
        ...prev,
        dueDate: isAdmin 
          ? 'Due date cannot be changed for overdue tasks (admin restriction)'
          : 'Due date is locked (task is past due)'
      }));
      return;
    }
    
    // For new tasks or non-past-due tasks, prevent setting past dates
    if (!isDueDateLocked) {
      const isNewTask = !initialData?.id;
      const dueDateChanged = formData.dueDate !== initialData?.dueDate;
      
      if ((isNewTask || dueDateChanged) && formData.dueDate && formData.dueDate < today) {
        setErrors(prev => ({
          ...prev,
          dueDate: 'Due date cannot be in the past'
        }));
        return;
      }
    }
    
    if (initialData?.id) {
      // Update existing task
      updateTask({
        ...formData,
        id: initialData.id,
        createdAt: initialData.createdAt || getIndiaDate(),
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

  const handleDeleteButtonClick = () => {
    console.log('🗑️ Delete button clicked for task:', initialData?.id);
    console.log('🔧 Setting deleteConfirmationOpen to true');
    setDeleteConfirmationOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!initialData?.id) return;
    
    console.log('🗑️ Confirming delete for task:', initialData.id);
    setIsDeleting(true);
    try {
      await deleteTask(initialData.id);
      showSuccess('Task deleted successfully');
      console.log('✅ Task deleted successfully:', initialData.id);
      onClose();
    } catch (error) {
      console.error('❌ Error deleting task:', error);
      showError(`Failed to delete task: ${error instanceof Error ? error.message : 'Unknown error occurred'}. Please try again.`);
    } finally {
      setIsDeleting(false);
      setDeleteConfirmationOpen(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmationOpen(false);
  };

  // Filter users based on team selection
  const teamUsers = users.filter(user => 
    user.team === formData.team || user.role === 'admin' || user.role === 'super_admin'
  );
  
  // Filter users who have access to the selected status
  const usersWithStatusAccess = formData.status 
    ? getUsersWithStatusAccess(formData.status, teamUsers)
    : teamUsers; // If no status selected, show all team users
  
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
  
  // Filter clients based on team selection - removed "Unassigned" option
  const teamClients = clients.filter(client => 
    client.team === formData.team
  );
  
  const clientOptions = [
    { value: '', label: 'Select a client...' },
    ...teamClients.map(client => ({
      value: client.id,
      label: client.name
    }))
  ];
  
  const userOptions = [
    { value: '', label: 'Unassigned' },
    ...usersWithStatusAccess.map(user => ({
      value: user.id,
      label: user.name
    }))
  ];

  // Function to find and move to the next status
  const moveToNextStatus = () => {
    if (!formData.status || !formData.team) return;
    
    const teamSpecificStatuses = getStatusesByTeam(formData.team as TeamType);
    const currentStatusIndex = teamSpecificStatuses.findIndex(s => s.id === formData.status);
    
    if (currentStatusIndex >= 0 && currentStatusIndex < teamSpecificStatuses.length - 1) {
      const nextStatus = teamSpecificStatuses[currentStatusIndex + 1];
      setFormData(prev => ({
        ...prev,
        status: nextStatus.id as StatusCode
      }));
    }
  };

  // Add this useEffect to debug the deleteConfirmationOpen state
  useEffect(() => {
    console.log('🔍 deleteConfirmationOpen state changed:', deleteConfirmationOpen);
    console.log('🔍 Rendering DeleteConfirmationModal - isOpen:', deleteConfirmationOpen);
  }, [deleteConfirmationOpen]);

  // Add debugging for admin status and task ID
  useEffect(() => {
    console.log('🔧 Debug - initialData?.id:', initialData?.id);
    console.log('🔧 Debug - isAdmin:', isAdmin);
    console.log('🔧 Debug - Should show delete button:', Boolean(initialData?.id && isAdmin));
  }, [initialData?.id, isAdmin]);

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
            {/* Enhanced Client Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <Building2 className="inline w-4 h-4 mr-1" />
                Client *
              </label>
              <div className="flex items-center space-x-2">
                <div className="flex-grow">
                  <Select
                    options={clientOptions}
                    value={formData.clientId || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                    error={errors.clientId}
                    required
                    selectClassName="text-sm"
                  />
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Plus}
                  type="button"
                  onClick={handleOpenNewClientModal}
                  className="flex-shrink-0"
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
            
            {/* Enhanced Assignee Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <User className="inline w-4 h-4 mr-1" />
                Assignee
              </label>
              <Select
                name="assigneeId"
                options={[
                  { value: '', label: 'Unassigned' },
                  ...usersWithStatusAccess.map((user: any) => ({
                    value: user.id,
                    label: user.name,
                  }))
                ]}
                value={formData.assigneeId || ''}
                onChange={handleChange}
                error={errors.assigneeId}
                selectClassName="text-sm"
              />
            </div>
            
            <Select
              label="Priority"
              name="priority"
              options={priorityOptions}
              value={formData.priority as string || ''}
              onChange={handleChange}
              fullWidth
              required
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Due Date *
              </label>
              <input
                name="dueDate"
                type="date"
                value={formData.dueDate || ''}
                onChange={handleChange}
                min={today}
                disabled={isDueDateLocked}
                className={`block w-full border rounded-md py-2.5 px-3 transition-all duration-200 focus:outline-none focus:ring-2 focus:shadow-sm text-sm ${
                  isDueDateLocked
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200'
                    : errors.dueDate 
                      ? 'bg-white border-red-300 focus:ring-red-400 focus:border-red-500' 
                      : 'bg-white border-gray-300 hover:border-gray-400 focus:ring-blue-200 focus:border-blue-500'
                }`}
                required
              />
              {/* Enhanced warning messages for overdue tasks */}
              {isDueDateLocked && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800">Due Date Locked</p>
                      <p className="text-amber-700">
                        {isAdmin 
                          ? 'Admin restriction: Due dates cannot be changed for overdue tasks to maintain timeline accuracy.'
                          : 'This task is past due. Due date modifications are not allowed.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {errors.dueDate && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-700 font-medium">{errors.dueDate}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Created On
              </label>
              <div className="block w-full border rounded-md py-2.5 px-3 bg-gray-50 text-gray-600 text-sm border-gray-200">
                {initialData?.id && initialData?.createdAt
                  ? format(parseISO(initialData.createdAt), 'MMM dd, yyyy \'at\' h:mm a')
                  : format(getIndiaDateTime(), 'MMM dd, yyyy \'at\' h:mm a')
                }
              </div>
            </div>
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
                      onClick={() => setFormData(prev => ({ ...prev, status: status.id as StatusCode }))}
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
                        onClick={() => setFormData(prev => ({ ...prev, status: status.id as StatusCode }))}
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
          
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <div>
              {initialData?.id && isAdmin && (
                <Button
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                  onClick={handleDeleteButtonClick}
                  type="button"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Task'}
                </Button>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="secondary"
                onClick={onClose}
                type="button"
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={isDeleting}
              >
                {isDeleting ? 'Saving...' : (initialData?.id ? 'Update Task' : 'Create Task')}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
      
      <NewClientModal
        isOpen={newClientModalOpen}
        onClose={handleCloseNewClientModal}
        team={formData.team as TeamType || 'creative'}
      />

      {/* Custom Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteConfirmationOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Task"
        message={`Are you sure you want to delete the task "${formData.title}"? This will remove the task from the TaskBoard and all daily reports. Historical completion records will be preserved.`}
        confirmButtonText="Delete Task"
        cancelButtonText="Cancel"
        isLoading={isDeleting}
      />
    </>
  );
};

export default NewTaskModal;