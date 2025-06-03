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
  const { addClient, updateClient } = useData();
  
  const [formData, setFormData] = useState<Omit<Client, 'id'>>({
    name: '',
    industry: '',
    contactPerson: '',
    email: '',
    phone: '',
    team: 'creative',
    dateAdded: getIndiaDate(),
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  useEffect(() => {
    if (isOpen) {
      if (initialData?.id) {
        // Editing existing client
        setFormData({
          name: initialData.name || '',
          industry: initialData.industry || '',
          contactPerson: initialData.contactPerson || '',
          email: initialData.email || '',
          phone: initialData.phone || '',
          team: initialData.team || team,
          dateAdded: initialData.dateAdded || getIndiaDate(),
        });
      } else {
        // Creating new client
        setFormData({
          name: '',
          industry: '',
          contactPerson: '',
          email: '',
          phone: '',
          team: team,
          dateAdded: getIndiaDate(),
        });
      }
      // Clear any previous errors when modal opens
      setErrors({});
    }
  }, [isOpen, initialData?.id, initialData?.name, initialData?.industry, initialData?.contactPerson, initialData?.email, initialData?.phone, initialData?.team, initialData?.dateAdded, team]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    }
    
    // Email validation only if an email is provided
    if (formData.email?.trim() && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
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
          team: team
        } as Omit<Client, 'id' | 'dateAdded'>);
        console.log('NewClientModal: Client added successfully:', newClient);
      }
      
      onClose();
    } catch (error) {
      console.error('NewClientModal: Error saving client:', error);
      // Add error handling here - could show an error message to the user
      setErrors(prev => ({
        ...prev,
        submit: 'Error saving client. Please try again.'
      }));
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
        
        <Input
          label="Industry"
          name="industry"
          value={formData.industry || ''}
          onChange={handleChange}
          fullWidth
        />
        
        <Input
          label="Contact Person"
          name="contactPerson"
          value={formData.contactPerson || ''}
          onChange={handleChange}
          fullWidth
        />
        
        <Input
          label="Email"
          name="email"
          type="email"
          value={formData.email || ''}
          onChange={handleChange}
          error={errors.email}
          fullWidth
        />
        
        <Input
          label="Phone Number"
          name="phone"
          value={formData.phone || ''}
          onChange={handleChange}
          fullWidth
        />
        
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