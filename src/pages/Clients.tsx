import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import NewClientModal from '../components/clients/NewClientModal';
import DeleteConfirmationModal from '../components/ui/DeleteConfirmationModal';
import { 
  Building2, 
  Users,
  Search,
  Plus,
  X,
  Edit3,
  Trash2,
  Calendar,
  MoreHorizontal
} from 'lucide-react';
import { TeamType, Client } from '../types';
import PermissionGuard from '../components/auth/PermissionGuard';
import { useDebounce } from '../hooks/useDebounce';
import { useNotification } from '../contexts/NotificationContext';

const Clients: React.FC = () => {
  const { searchClients, updateClient, deleteClient, tasks } = useData();
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useNotification();
  
  // Modal states
  const [newClientModalOpen, setNewClientModalOpen] = useState(false);
  const [editClientModalOpen, setEditClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  
  // Delete confirmation modal states
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  
  // Filter states
  const [teamFilter, setTeamFilter] = useState<TeamType>('creative');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data states
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  
  // Debounced search
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Load clients
  const loadClients = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters = {
        team: teamFilter,
        searchQuery: debouncedSearchQuery || undefined,
        sortBy: 'name' as const
      };

      const searchResults = await searchClients(filters);
      // Filter out unassigned clients
      const filteredResults = searchResults.filter(client => client.name !== 'Unassigned');
      setClients(filteredResults);
    } catch (error) {
      console.error('Error loading clients:', error);
      showError('Failed to load clients');
      setClients([]);
    } finally {
      setIsLoading(false);
    }
  }, [teamFilter, debouncedSearchQuery, searchClients, showError]);

  // Load clients when filters change
  useEffect(() => {
    loadClients();
  }, [loadClients]);

  // Calculate statistics
  const clientStats = useMemo(() => {
    const allClients = clients;
    const recent = allClients.filter(client => {
      const addedDate = new Date(client.dateAdded);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return addedDate >= thirtyDaysAgo;
    });

    return {
      total: allClients.length,
      recent: recent.length
    };
  }, [clients]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchQuery('');
  }, []);

  // Check if any filters are active
  const hasActiveFilters = searchQuery;

  // Client action handlers
  const handleEditClient = useCallback((client: Client) => {
    setEditingClient(client);
    setEditClientModalOpen(true);
  }, []);

  const handleDeleteClient = useCallback((client: Client) => {
    // Count tasks assigned to this client
    const clientTasks = tasks.filter(task => task.clientId === client.id);
    const taskCount = clientTasks.length;
    
    // Prevent deletion if tasks exist
    if (taskCount > 0) {
      showError(`Cannot delete "${client.name}". There are ${taskCount} active task${taskCount > 1 ? 's' : ''} assigned to this client. Please reassign or complete these tasks before deleting the client.`);
      return;
    }
    
    // Show custom confirmation modal
    setClientToDelete(client);
    setDeleteConfirmationOpen(true);
  }, [tasks, showError]);

  const handleConfirmDelete = useCallback(async () => {
    if (!clientToDelete) return;
    
    setDeletingClientId(clientToDelete.id);
    
    try {
      await deleteClient(clientToDelete.id);
      showSuccess(`Client "${clientToDelete.name}" has been deleted successfully.`);
      await loadClients(); // Reload clients
      setDeleteConfirmationOpen(false);
      setClientToDelete(null);
    } catch (error) {
      console.error('Error deleting client:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete client';
      showError(errorMessage);
    } finally {
      setDeletingClientId(null);
    }
  }, [clientToDelete, deleteClient, showSuccess, showError, loadClients]);

  const handleCancelDelete = useCallback(() => {
    setDeleteConfirmationOpen(false);
    setClientToDelete(null);
  }, []);

  // Modal close handler
  const handleClientModalClose = useCallback(async () => {
    setNewClientModalOpen(false);
    setEditClientModalOpen(false);
    setEditingClient(null);
    await loadClients(); // Reload clients after modal closes
  }, [loadClients]);

  // Get team badge color
  const getTeamBadgeColor = (team: TeamType) => {
    switch (team) {
      case 'creative': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'web': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Client Card Component
  const ClientCard = React.memo(({ client }: { client: Client }) => {
    const [showActions, setShowActions] = useState(false);
    const clientTasks = tasks.filter(task => task.clientId === client.id);
    const activeTasksCount = clientTasks.filter(task => 
      teamFilter === 'creative' ? task.status !== 'approved' : task.status !== 'completed'
    ).length;
    const completedTasksCount = clientTasks.filter(task => 
      teamFilter === 'creative' ? task.status === 'approved' : task.status === 'completed'
    ).length;

    return (
      <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-gray-200 bg-white hover:border-blue-300">
        {/* Gradient overlay */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
          client.team === 'creative' 
            ? 'from-purple-500 to-pink-500' 
            : 'from-blue-500 to-cyan-500'
        }`} />

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <Avatar
                name={client.name}
                size="md"
                className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg text-gray-900 truncate">
                  {client.name}
                </CardTitle>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTeamBadgeColor(client.team)}`}>
                    {client.team === 'creative' ? 'Creative Team' : 'Web Team'}
                  </span>
                </div>
              </div>
            </div>

            <PermissionGuard resource="client" action="edit">
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setShowActions(!showActions)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 rounded-full hover:bg-gray-100"
                >
                  <MoreHorizontal className="h-4 w-4 text-gray-500" />
                </button>

                {showActions && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <button
                      onClick={() => {
                        handleEditClient(client);
                        setShowActions(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit Client
                    </button>
                    <PermissionGuard resource="client" action="delete">
                      <button
                        onClick={() => {
                          handleDeleteClient(client);
                          setShowActions(false);
                        }}
                        disabled={deletingClientId === client.id}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {deletingClientId === client.id ? 'Deleting...' : 'Delete Client'}
                      </button>
                    </PermissionGuard>
                  </div>
                )}
              </div>
            </PermissionGuard>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Task Statistics */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex justify-between text-sm">
              <div className="text-center">
                <div className="text-lg font-semibold text-blue-600">{activeTasksCount}</div>
                <div className="text-xs text-gray-500">Active Tasks</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600">{completedTasksCount}</div>
                <div className="text-xs text-gray-500">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-600">{clientTasks.length}</div>
                <div className="text-xs text-gray-500">Total Tasks</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  });

  if (isLoading && clients.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
          <p className="mt-2 text-gray-600">Loading clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Clients</h1>
          <p className="text-sm text-gray-600 mt-1">
            {hasActiveFilters ? `${clients.length} filtered` : `${clientStats.total} total`} clients • {clientStats.recent} added recently
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Clients</p>
                <p className="text-2xl font-bold text-gray-900">{clientStats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className={`h-8 w-8 ${teamFilter === 'creative' ? 'text-purple-600' : 'text-blue-600'}`} />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">{teamFilter === 'creative' ? 'Creative' : 'Web'} Team</p>
                <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Recent (30d)</p>
                <p className="text-2xl font-bold text-gray-900">{clientStats.recent}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modern Filter Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-5">
          <div className="flex items-center justify-between gap-8">
            {/* Team Toggle */}
            <div className="flex items-center gap-8">
              <div className="relative">
                <div className="flex bg-gray-50 rounded-xl p-1">
                  <button
                    onClick={() => setTeamFilter('creative')}
                    className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ease-out ${
                      teamFilter === 'creative'
                        ? 'bg-blue-500 text-white shadow-md transform translate-y-[-1px]'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Creative
                  </button>
                  <button
                    onClick={() => setTeamFilter('web')}
                    className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ease-out ${
                      teamFilter === 'web'
                        ? 'bg-blue-500 text-white shadow-md transform translate-y-[-1px]'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Web
                  </button>
                </div>
              </div>
            
              {/* Divider */}
              <div className="h-5 w-px bg-gray-200"></div>

              {/* Filter Controls */}
              <div className="flex items-center gap-3">
                {/* Search Bar */}
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 transition-colors duration-200 group-focus-within:text-gray-600" />
                  <input
                    type="text"
                    placeholder="Search clients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-72 pl-10 pr-8 py-2.5 text-sm bg-gray-50 border-0 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:shadow-sm placeholder-gray-400 transition-all duration-200"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-md transition-colors duration-200"
                    >
                      <X className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-3">
              {/* Clear Filter Indicator */}
              {hasActiveFilters && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    Search active
                  </div>
                  <button 
                    onClick={clearFilters}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                  >
                    <X className="w-3 h-3" />
                    Clear
                  </button>
                </div>
              )}
              
              {/* Add Client Button */}
              <PermissionGuard resource="client" action="create">
                <button 
                  onClick={() => setNewClientModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  Add Client
                </button>
              </PermissionGuard>
            </div>
          </div>
        </div>
      </div>

      {/* Client Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              {isLoading ? 'Loading...' : `${clients.length} Client${clients.length !== 1 ? 's' : ''}`}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-sm text-gray-600">Loading clients...</p>
              </div>
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
              <p className="text-gray-600 mb-4">
                {hasActiveFilters 
                  ? 'No clients match your current filters.'
                  : 'Get started by adding your first client.'
                }
              </p>
              {(!hasActiveFilters) && (
                <PermissionGuard resource="client" action="create">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Plus}
                    onClick={() => setNewClientModalOpen(true)}
                  >
                    Add Your First Client
                  </Button>
                </PermissionGuard>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clients.map((client) => (
                <ClientCard key={client.id} client={client} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <NewClientModal
        isOpen={newClientModalOpen}
        onClose={handleClientModalClose}
      />

      <NewClientModal
        isOpen={editClientModalOpen}
        onClose={handleClientModalClose}
        initialData={editingClient || undefined}
      />

      {/* Custom Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteConfirmationOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Client"
        message={`Are you sure you want to delete "${clientToDelete?.name}"? This will permanently remove the client from your system.`}
        confirmButtonText="Delete Client"
        cancelButtonText="Cancel"
        isLoading={deletingClientId === clientToDelete?.id}
      />
    </div>
  );
};

export default Clients; 