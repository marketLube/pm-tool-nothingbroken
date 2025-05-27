import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useData } from '../contexts/DataContext';
import { Plus, Edit2, Check, X, Building, Mail, Phone, User, Calendar, Palette, Code, Trash2, MoreVertical } from 'lucide-react';
import NewClientModal from '../components/clients/NewClientModal';
import { TeamType } from '../types';
import { testAdminConnection, supabaseAdmin } from '../utils/supabase';

const Clients: React.FC = () => {
  const { getClientsByTeam, updateClient, deleteClient, tasks } = useData();
  const [newClientModalOpen, setNewClientModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamType>('creative');
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editingClientName, setEditingClientName] = useState('');
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  
  const creativeClients = getClientsByTeam('creative');
  const webClients = getClientsByTeam('web');

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setShowActionMenu(null);
      }
    };

    if (showActionMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActionMenu]);

  const handleEditClient = (clientId: string, clientName: string) => {
    setEditingClientId(clientId);
    setEditingClientName(clientName);
  };

  const handleSaveClientEdit = async () => {
    if (!editingClientId || !editingClientName.trim()) return;
    
    try {
      const allClients = [...creativeClients, ...webClients];
      const clientToUpdate = allClients.find(c => c.id === editingClientId);
      if (clientToUpdate) {
        await updateClient({
          ...clientToUpdate,
          name: editingClientName.trim()
        });
      }
      setEditingClientId(null);
      setEditingClientName('');
    } catch (error) {
      console.error('Error updating client:', error);
    }
  };

  const handleCancelClientEdit = () => {
    setEditingClientId(null);
    setEditingClientName('');
  };

  const testDatabaseConnection = async () => {
    try {
      console.log('Testing database connection...');
      const isConnected = await testAdminConnection();
      console.log('Database connection result:', isConnected);
      alert(isConnected ? 'Database connection successful!' : 'Database connection failed!');
    } catch (error) {
      console.error('Database connection test error:', error);
      alert('Database connection test failed!');
    }
  };

  const debugClientData = async () => {
    try {
      console.log('=== CLIENT DATA DEBUG ===');
      
      // Get clients from database
      const { data: dbClients, error } = await supabaseAdmin
        .from('clients')
        .select('*');
      
      if (error) {
        console.error('Error fetching clients from database:', error);
        return;
      }
      
      console.log('Clients in database:', dbClients.length);
      dbClients.forEach(client => {
        console.log(`DB Client: ${client.name} (${client.team}) - ID: ${client.id}`);
      });
      
      // Get clients from local state
      const localClients = [...creativeClients, ...webClients];
      console.log('Clients in local state:', localClients.length);
      localClients.forEach(client => {
        console.log(`Local Client: ${client.name} (${client.team}) - ID: ${client.id}`);
      });
      
      // Find mismatches
      const dbIds = new Set(dbClients.map(c => c.id));
      const localIds = new Set(localClients.map(c => c.id));
      
      const onlyInDb = dbClients.filter(c => !localIds.has(c.id));
      const onlyInLocal = localClients.filter(c => !dbIds.has(c.id));
      
      if (onlyInDb.length > 0) {
        console.log('Clients only in database:', onlyInDb);
      }
      
      if (onlyInLocal.length > 0) {
        console.log('Clients only in local state:', onlyInLocal);
      }
      
      alert(`DB: ${dbClients.length} clients, Local: ${localClients.length} clients. Check console for details.`);
      
    } catch (error) {
      console.error('Debug error:', error);
      alert('Debug failed! Check console.');
    }
  };

  const handleDeleteClient = async (clientId: string, clientName: string) => {
    // Count tasks assigned to this client
    const clientTasks = tasks.filter(task => task.clientId === clientId);
    const taskCount = clientTasks.length;
    
    console.log('=== CLIENT DELETION DEBUG ===');
    console.log('Client to delete:', { id: clientId, name: clientName });
    console.log('Tasks assigned to this client:', clientTasks);
    console.log('Current clients list:', (selectedTeam === 'creative' ? creativeClients : webClients).map(c => ({ id: c.id, name: c.name })));
    
    let confirmMessage = `Are you sure you want to delete "${clientName}"?`;
    if (taskCount > 0) {
      confirmMessage += `\n\nThis client has ${taskCount} task${taskCount > 1 ? 's' : ''} assigned. These tasks will be moved to "Unassigned" and remain on the task board.`;
    }
    confirmMessage += '\n\nThis action cannot be undone.';
    
    if (window.confirm(confirmMessage)) {
      setDeletingClientId(clientId);
      try {
        console.log('Calling deleteClient function...');
        await deleteClient(clientId);
        console.log('deleteClient function completed successfully');
        setShowActionMenu(null);
        
        // Force a small delay to ensure state updates
        setTimeout(() => {
          console.log('Clients after deletion:', (selectedTeam === 'creative' ? creativeClients : webClients).map(c => ({ id: c.id, name: c.name })));
        }, 100);
        
      } catch (error) {
        console.error('Error deleting client:', error);
        alert(`Failed to delete client: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setDeletingClientId(null);
      }
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
            <p className="text-gray-600">Manage your client information by team</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={testDatabaseConnection}
              className="text-sm"
            >
              Test DB
            </Button>
            <Button
              variant="secondary"
              onClick={debugClientData}
              className="text-sm"
            >
              Debug Data
            </Button>
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => setNewClientModalOpen(true)}
              className="shadow-md hover:shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 transition-all duration-300"
            >
              Add New Client
            </Button>
          </div>
        </div>

        {/* Team Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setSelectedTeam('creative')}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedTeam === 'creative'
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-gray-600 hover:text-purple-700'
            }`}
          >
            <Palette className="h-4 w-4 mr-2" />
            Creative Team ({creativeClients.length})
          </button>
          <button
            onClick={() => setSelectedTeam('web')}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedTeam === 'web'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-600 hover:text-blue-700'
            }`}
          >
            <Code className="h-4 w-4 mr-2" />
            Web Team ({webClients.length})
          </button>
        </div>

        {/* Clients Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(selectedTeam === 'creative' ? creativeClients : webClients).map((client) => {
            const clientTasks = tasks.filter(task => task.clientId === client.id);
            const activeTasksCount = clientTasks.filter(task => 
              selectedTeam === 'creative' ? task.status !== 'approved' : task.status !== 'completed'
            ).length;
            
            return (
            <Card key={client.id} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  {editingClientId === client.id ? (
                    <div className="flex items-center space-x-2 flex-grow">
                      <input
                        type="text"
                        value={editingClientName}
                        onChange={(e) => setEditingClientName(e.target.value)}
                        className="flex-grow px-2 py-1 text-lg font-semibold border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveClientEdit();
                          if (e.key === 'Escape') handleCancelClientEdit();
                        }}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleSaveClientEdit}
                        className="p-1 text-green-600 hover:text-green-800 transition-colors"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelClientEdit}
                        className="p-1 text-red-600 hover:text-red-800 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                        <Building className={`h-5 w-5 mr-2 ${
                          client.name === 'Unassigned' ? 'text-gray-500' : 'text-blue-600'
                        }`} />
                        <span className={`flex-1 ${
                          client.name === 'Unassigned' ? 'text-gray-600 italic' : ''
                        }`}>
                          {client.name}
                          {client.name === 'Unassigned' && (
                            <span className="ml-2 text-xs font-normal text-gray-500">(System)</span>
                          )}
                        </span>
                        {activeTasksCount > 0 && (
                          <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                            client.name === 'Unassigned'
                              ? 'bg-gray-100 text-gray-600'
                              : selectedTeam === 'creative' 
                                ? 'bg-purple-100 text-purple-700' 
                                : 'bg-blue-100 text-blue-700'
                          }`}>
                            {activeTasksCount} task{activeTasksCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </CardTitle>
                      {client.name !== 'Unassigned' && (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowActionMenu(showActionMenu === client.id ? null : client.id)}
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-md hover:bg-gray-50"
                            title="More actions"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        
                        {showActionMenu === client.id && (
                          <div 
                            ref={actionMenuRef}
                            className="absolute top-10 right-0 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50 min-w-[140px]"
                          >
                            {client.name !== 'Unassigned' && (
                              <button
                                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                                onClick={() => {
                                  handleEditClient(client.id, client.name);
                                  setShowActionMenu(null);
                                }}
                              >
                                <Edit2 className="h-3 w-3 mr-2" />
                                Edit Client
                              </button>
                            )}
                            {client.name !== 'Unassigned' && (
                              <button
                                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
                                onClick={() => handleDeleteClient(client.id, client.name)}
                                disabled={deletingClientId === client.id}
                              >
                                <Trash2 className="h-3 w-3 mr-2" />
                                {deletingClientId === client.id ? 'Deleting...' : 'Delete Client'}
                              </button>
                            )}
                          </div>
                        )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {client.industry && (
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="font-medium">Industry:</span>
                    <span className="ml-2">{client.industry}</span>
                  </div>
                )}
                
                {client.contactPerson && (
                  <div className="flex items-center text-sm text-gray-600">
                    <User className="h-4 w-4 mr-2 text-gray-400" />
                    <span>{client.contactPerson}</span>
                  </div>
                )}
                
                {client.email && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="h-4 w-4 mr-2 text-gray-400" />
                    <a 
                      href={`mailto:${client.email}`}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      {client.email}
                    </a>
                  </div>
                )}
                
                {client.phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="h-4 w-4 mr-2 text-gray-400" />
                    <a 
                      href={`tel:${client.phone}`}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      {client.phone}
                    </a>
                  </div>
                )}
                
                <div className="flex items-center text-sm text-gray-500 pt-2 border-t border-gray-100">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>Added: {new Date(client.dateAdded).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {(selectedTeam === 'creative' ? creativeClients : webClients).length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No {selectedTeam === 'creative' ? 'creative' : 'web'} clients yet
              </h3>
              <p className="text-gray-600 mb-6">
                Get started by adding your first {selectedTeam === 'creative' ? 'creative' : 'web'} client
              </p>
              <Button
                variant="primary"
                icon={Plus}
                onClick={() => setNewClientModalOpen(true)}
              >
                Add Your First Client
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <NewClientModal
        isOpen={newClientModalOpen}
        onClose={() => setNewClientModalOpen(false)}
        team={selectedTeam}
      />
    </>
  );
};

export default Clients; 