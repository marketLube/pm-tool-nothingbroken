import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import NewClientModal from '../components/clients/NewClientModal';
import { 
  Building2, 
  User, 
  Mail, 
  Phone, 
  Search,
  Plus,
  Users,
  Grid3X3,
  List,
  MoreVertical,
  Edit2,
  Trash2,
  Save,
  X,
  Calendar
} from 'lucide-react';
import { TeamType } from '../types';
import { format } from 'date-fns';
import PermissionGuard from '../components/auth/PermissionGuard';
import { useDebounce } from '../hooks/useDebounce';

const Clients: React.FC = () => {
  const { getClientsByTeam, updateClient, deleteClient, tasks, searchClients } = useData();
  const { currentUser } = useAuth();
  const [newClientModalOpen, setNewClientModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamType | 'all'>('all');
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editingClientName, setEditingClientName] = useState('');
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const actionMenuRef = useRef<HTMLDivElement>(null);
  
  // Debounced search query to optimize database calls
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  
  // Database search state
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Database search effect - performs real-time filtering
  useEffect(() => {
    const performSearch = async () => {
      setIsSearching(true);
      try {
        // Build search filters based on current state
        const filters = {
          team: selectedTeam !== 'all' ? selectedTeam : undefined,
          searchQuery: debouncedSearchQuery || undefined
        };

        const searchResults = await searchClients(filters);
        setFilteredClients(searchResults);
        
        console.log(`[Clients Database Search] Found ${searchResults.length} clients`);
      } catch (error) {
        console.error('Error performing database search:', error);
        setFilteredClients([]);
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [
    debouncedSearchQuery,
    selectedTeam,
    searchClients
  ]);

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

  // Handle team filter change
  const handleTeamFilterChange = (team: TeamType | 'all') => {
    setSelectedTeam(team);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTeam('all');
  };

  // Calculate statistics
  const clientStats = {
    total: filteredClients.length,
    creative: filteredClients.filter(client => client.team === 'creative').length,
    web: filteredClients.filter(client => client.team === 'web').length,
    recent: filteredClients.filter(client => {
      const addedDate = new Date(client.dateAdded);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return addedDate >= thirtyDaysAgo;
    }).length
  };

  const getTeamBadgeColor = (team: TeamType) => {
    switch (team) {
      case 'creative': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'web': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleEditClient = (clientId: string, clientName: string) => {
    setEditingClientId(clientId);
    setEditingClientName(clientName);
  };

  const handleSaveClientEdit = async () => {
    if (!editingClientId || !editingClientName.trim()) return;
    
    try {
      const clientToUpdate = filteredClients.find(c => c.id === editingClientId);
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

  const handleDeleteClient = async (clientId: string, clientName: string) => {
    // Count tasks assigned to this client
    const clientTasks = tasks.filter(task => task.clientId === clientId);
    const taskCount = clientTasks.length;
    
    let confirmMessage = `Are you sure you want to delete "${clientName}"?`;
    if (taskCount > 0) {
      confirmMessage += `\n\nThis client has ${taskCount} task${taskCount > 1 ? 's' : ''} assigned. These tasks will be moved to "Unassigned" and remain on the task board.`;
    }
    confirmMessage += '\n\nThis action cannot be undone.';
    
    if (window.confirm(confirmMessage)) {
      setDeletingClientId(clientId);
      try {
        await deleteClient(clientId);
        setShowActionMenu(null);
      } catch (error) {
        console.error('Error deleting client:', error);
        alert(`Failed to delete client: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setDeletingClientId(null);
      }
    }
  };

  const ClientCard = ({ client }: { client: any }) => {
    const clientTasks = tasks.filter(task => task.clientId === client.id);
    const activeTasksCount = clientTasks.filter(task => 
      selectedTeam === 'creative' ? task.status !== 'approved' : task.status !== 'completed'
    ).length;
    const completedTasksCount = clientTasks.filter(task => 
      selectedTeam === 'creative' ? task.status === 'approved' : task.status === 'completed'
    ).length;

    const isUnassigned = client.name === 'Unassigned';

    return (
      <Card className={`group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
        isUnassigned ? 'border-gray-200 bg-gray-50' : 'border-gray-200 bg-white hover:border-blue-300'
      }`}>
        {/* Gradient overlay for non-unassigned clients */}
        {!isUnassigned && (
          <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
            client.team === 'creative' 
              ? 'from-purple-500 to-pink-500' 
              : 'from-blue-500 to-cyan-500'
          }`} />
        )}

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <Avatar
                name={client.name}
                size="md"
                className={`${isUnassigned ? 'bg-gray-400' : 'bg-gradient-to-br from-blue-500 to-purple-600'} text-white font-semibold`}
              />
              <div>
                {editingClientId === client.id ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={editingClientName}
                      onChange={(e) => setEditingClientName(e.target.value)}
                      className="text-lg font-bold bg-transparent border-b-2 border-blue-500 focus:outline-none focus:border-blue-600"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveClientEdit}
                      className="text-green-600 hover:text-green-700 p-1"
                    >
                      <Save className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleCancelClientEdit}
                      className="text-red-600 hover:text-red-700 p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <CardTitle className={`text-lg ${isUnassigned ? 'text-gray-600' : 'text-gray-900'}`}>
                    {client.name}
                  </CardTitle>
                )}
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTeamBadgeColor(client.team)}`}>
                    {client.team === 'creative' ? 'Creative Team' : 'Web Team'}
                  </span>
                  {!isUnassigned && (
                    <span className="text-xs text-gray-500">
                      {client.industry}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {!isUnassigned && (
              <PermissionGuard resource="client" action="edit">
                <div className="relative" ref={actionMenuRef}>
                  <button
                    onClick={() => setShowActionMenu(showActionMenu === client.id ? null : client.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 rounded-full hover:bg-gray-100"
                  >
                    <MoreVertical className="h-4 w-4 text-gray-500" />
                  </button>

                  {showActionMenu === client.id && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                      <button
                        onClick={() => {
                          handleEditClient(client.id, client.name);
                          setShowActionMenu(null);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit Client
                      </button>
                      <PermissionGuard resource="client" action="delete">
                        <button
                          onClick={() => handleDeleteClient(client.id, client.name)}
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
            )}
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
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage your client relationships and project assignments
          </p>
        </div>

        <PermissionGuard resource="client" action="create">
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setNewClientModalOpen(true)}
          >
            Add Client
          </Button>
        </PermissionGuard>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <Users className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Creative Team</p>
                <p className="text-2xl font-bold text-gray-900">{clientStats.creative}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Web Team</p>
                <p className="text-2xl font-bold text-gray-900">{clientStats.web}</p>
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

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search clients by name, company, or contact..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Team Filter */}
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-500" />
                <select
                  value={selectedTeam}
                  onChange={(e) => handleTeamFilterChange(e.target.value as TeamType | 'all')}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Teams</option>
                  <option value="creative">Creative Team</option>
                  <option value="web">Web Team</option>
                </select>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center border border-gray-300 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              {/* Clear Filters */}
              {(searchQuery || selectedTeam !== 'all') && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={clearFilters}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* Active Filters */}
          {(searchQuery || selectedTeam !== 'all') && (
            <div className="flex flex-wrap gap-2 mt-4">
              {searchQuery && (
                <div className="inline-flex items-center bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
                  <Search className="h-3.5 w-3.5 mr-1" />
                  <span>Search: "{searchQuery}"</span>
                  <button 
                    className="ml-2 text-blue-500 hover:text-blue-700"
                    onClick={() => setSearchQuery('')}
                  >
                    &times;
                  </button>
                </div>
              )}
              
              {selectedTeam !== 'all' && (
                <div className="inline-flex items-center bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm">
                  <Users className="h-3.5 w-3.5 mr-1" />
                  <span>{selectedTeam === 'creative' ? 'Creative Team' : 'Web Team'}</span>
                  <button 
                    className="ml-2 text-green-500 hover:text-green-700"
                    onClick={() => setSelectedTeam('all')}
                  >
                    &times;
                  </button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              {isSearching ? 'Searching...' : `${filteredClients.length} Client${filteredClients.length !== 1 ? 's' : ''}`}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isSearching ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-sm text-gray-600">Searching clients...</p>
              </div>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
              <p className="text-gray-600 mb-4">
                {searchQuery || selectedTeam !== 'all' 
                  ? 'No clients match your current filters.'
                  : 'Get started by adding your first client.'
                }
              </p>
              {(!searchQuery && selectedTeam === 'all') && (
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
            <div className={viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
              : 'space-y-4'
            }>
              {filteredClients.map((client) => (
                <ClientCard key={client.id} client={client} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Client Modal */}
      <NewClientModal
        isOpen={newClientModalOpen}
        onClose={() => setNewClientModalOpen(false)}
      />
    </div>
  );
};

export default Clients; 