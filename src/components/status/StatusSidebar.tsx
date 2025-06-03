import React, { useState, useEffect, useMemo } from 'react';
import { useStatus } from '../../contexts/StatusContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Edit3, 
  Check, 
  X, 
  Palette,
  Circle,
  Settings,
  Layers,
  ArrowUpDown,
  Save,
  Edit
} from 'lucide-react';
import { TeamType, Status, StatusCode } from '../../types';

interface StatusFormData {
  name: string;
  color: string;
}

interface StatusSidebarProps {
  team?: TeamType;
}

const StatusSidebar: React.FC<StatusSidebarProps> = ({ team }) => {
  const { statuses, addStatus, updateStatus, deleteStatus, getStatusesByTeam, isLoading, error, refreshStatuses } = useStatus();
  const { userTeam } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<StatusCode | null>(null);
  const [draggedItem, setDraggedItem] = useState<Status | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<Status[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState<StatusFormData>({
    name: '',
    color: '#3b82f6'
  });
  const [editFormData, setEditFormData] = useState<StatusFormData>({
    name: '',
    color: '#3b82f6'
  });

  // Use the provided team prop if available, otherwise use the user's team
  const currentTeam = (team || userTeam || 'creative') as TeamType;
  
  // Memoize teamStatuses to prevent infinite re-renders
  const teamStatuses = useMemo(() => {
    return getStatusesByTeam(currentTeam);
  }, [getStatusesByTeam, currentTeam]);

  // Exit edit mode when team changes
  useEffect(() => {
    if (isEditMode) {
      console.log('🔄 Team changed while in edit mode, exiting edit mode');
      setIsEditMode(false);
      setPendingOrder([]);
      setDraggedItem(null);
      setDragOverIndex(null);
    }
  }, [currentTeam]); // Only depend on currentTeam

  // Initialize pending order when entering edit mode - only run when edit mode changes
  useEffect(() => {
    if (isEditMode && teamStatuses.length > 0 && pendingOrder.length === 0) {
      console.log('🎯 Initializing edit mode with', teamStatuses.length, 'statuses');
      setPendingOrder([...teamStatuses]);
    }
  }, [isEditMode, teamStatuses]); // 🔥 FIXED: Use actual array instead of length property

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    // Check for duplicate names within the same team
    const isDuplicate = teamStatuses.some(status => 
      status.name.toLowerCase() === formData.name.trim().toLowerCase()
    );
    
    if (isDuplicate) {
      console.warn('⚠️ Status name already exists for this team');
      // Could add toast notification here
      return;
    }

    try {
      await addStatus({
        ...formData,
        name: formData.name.trim(),
        team: currentTeam,
        order: teamStatuses.length
      });

      setFormData({ name: '', color: '#3b82f6' });
      setIsAdding(false);
    } catch (error) {
      console.error('❌ Error adding status:', error);
      // Could add toast notification here
    }
  };

  const handleEdit = (status: Status) => {
    setEditingId(status.id);
    setEditFormData({
      name: status.name,
      color: status.color
    });
  };

  const handleSaveEdit = async (statusId: StatusCode) => {
    if (!editFormData.name.trim()) return;
    
    // Check for duplicate names within the same team (excluding current status)
    const isDuplicate = teamStatuses.some(status => 
      status.id !== statusId && 
      status.name.toLowerCase() === editFormData.name.trim().toLowerCase()
    );
    
    if (isDuplicate) {
      console.warn('⚠️ Status name already exists for this team');
      // Could add toast notification here
      return;
    }
    
    try {
      await updateStatus(statusId, {
        name: editFormData.name.trim(),
        color: editFormData.color
      });
      
      setEditingId(null);
      setEditFormData({ name: '', color: '#3b82f6' });
    } catch (error) {
      console.error('❌ Error updating status:', error);
      // Could add toast notification here
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData({ name: '', color: '#3b82f6' });
  };

  // Enter edit mode
  const handleEnterEditMode = () => {
    console.log('🎯 Entering edit mode');
    setIsEditMode(true);
    setPendingOrder([...teamStatuses]);
  };

  // Cancel edit mode
  const handleCancelEditMode = () => {
    console.log('❌ Canceling edit mode');
    setIsEditMode(false);
    setPendingOrder([]);
    setDraggedItem(null);
    setDragOverIndex(null);
  };

  // Drag and drop handlers - only work in edit mode
  const handleDragStart = (e: React.DragEvent, status: Status) => {
    if (!isEditMode) return;
    
    setDraggedItem(status);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', (e.currentTarget as HTMLElement).outerHTML);
    (e.currentTarget as HTMLElement).style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = '1';
    setDraggedItem(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!isEditMode) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    
    if (!isEditMode || !draggedItem) return;
    
    const draggedIndex = pendingOrder.findIndex(status => status.id === draggedItem.id);
    
    if (draggedIndex === targetIndex || draggedIndex === -1) return;

    // Create new array with reordered items
    const newOrder = [...pendingOrder];
    const [removed] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, removed);

    // Update the order property for all items in the new array
    const updatedOrder = newOrder.map((status, index) => ({
      ...status,
      order: index
    }));

    console.log('✅ Reordered statuses - moved', draggedItem.name, 'to position', targetIndex + 1);
    setPendingOrder(updatedOrder);
    setDraggedItem(null);
    setDragOverIndex(null);
  };

  // Save the reordered statuses
  const handleSaveOrder = async () => {
    console.log('💾 Saving status order...');
    setIsSaving(true);
    
    try {
      // Update each status with its new order
      for (const status of pendingOrder) {
        await updateStatus(status.id, { order: status.order });
      }
      
      // Add a small delay for the animation
      await new Promise(resolve => setTimeout(resolve, 800));
      
      console.log('✅ Status order saved successfully');
      
      // Exit edit mode
      setIsEditMode(false);
      setPendingOrder([]);
      
    } catch (error) {
      console.error('❌ Error saving status order:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStatus = async (statusId: StatusCode) => {
    try {
      await deleteStatus(statusId);
    } catch (error) {
      console.error('❌ Error deleting status:', error);
      // Could add toast notification here
    }
  };

  const predefinedColors = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
    '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e', '#64748b', '#6b7280', '#374151'
  ];

  // Use pending order when in edit mode, otherwise use team statuses
  const displayStatuses = isEditMode ? pendingOrder : teamStatuses;

  // Show loading state
  if (isLoading) {
    return (
      <Card className="h-full bg-white shadow-sm border border-gray-200">
        <CardHeader className="pb-4 border-b border-gray-100">
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-purple-100">
                <Layers className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <span className="text-gray-900">Workflow Statuses</span>
                <p className="text-xs text-gray-500 font-normal mt-0.5">Loading...</p>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-600">Loading statuses...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state with retry option
  if (error) {
    return (
      <Card className="h-full bg-white shadow-sm border border-red-200">
        <CardHeader className="pb-4 border-b border-red-100">
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-red-100">
                <Layers className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <span className="text-gray-900">Workflow Statuses</span>
                <p className="text-xs text-red-600 font-normal mt-0.5">Error loading</p>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="text-center py-12">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              <X className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Failed to load statuses</h3>
            <p className="text-xs text-gray-500 mb-4 max-w-sm mx-auto">{error}</p>
            <Button
              variant="primary"
              size="sm"
              onClick={refreshStatuses}
              className="bg-red-600 hover:bg-red-700"
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full bg-white shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
      <CardHeader className="pb-4 border-b border-gray-100">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-purple-100">
              <Layers className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <span className="text-gray-900">Workflow Statuses</span>
              <p className="text-xs text-gray-500 font-normal mt-0.5">
                {displayStatuses.length} status{displayStatuses.length !== 1 ? 'es' : ''} configured
                {isEditMode && (
                  <span className="ml-2 text-blue-600 font-medium">• Edit Mode</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* Edit Mode Controls */}
            {isEditMode ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={X}
                  onClick={handleCancelEditMode}
                  className="text-gray-600 hover:bg-gray-100"
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={isSaving ? undefined : Save}
                  onClick={handleSaveOrder}
                  disabled={isSaving}
                  className={`bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-sm ${
                    isSaving ? 'animate-pulse' : ''
                  }`}
                >
                  {isSaving ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </div>
                  ) : (
                    'Save Order'
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Edit}
                  onClick={handleEnterEditMode}
                  className="text-blue-600 hover:bg-blue-50"
                  disabled={teamStatuses.length === 0}
                >
                  Edit Order
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Plus}
                  onClick={() => setIsAdding(true)}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-sm"
                >
                  Add Status
                </Button>
              </>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-4">
        {/* Edit mode instructions */}
        {isEditMode && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg animate-fadeIn">
            <div className="flex items-center space-x-2">
              <ArrowUpDown className="h-4 w-4 text-blue-600" />
              <p className="text-sm text-blue-800 font-medium">
                Drag and drop statuses to reorder them. Click "Save Order" when finished.
              </p>
            </div>
          </div>
        )}

        {/* Add Status Form */}
        {isAdding && (
          <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 animate-fadeIn">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Status Name
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter status name..."
                  fullWidth
                  required
                  className="text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Status Color
                </label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                      className="h-10 w-16 rounded-lg cursor-pointer border border-gray-300"
                    />
                    <div className="flex items-center space-x-2">
                      <Circle 
                        className="h-4 w-4" 
                        style={{ color: formData.color, fill: formData.color }}
                      />
                      <span className="text-sm text-gray-600">Preview</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-10 gap-2">
                    {predefinedColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, color }))}
                        className={`h-6 w-6 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
                          formData.color === color ? 'border-gray-400 shadow-md' : 'border-gray-200'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setIsAdding(false);
                    setFormData({ name: '', color: '#3b82f6' });
                  }}
                  type="button"
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  className="text-xs bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  Add Status
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Status List */}
        <div className="space-y-3">
          {displayStatuses.length > 0 && !isEditMode && (
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Layers className="h-4 w-4" />
                <span>Current workflow order</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <Settings className="h-3 w-3" />
                <span>{displayStatuses.length} total</span>
              </div>
            </div>
          )}
          
          {displayStatuses.map((status, index) => (
            <div
              key={status.id}
              draggable={isEditMode && editingId !== status.id && !isSaving}
              onDragStart={(e) => handleDragStart(e, status)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`group relative bg-white border rounded-lg p-4 transition-all duration-200 animate-slideIn ${
                isEditMode && draggedItem === status ? 'opacity-50 scale-95 border-blue-300' 
                  : isEditMode && dragOverIndex === index ? 'border-blue-400 shadow-md bg-blue-50' 
                  : isEditMode ? 'border-blue-200 bg-blue-25 cursor-move'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
              } ${isSaving ? 'pointer-events-none opacity-75' : ''}`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {editingId === status.id ? (
                // Edit Mode
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <GripVertical className="h-4 w-4 text-gray-400" />
                    <Input
                      value={editFormData.name}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="flex-1 text-sm"
                      autoFocus
                    />
                  </div>
                  
                  <div className="flex items-center space-x-3 ml-7">
                    <input
                      type="color"
                      value={editFormData.color}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, color: e.target.value }))}
                      className="h-8 w-12 rounded cursor-pointer border border-gray-300"
                    />
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="xs"
                        icon={Check}
                        onClick={() => handleSaveEdit(status.id)}
                        className="text-green-600 hover:bg-green-50"
                      >
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        icon={X}
                        onClick={handleCancelEdit}
                        className="text-red-600 hover:bg-red-50"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <GripVertical className={`h-4 w-4 ${
                      isEditMode ? 'text-blue-500 cursor-grab active:cursor-grabbing' : 'text-gray-400'
                    }`} />
                    <div
                      className="w-4 h-4 rounded-full border border-gray-200 shadow-sm"
                      style={{ backgroundColor: status.color }}
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">{status.name}</span>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-500">Order: {status.order + 1}</span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500" style={{ color: status.color }}>
                          {status.color}
                        </span>
                        {isEditMode && (
                          <>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-blue-600 font-medium">Draggable</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className={`flex items-center space-x-1 transition-opacity duration-200 ${
                    isEditMode || isSaving ? 'opacity-50 pointer-events-none' : 'opacity-0 group-hover:opacity-100'
                  }`}>
                    <Button
                      variant="ghost"
                      size="xs"
                      icon={Edit3}
                      onClick={() => handleEdit(status)}
                      className="text-blue-600 hover:bg-blue-50"
                      title="Edit status"
                      disabled={isEditMode || isSaving}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      icon={Trash2}
                      onClick={() => handleDeleteStatus(status.id)}
                      className="text-red-600 hover:bg-red-50"
                      title="Delete status"
                      disabled={isEditMode || isSaving}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {displayStatuses.length === 0 && (
            <div className="text-center py-12 animate-fadeIn">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4">
                <Palette className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">No statuses configured</h3>
              <p className="text-xs text-gray-500 mb-4 max-w-sm mx-auto">
                Get started by creating your first workflow status for the {currentTeam} team.
              </p>
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => setIsAdding(true)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                Create First Status
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StatusSidebar;