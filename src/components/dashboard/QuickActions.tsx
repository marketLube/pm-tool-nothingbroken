import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../ui/Card';
import Button from '../ui/Button';
import { PlusCircle, Users, FileEdit } from 'lucide-react';
import NewTaskModal from '../tasks/NewTaskModal';
import NewClientModal from '../clients/NewClientModal';

const QuickActions: React.FC = () => {
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);

  return (
    <>
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Button
              variant="primary"
              fullWidth
              icon={PlusCircle}
              onClick={() => setIsNewTaskModalOpen(true)}
            >
              New Task
            </Button>
            
            <Button
              variant="secondary"
              fullWidth
              icon={Users}
              onClick={() => setIsNewClientModalOpen(true)}
            >
              New Client
            </Button>
            
            <Button
              variant="secondary"
              fullWidth
              icon={FileEdit}
            >
              Submit Report
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <NewTaskModal 
        isOpen={isNewTaskModalOpen} 
        onClose={() => setIsNewTaskModalOpen(false)} 
      />
      
      <NewClientModal 
        isOpen={isNewClientModalOpen} 
        onClose={() => setIsNewClientModalOpen(false)} 
      />
    </>
  );
};

export default QuickActions;