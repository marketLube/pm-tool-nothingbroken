import React, { useState } from 'react';
import Button from '../ui/Button';
import { cleanupClients } from '../../utils/clientCleanup';
import { Trash2 } from 'lucide-react';

const ClientCleanupButton: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const handleCleanup = async () => {
    if (!confirm('This will remove unassigned clients and ABC Corporation duplicates. Continue?')) {
      return;
    }

    setIsRunning(true);
    console.log('Starting client cleanup from UI...');
    
    try {
      const success = await cleanupClients();
      if (success) {
        setHasRun(true);
        alert('Client cleanup completed! Check console for details.');
      } else {
        alert('Client cleanup failed. Check console for errors.');
      }
    } catch (error) {
      console.error('Error running cleanup:', error);
      alert('Client cleanup failed. Check console for errors.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h3 className="text-sm font-medium text-yellow-800 mb-2">
        🧹 Database Cleanup Tool
      </h3>
      <p className="text-xs text-yellow-700 mb-3">
        This tool will remove unassigned clients and ABC Corporation duplicates from the database.
      </p>
      <Button
        variant="secondary"
        size="sm"
        icon={Trash2}
        onClick={handleCleanup}
        disabled={isRunning || hasRun}
        className="text-yellow-800 border-yellow-300 hover:bg-yellow-100"
      >
        {isRunning ? 'Running Cleanup...' : hasRun ? 'Cleanup Complete' : 'Run Cleanup'}
      </Button>
      {hasRun && (
        <p className="text-xs text-green-600 mt-2">
          ✅ Cleanup completed. Refresh the page to see changes.
        </p>
      )}
    </div>
  );
};

export default ClientCleanupButton; 