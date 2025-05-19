import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { Client } from '../../types';
import { useData } from '../../contexts/DataContext';

interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<Client>;
}

const NewClientModal: React.FC<NewClientModalProps> = ({
  isOpen,
  onClose,
  initialData
}) => {
  const { addClient, updateClient } = useData();
  
  const [formData, setFormData] = useState<Partial<Client>>(
    initialData || {
      name: '',
      industry: '',
      contactPerson: '',
      email: '',
      phone: ''
    }
  );
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  
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
    
    if (!formData.contactPerson?.trim()) {
      newErrors.contactPerson = 'Contact person is required';
    }
    
    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    if (initialData?.id) {
      // Update existing client
      updateClient({
        ...formData,
        id: initialData.id,
        dateAdded: initialData.dateAdded || new Date().toISOString().split('T')[0]
      } as Client);
    } else {
      // Add new client
      addClient(formData as Omit<Client, 'id' | 'dateAdded'>);
    }
    
    onClose();
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
          error={errors.contactPerson}
          fullWidth
          required
        />
        
        <Input
          label="Email"
          name="email"
          type="email"
          value={formData.email || ''}
          onChange={handleChange}
          error={errors.email}
          fullWidth
          required
        />
        
        <Input
          label="Phone Number"
          name="phone"
          value={formData.phone || ''}
          onChange={handleChange}
          fullWidth
        />
        
        <div className="flex justify-end space-x-3 pt-4">
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