import React, { createContext, useContext, useState, ReactNode } from 'react';
import { TeamType } from '../types';

export interface Status {
  id: string;
  name: string;
  team: TeamType;
  color: string;
  order: number;
}

interface StatusContextType {
  statuses: Status[];
  addStatus: (status: Omit<Status, 'id'>) => void;
  updateStatus: (id: string, status: Partial<Status>) => void;
  deleteStatus: (id: string) => void;
  getStatusesByTeam: (team: TeamType) => Status[];
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
  // Creative team statuses (ensure IDs are unique by prefixing with 'creative_' if needed)
  { id: 'not_started', name: 'Not Started', team: 'creative', color: '#94a3b8', order: 0 },
  { id: 'scripting', name: 'Scripting', team: 'creative', color: '#a78bfa', order: 1 },
  { id: 'script_confirmed', name: 'Script Confirmed', team: 'creative', color: '#8b5cf6', order: 2 },
  { id: 'shoot_pending', name: 'Shoot Pending', team: 'creative', color: '#f97316', order: 3 },
  { id: 'shoot_finished', name: 'Shoot Finished', team: 'creative', color: '#fb923c', order: 4 },
  { id: 'edit_pending', name: 'Edit Pending', team: 'creative', color: '#3b82f6', order: 5 },
  { id: 'client_approval', name: 'Client Approval', team: 'creative', color: '#ec4899', order: 6 },
  { id: 'approved', name: 'Approved', team: 'creative', color: '#22c55e', order: 7 },
  
  // Web team statuses (ensure IDs are unique by prefixing with 'web_' if needed)
  { id: 'proposal_awaiting', name: 'Proposal Awaiting', team: 'web', color: '#94a3b8', order: 0 },
  { id: 'not_started', name: 'Not Started', team: 'web', color: '#6b7280', order: 1 },
  { id: 'ui_started', name: 'UI Started', team: 'web', color: '#a78bfa', order: 2 },
  { id: 'ui_finished', name: 'UI Finished', team: 'web', color: '#8b5cf6', order: 3 },
  { id: 'development_started', name: 'Development Started', team: 'web', color: '#3b82f6', order: 4 },
  { id: 'development_finished', name: 'Development Finished', team: 'web', color: '#2563eb', order: 5 },
  { id: 'testing', name: 'Testing', team: 'web', color: '#f97316', order: 6 },
  { id: 'handed_over', name: 'Handed Over', team: 'web', color: '#fb923c', order: 7 },
  { id: 'client_reviewing', name: 'Client Reviewing', team: 'web', color: '#ec4899', order: 8 },
  { id: 'completed', name: 'Completed', team: 'web', color: '#22c55e', order: 9 },
];

interface StatusProviderProps {
  children: ReactNode;
}

export const StatusProvider: React.FC<StatusProviderProps> = ({ children }) => {
  const [statuses, setStatuses] = useState<Status[]>(defaultStatuses);

  const addStatus = (status: Omit<Status, 'id'>) => {
    const newStatus: Status = {
      ...status,
      id: `status_${Date.now()}`,
    };
    setStatuses([...statuses, newStatus]);
  };

  const updateStatus = (id: string, updatedFields: Partial<Status>) => {
    setStatuses(statuses.map(status => 
      status.id === id ? { ...status, ...updatedFields } : status
    ));
  };

  const deleteStatus = (id: string) => {
    setStatuses(statuses.filter(status => status.id !== id));
  };

  const getStatusesByTeam = (team: TeamType) => {
    return statuses
      .filter(status => status.team === team)
      .sort((a, b) => a.order - b.order);
  };

  return (
    <StatusContext.Provider
      value={{
        statuses,
        addStatus,
        updateStatus,
        deleteStatus,
        getStatusesByTeam,
      }}
    >
      {children}
    </StatusContext.Provider>
  );
};