import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { 
  Calendar, 
  Type,
  CheckCircle
} from 'lucide-react';

interface SocialCalendarTask {
  id: string;
  title: string;
  date: string;
  client_id: string;
  team: string;
  created_at: string;
  updated_at: string;
}

interface SimpleSocialTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, date: string) => void;
  editingTask?: SocialCalendarTask | null;
  selectedDate?: Date | null;
  clientName: string;
}

const SimpleSocialTaskModal: React.FC<SimpleSocialTaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTask,
  selectedDate,
  clientName
}) => {
  const [formData, setFormData] = useState({
    title: '',
    date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes or editing task changes
  useEffect(() => {
    if (editingTask) {
      setFormData({
        title: editingTask.title,
        date: editingTask.date
      });
    } else {
      setFormData({
        title: '',
        date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
      });
    }
    setErrors({});
  }, [editingTask, selectedDate, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      newErrors.title = 'Task name is required';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onSave(formData.title.trim(), formData.date);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingTask ? 'Edit Task' : 'Add New Task'}
      size="md"
    >
      <div className="space-y-6">
        {/* Header with client info */}
        <div className="flex items-center justify-between pb-4 border-b">
          <div className="flex items-center">
            <Calendar className="h-6 w-6 mr-3 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {editingTask ? 'Edit Task' : 'Add New Task'}
              </h3>
              <p className="text-sm text-gray-600">for {clientName}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Task Name */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Type className="h-4 w-4 mr-1" />
              Task Name *
            </label>
            <Input
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter task name..."
              error={errors.title}
              fullWidth
              className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {/* Date */}
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

          {/* Task Preview */}
          {formData.title && (
            <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-l-blue-500">
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                Task Preview
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <span className="font-medium text-gray-600 w-16">Name:</span>
                  <span className="text-gray-900">{formData.title}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-medium text-gray-600 w-16">Date:</span>
                  <span className="text-gray-900">{format(new Date(formData.date), 'MMMM d, yyyy')}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-medium text-gray-600 w-16">Client:</span>
                  <span className="text-gray-900">{clientName}</span>
                </div>
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
              disabled={!formData.title.trim()}
            >
              {editingTask ? 'Update Task' : 'Create Task'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default SimpleSocialTaskModal; 