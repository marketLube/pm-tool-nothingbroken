import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useData } from '../contexts/DataContext';
import { 
  Plus, 
  Edit2, 
  Check, 
  X, 
  Building, 
  Mail, 
  Phone, 
  User, 
  Calendar, 
  Palette, 
  Code, 
  Trash2, 
  MoreVertical,
  Search,
  Filter,
  Users,
  TrendingUp,
  Activity,
  Star,
  MapPin,
  Globe,
  Clock,
  ChevronDown,
  Eye,
  ExternalLink
} from 'lucide-react';
import NewClientModal from '../components/clients/NewClientModal';
import { TeamType } from '../types';

const Clients: React.FC = () => {
  const { getClientsByTeam, updateClient, deleteClient, tasks } = useData();
  const [newClientModalOpen, setNewClientModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamType>('creative');
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editingClientName, setEditingClientName] = useState('');
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'tasks' | 'recent'>('name');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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

  // Filtered and sorted clients
  const filteredClients = useMemo(() => {
    const clients = selectedTeam === 'creative' ? creativeClients : webClients;
    
    // Filter by search query
    let filtered = clients.filter(client =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.industry?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort clients
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'tasks':
          const aTaskCount = tasks.filter(task => task.clientId === a.id).length;
          const bTaskCount = tasks.filter(task => task.clientId === b.id).length;
          return bTaskCount - aTaskCount;
        case 'recent':
          return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return filtered;
  }, [selectedTeam, creativeClients, webClients, searchQuery, sortBy, tasks]);

  // Statistics
  const stats = useMemo(() => {
    const allClients = [...creativeClients, ...webClients];
    const currentTeamClients = selectedTeam === 'creative' ? creativeClients : webClients;
    const currentTeamTasks = tasks.filter(task => {
      const client = allClients.find(c => c.id === task.clientId);
      return client?.team === selectedTeam;
    });

    const activeTasks = currentTeamTasks.filter(task => 
      selectedTeam === 'creative' ? task.status !== 'approved' : task.status !== 'completed'
    );

    const clientsWithTasks = currentTeamClients.filter(client => 
      tasks.some(task => task.clientId === client.id)
    );

    return {
      totalClients: currentTeamClients.length,
      activeClients: clientsWithTasks.length,
      totalTasks: currentTeamTasks.length,
      activeTasks: activeTasks.length
    };
  }, [creativeClients, webClients, selectedTeam, tasks]);

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
            selectedTeam === 'creative' 
              ? 'from-purple-500 to-pink-500' 
              : 'from-blue-500 to-cyan-500'
          }`} />
        )}

        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            {editingClientId === client.id ? (
              <div className="flex items-center space-x-2 flex-grow">
                <input
                  type="text"
                  value={editingClientName}
                  onChange={(e) => setEditingClientName(e.target.value)}
                  className="flex-grow px-3 py-2 text-lg font-semibold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveClientEdit();
                    if (e.key === 'Escape') handleCancelClientEdit();
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSaveClientEdit}
                  className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-all"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleCancelClientEdit}
                  className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1">
                  <CardTitle className="text-xl font-bold text-gray-900 flex items-center mb-2">
                    <div className={`p-2 rounded-lg mr-3 ${
                      isUnassigned 
                        ? 'bg-gray-100 text-gray-500' 
                        : selectedTeam === 'creative'
                          ? 'bg-purple-100 text-purple-600'
                          : 'bg-blue-100 text-blue-600'
                    }`}>
                      <Building className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <span className={isUnassigned ? 'text-gray-600 italic' : ''}>
                        {client.name}
                      </span>
                      {isUnassigned && (
                        <span className="ml-2 text-xs font-normal text-gray-500">(System)</span>
                      )}
                      {client.industry && (
                        <div className="text-sm font-normal text-gray-500 mt-1">
                          {client.industry}
                        </div>
                      )}
                    </div>
                  </CardTitle>
                  
                  {/* Task Statistics */}
                  <div className="flex items-center space-x-4 mb-3">
                    {activeTasksCount > 0 && (
                      <div className={`flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        isUnassigned
                          ? 'bg-gray-100 text-gray-600'
                          : selectedTeam === 'creative' 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-blue-100 text-blue-700'
                      }`}>
                        <Activity className="h-3 w-3 mr-1" />
                        {activeTasksCount} active
                      </div>
                    )}
                    {completedTasksCount > 0 && (
                      <div className="flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <Check className="h-3 w-3 mr-1" />
                        {completedTasksCount} completed
                      </div>
                    )}
                  </div>
                </div>

                {!isUnassigned && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowActionMenu(showActionMenu === client.id ? null : client.id)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      title="More actions"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  
                    {showActionMenu === client.id && (
                      <div 
                        ref={actionMenuRef}
                        className="absolute top-12 right-0 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50 min-w-[160px] animate-fadeIn"
                      >
                        <button
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center transition-colors"
                          onClick={() => {
                            handleEditClient(client.id, client.name);
                            setShowActionMenu(null);
                          }}
                        >
                          <Edit2 className="h-4 w-4 mr-3 text-blue-500" />
                          Edit Client
                        </button>
                        <button
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors"
                          onClick={() => handleDeleteClient(client.id, client.name)}
                          disabled={deletingClientId === client.id}
                        >
                          <Trash2 className="h-4 w-4 mr-3" />
                          {deletingClientId === client.id ? 'Deleting...' : 'Delete Client'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Contact Information */}
          <div className="space-y-3">
            {client.contactPerson && (
              <div className="flex items-center text-sm text-gray-600">
                <div className="p-1.5 rounded-md bg-gray-100 mr-3">
                  <User className="h-3.5 w-3.5 text-gray-500" />
                </div>
                <span className="font-medium">{client.contactPerson}</span>
              </div>
            )}
            
            {client.email && (
              <div className="flex items-center text-sm">
                <div className="p-1.5 rounded-md bg-blue-100 mr-3">
                  <Mail className="h-3.5 w-3.5 text-blue-500" />
                </div>
                <a 
                  href={`mailto:${client.email}`}
                  className="text-blue-600 hover:text-blue-800 transition-colors font-medium hover:underline"
                >
                  {client.email}
                </a>
              </div>
            )}
            
            {client.phone && (
              <div className="flex items-center text-sm">
                <div className="p-1.5 rounded-md bg-green-100 mr-3">
                  <Phone className="h-3.5 w-3.5 text-green-500" />
                </div>
                <a 
                  href={`tel:${client.phone}`}
                  className="text-green-600 hover:text-green-800 transition-colors font-medium hover:underline"
                >
                  {client.phone}
                </a>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex items-center text-xs text-gray-500">
              <Calendar className="h-3.5 w-3.5 mr-2" />
              <span>Added {new Date(client.dateAdded).toLocaleDateString()}</span>
            </div>
            
            {clientTasks.length > 0 && (
              <div className="flex items-center text-xs text-gray-500">
                <TrendingUp className="h-3.5 w-3.5 mr-1" />
                <span>{clientTasks.length} total tasks</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Client Management</h1>
            <p className="text-gray-600">Manage your client relationships and track project engagement</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => setNewClientModalOpen(true)}
              className="shadow-lg hover:shadow-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 transition-all duration-300"
            >
              Add New Client
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 mb-1">Total Clients</p>
                  <p className="text-3xl font-bold text-blue-900">{stats.totalClients}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 mb-1">Active Clients</p>
                  <p className="text-3xl font-bold text-green-900">{stats.activeClients}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <Activity className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 mb-1">Total Tasks</p>
                  <p className="text-3xl font-bold text-purple-900">{stats.totalTasks}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600 mb-1">Active Tasks</p>
                  <p className="text-3xl font-bold text-orange-900">{stats.activeTasks}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-full">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Tabs */}
        <div className="flex items-center justify-between">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setSelectedTeam('creative')}
              className={`flex items-center px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                selectedTeam === 'creative'
                  ? 'bg-white text-purple-700 shadow-md transform scale-105'
                  : 'text-gray-600 hover:text-purple-700 hover:bg-gray-50'
              }`}
            >
              <Palette className="h-4 w-4 mr-2" />
              Creative Team
              <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                selectedTeam === 'creative' 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {creativeClients.length}
              </span>
            </button>
            <button
              onClick={() => setSelectedTeam('web')}
              className={`flex items-center px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                selectedTeam === 'web'
                  ? 'bg-white text-blue-700 shadow-md transform scale-105'
                  : 'text-gray-600 hover:text-blue-700 hover:bg-gray-50'
              }`}
            >
              <Code className="h-4 w-4 mr-2" />
              Web Team
              <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                selectedTeam === 'web' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {webClients.length}
              </span>
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'tasks' | 'recent')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="name">Sort by Name</option>
              <option value="tasks">Sort by Tasks</option>
              <option value="recent">Sort by Recent</option>
            </select>
          </div>
        </div>

        {/* Clients Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>

        {/* Empty State */}
        {filteredClients.length === 0 && (
          <Card className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100">
            <CardContent>
              <div className="mx-auto w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-6">
                <Building className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {searchQuery ? 'No clients found' : `No ${selectedTeam} clients yet`}
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                {searchQuery 
                  ? `No clients match "${searchQuery}". Try adjusting your search terms.`
                  : `Get started by adding your first ${selectedTeam} client to begin tracking projects and relationships.`
                }
              </p>
              {!searchQuery && (
                <Button
                  variant="primary"
                  icon={Plus}
                  onClick={() => setNewClientModalOpen(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  Add Your First Client
                </Button>
              )}
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