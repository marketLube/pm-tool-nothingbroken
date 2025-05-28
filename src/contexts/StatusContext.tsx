import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { TeamType, Status, StatusCode } from '../types';
import * as statusService from '../services/statusService';

interface StatusContextType {
  statuses: Status[];
  addStatus: (status: Omit<Status, 'id'> & { id?: StatusCode }) => void;
  updateStatus: (id: StatusCode, status: Partial<Status>) => void;
  deleteStatus: (id: StatusCode) => void;
  getStatusesByTeam: (team: TeamType) => Status[];
  isLoading: boolean;
  error: string | null;
  refreshStatuses: () => Promise<void>;
}

const StatusContext = createContext<StatusContextType | undefined>(undefined);

export const useStatus = () => {
  const context = useContext(StatusContext);
  if (!context) {
    throw new Error('useStatus must be used within a StatusProvider');
  }
  return context;
};

const defaultStatuses: Status[] = [
  // Creative team statuses
  { id: 'creative_not_started', name: 'Not Started', team: 'creative', color: '#94a3b8', order: 0 },
  { id: 'creative_scripting', name: 'Scripting', team: 'creative', color: '#a78bfa', order: 1 },
  { id: 'creative_script_confirmed', name: 'Script Confirmed', team: 'creative', color: '#8b5cf6', order: 2 },
  { id: 'creative_shoot_pending', name: 'Shoot Pending', team: 'creative', color: '#f97316', order: 3 },
  { id: 'creative_shoot_finished', name: 'Shoot Finished', team: 'creative', color: '#fb923c', order: 4 },
  { id: 'creative_edit_pending', name: 'Edit Pending', team: 'creative', color: '#3b82f6', order: 5 },
  { id: 'creative_client_approval', name: 'Client Approval', team: 'creative', color: '#ec4899', order: 6 },
  { id: 'creative_approved', name: 'Approved', team: 'creative', color: '#22c55e', order: 7 },
  
  // Web team statuses
  { id: 'web_proposal_awaiting', name: 'Proposal Awaiting', team: 'web', color: '#94a3b8', order: 0 },
  { id: 'web_not_started', name: 'Not Started', team: 'web', color: '#6b7280', order: 1 },
  { id: 'web_ui_started', name: 'UI Started', team: 'web', color: '#a78bfa', order: 2 },
  { id: 'web_ui_finished', name: 'UI Finished', team: 'web', color: '#8b5cf6', order: 3 },
  { id: 'web_development_started', name: 'Development Started', team: 'web', color: '#3b82f6', order: 4 },
  { id: 'web_development_finished', name: 'Development Finished', team: 'web', color: '#2563eb', order: 5 },
  { id: 'web_testing', name: 'Testing', team: 'web', color: '#f97316', order: 6 },
  { id: 'web_handed_over', name: 'Handed Over', team: 'web', color: '#fb923c', order: 7 },
  { id: 'web_client_reviewing', name: 'Client Reviewing', team: 'web', color: '#ec4899', order: 8 },
  { id: 'web_completed', name: 'Completed', team: 'web', color: '#22c55e', order: 9 },
];

const STORAGE_KEY = 'pm-tool-statuses';

// Load statuses from localStorage (fallback)
const loadStatusesFromStorage = (): Status[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsedStatuses = JSON.parse(stored);
      console.log('📂 Loaded statuses from localStorage as fallback:', parsedStatuses.length, 'statuses');
      return parsedStatuses;
    }
  } catch (error) {
    console.error('❌ Error loading statuses from localStorage:', error);
  }
  
  console.log('🔄 Using default statuses as fallback');
  return defaultStatuses;
};

// Save statuses to localStorage (backup)
const saveStatusesToStorage = (statuses: Status[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(statuses));
    console.log('💾 Backed up statuses to localStorage:', statuses.length, 'statuses');
  } catch (error) {
    console.error('❌ Error saving statuses to localStorage:', error);
  }
};

interface StatusProviderProps {
  children: ReactNode;
}

