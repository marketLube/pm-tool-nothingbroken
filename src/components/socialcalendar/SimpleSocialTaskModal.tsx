import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { 
  Calendar, 
  Type,
  CheckCircle,
  Hash,
  Camera,
  Users,
  Briefcase
} from 'lucide-react';
import { getIndiaDate } from '../../utils/timezone';

interface SocialCalendarTask {
  id: string;
  title: string;
  date: string;
  client_id: string;
  team: string;
  category: string;
  created_at: string;
  updated_at: string;
}

interface SimpleSocialTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, date: string, category: string) => void;
  editingTask?: SocialCalendarTask | null;
  selectedDate?: Date | null;
  clientName?: string;
}

// Category configuration with colors and icons
const getCategoryConfig = (category: string) => {
  const configs: Record<string, {
    label: string;
    icon: any;
    color: string;
    lightColor: string;
    textColor: string;
    description: string;
  }> = {
    social_media: {
      label: 'Social Media Posts',
      icon: Hash,
      color: 'bg-pink-500',
      lightColor: 'bg-pink-100',
      textColor: 'text-pink-700',
      description: 'Content creation and social media management'
    },
    works: {
      label: 'Works (Shooting & Editing)',
      icon: Camera,
      color: 'bg-blue-500',
      lightColor: 'bg-blue-100',
      textColor: 'text-blue-700',
      description: 'Photography, videography, and editing tasks'
    },
    meetings: {
      label: 'Meetings',
      icon: Users,
      color: 'bg-green-500',
      lightColor: 'bg-green-100',
      textColor: 'text-green-700',
      description: 'Client meetings and consultations'
    }
  };
  return configs[category] || configs.works;
};

const SimpleSocialTaskModal: React.FC<SimpleSocialTaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTask,
  selectedDate,
  clientName
}) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('works');

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDate(editingTask.date);
      setCategory(editingTask.category || 'works');
    } else if (selectedDate) {
      setTitle('');
      setDate(format(selectedDate, 'yyyy-MM-dd'));
      setCategory('works');
    } else {
      setTitle('');
      setDate(format(getIndiaDate(), 'yyyy-MM-dd'));
      setCategory('works');
    }
  }, [editingTask, selectedDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && date && category) {
      onSave(title.trim(), date, category);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDate('');
    setCategory('works');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={editingTask ? 'Edit Task' : 'Add New Task'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Task Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Type className="h-4 w-4 inline mr-2" />
            Task Title
          </label>
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter task title..."
            required
            autoFocus
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="h-4 w-4 inline mr-2" />
            Date
          </label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        {/* Category Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <Briefcase className="h-4 w-4 inline mr-2" />
            Task Category
          </label>
          <div className="grid grid-cols-1 gap-3">
            {[
              { value: 'social_media', ...getCategoryConfig('social_media') },
              { value: 'works', ...getCategoryConfig('works') },
              { value: 'meetings', ...getCategoryConfig('meetings') }
            ].map((categoryOption) => {
              const Icon = categoryOption.icon;
              const isSelected = category === categoryOption.value;
              
              return (
                <button
                  key={categoryOption.value}
                  type="button"
                  onClick={() => setCategory(categoryOption.value)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? `${categoryOption.lightColor} ${categoryOption.textColor} border-current shadow-md`
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${isSelected ? categoryOption.color : 'bg-gray-300'}`}>
                      <Icon className={`h-5 w-5 ${isSelected ? 'text-white' : 'text-gray-600'}`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm mb-1">
                        {categoryOption.label}
                      </h4>
                      <p className="text-xs opacity-70">
                        {categoryOption.description}
                      </p>
                    </div>
                    {isSelected && (
                      <CheckCircle className="h-5 w-5 flex-shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4">
          <Button 
            type="button" 
            variant="secondary" 
            onClick={handleClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="primary"
            className="flex-1"
            disabled={!title.trim() || !date || !category}
          >
            {editingTask ? 'Update Task' : 'Add Task'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default SimpleSocialTaskModal; 