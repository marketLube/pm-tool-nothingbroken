import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { Client, TeamType } from '../../types';
import { useData } from '../../contexts/DataContext';
import { getIndiaDate } from '../../utils/timezone';

interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<Client>;
  team?: TeamType;
}

const NewClientModal: React.FC<NewClientModalProps> = ({
  isOpen,
  onClose,
  initialData,
  team = 'creative'
}) => {
  const { addClient, updateClient, clients } = useData();
  
  const [formData, setFormData] = useState<Omit<Client, 'id' | 'dateAdded'>>({
    name: '',
    team: team || 'creative',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  useEffect(() => {
    if (isOpen) {
      if (initialData?.id) {
        // Editing existing client
        setFormData({
          name: initialData.name || '',
          team: initialData.team || team,
        });
      } else {
        // Creating new client - don't set default team, let user choose
        setFormData({
          name: '',
          team: 'creative', // Default but user must confirm
        });
      }
      // Clear any previous errors when modal opens
      setErrors({});
    }
  }, [isOpen, initialData?.id, initialData?.name, initialData?.team, team]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
    
    if (!formData.name?.trim()) {
      newErrors.name = 'Client name is required';
    } else {
      // Check for duplicate client name within the same team
      const existingClient = clients.find(client => 
        client.name.toLowerCase() === formData.name.trim().toLowerCase() &&
        client.team === formData.team &&
        client.id !== initialData?.id // Exclude current client when editing
      );
      
      if (existingClient) {
        newErrors.name = `A client named "${formData.name.trim()}" already exists in the ${formData.team === 'creative' ? 'Creative' : 'Web'} team`;
      }
    }
    
    if (!formData.team) {
      newErrors.team = 'Team selection is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    try {
      console.log('NewClientModal: Submitting client data:', formData);
      
      if (initialData?.id) {
        // Update existing client
        await updateClient({
          ...formData,
          id: initialData.id,
          dateAdded: initialData.dateAdded || new Date().toISOString().split('T')[0],
          team: formData.team || team
        } as Client);
        console.log('NewClientModal: Client updated successfully');
      } else {
        // Add new client
        const newClient = await addClient({
          ...formData,
          team: formData.team // Use the selected team from form
        } as Omit<Client, 'id' | 'dateAdded'>);
        console.log('NewClientModal: Client added successfully:', newClient);
      }
      
      onClose();
    } catch (error) {
      console.error('NewClientModal: Error saving client:', error);
      
      // Handle database constraint errors
      if (error instanceof Error) {
        if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
          setErrors(prev => ({
            ...prev,
            name: `A client with this name already exists in the ${formData.team === 'creative' ? 'Creative' : 'Web'} team`
          }));
        } else {
          setErrors(prev => ({
            ...prev,
            submit: 'Error saving client. Please try again.'
          }));
        }
      } else {
        setErrors(prev => ({
          ...prev,
          submit: 'Error saving client. Please try again.'
        }));
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData?.id ? 'Edit Client' : 'Add New Client'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Client Name"
          name="name"
          value={formData.name || ''}
          onChange={handleChange}
          error={errors.name}
          fullWidth
          required
        />
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Team <span className="text-red-500">*</span>
          </label>
          <select
            name="team"
            value={formData.team}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.team ? 'border-red-500' : 'border-gray-300'
            }`}
            required
          >
            <option value="">Select Team</option>
            <option value="creative">Creative Team</option>
            <option value="web">Web Team</option>
          </select>
          {errors.team && (
            <p className="text-red-600 text-sm">{errors.team}</p>
          )}
        </div>
        
        <div className="flex justify-end space-x-3 pt-4">
          {errors.submit && (
            <div className="text-red-600 text-sm mr-auto self-center">
              {errors.submit}
            </div>
          )}
          <Button
            variant="secondary"
            onClick={onClose}
            type="button"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
          >
            {initialData?.id ? 'Update Client' : 'Add Client'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default NewClientModal;