export const StatusProvider: React.FC<StatusProviderProps> = ({ children }) => {
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load statuses from database
  const loadStatusesFromDatabase = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('🔄 Loading statuses from database...');
      
      const dbStatuses = await statusService.getStatuses();
      console.log('✅ Loaded statuses from database:', dbStatuses.length, 'statuses');
      
      setStatuses(dbStatuses);
      
      // Backup to localStorage
      saveStatusesToStorage(dbStatuses);
      
    } catch (err) {
      console.error('❌ Error loading statuses from database:', err);
      setError(err instanceof Error ? err.message : 'Failed to load statuses');
      
      // Fallback to localStorage
      console.log('🔄 Falling back to localStorage...');
      const fallbackStatuses = loadStatusesFromStorage();
      setStatuses(fallbackStatuses);
      
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh statuses (public method)
  const refreshStatuses = useCallback(async () => {
    await loadStatusesFromDatabase();
  }, [loadStatusesFromDatabase]);

  // Load statuses on mount
  useEffect(() => {
    loadStatusesFromDatabase();
  }, [loadStatusesFromDatabase]);

  const addStatus = useCallback(async (status: Omit<Status, 'id'> & { id?: StatusCode }) => {
    try {
      const newStatus: Status = {
        ...status,
        id: status.id || `custom_${Date.now()}` as StatusCode,
      };
      
      console.log('➕ Adding new status to database:', newStatus);
      
      // Add to database
      const dbStatus = await statusService.addStatus(newStatus);
      
      // Update local state
      setStatuses(prev => [...prev, dbStatus]);
      
      // Backup to localStorage
      const updatedStatuses = [...statuses, dbStatus];
      saveStatusesToStorage(updatedStatuses);
      
      console.log('✅ Status added successfully');
      
    } catch (err) {
      console.error('❌ Error adding status:', err);
      setError(err instanceof Error ? err.message : 'Failed to add status');
      throw err;
    }
  }, [statuses]);

  const updateStatus = useCallback(async (id: StatusCode, updatedFields: Partial<Status>) => {
    try {
      console.log('🔄 Updating status in database:', id, 'with fields:', updatedFields);
      
      // Update in database
      const updatedStatus = await statusService.updateStatus(id, updatedFields);
      
      // Update local state
      setStatuses(prev => prev.map(status => 
        status.id === id ? updatedStatus : status
      ));
      
      // Backup to localStorage
      const updatedStatuses = statuses.map(status => 
        status.id === id ? updatedStatus : status
      );
      saveStatusesToStorage(updatedStatuses);
      
      console.log('✅ Status updated successfully');
      
    } catch (err) {
      console.error('❌ Error updating status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update status');
      throw err;
    }
  }, [statuses]);

  const deleteStatus = useCallback(async (id: StatusCode) => {
    try {
      console.log('🗑️ Deleting status from database:', id);
      
      // Delete from database
      await statusService.deleteStatus(id);
      
      // Update local state
      setStatuses(prev => prev.filter(status => status.id !== id));
      
      // Backup to localStorage
      const updatedStatuses = statuses.filter(status => status.id !== id);
      saveStatusesToStorage(updatedStatuses);
      
      console.log('✅ Status deleted successfully');
      
    } catch (err) {
      console.error('❌ Error deleting status:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete status');
      throw err;
    }
  }, [statuses]);

  const getStatusesByTeam = useCallback((team: TeamType) => {
    const teamStatuses = statuses
      .filter(status => status.team === team)
      .sort((a, b) => a.order - b.order);
    
    return teamStatuses;
  }, [statuses]);

  const contextValue = useMemo(() => ({
    statuses,
    addStatus,
    updateStatus,
    deleteStatus,
    getStatusesByTeam,
    isLoading,
    error,
    refreshStatuses,
  }), [statuses, addStatus, updateStatus, deleteStatus, getStatusesByTeam, isLoading, error, refreshStatuses]);

  return (
    <StatusContext.Provider value={contextValue}>
      {children}
    </StatusContext.Provider>
  );
};