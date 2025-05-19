import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { 
  LayoutGrid, 
  Kanban, 
  Users, 
  PanelLeft, 
  Settings, 
  LogOut,
  LayoutList,
  PaintBucket,
  Tag,
  ChevronDown,
  ChevronRight,
  Briefcase
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { isAdmin, isManager, userTeam, logout } = useAuth();
  const { getTasksByTeam } = useData();
  const [teamsExpanded, setTeamsExpanded] = useState(true);
  
  // Get team tasks
  const creativeTasks = getTasksByTeam('creative');
  const webTasks = getTasksByTeam('web');
  
  // Count active tasks
  const activeCreativeTasks = creativeTasks.filter(task => task.status !== 'done').length;
  const activeWebTasks = webTasks.filter(task => task.status !== 'done').length;
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const isTeamActive = () => {
    return location.pathname.includes('/teams/');
  };

  // Get current page title
  const getPageTitle = () => {
    const path = location.pathname;
    
    if (path === '/') return 'Dashboard';
    if (path === '/tasks') return 'Task Board';
    if (path === '/status') return 'Status Management';
    if (path === '/teams/creative') return 'Creative Team';
    if (path === '/teams/web') return 'Web Team';
    if (path === '/users') return 'Users Management';
    if (path === '/settings') return 'Settings';
    
    return 'marketlube';
  };

  // Main nav items
  const navItems = [
    {
      name: 'Dashboard',
      path: '/',
      icon: LayoutGrid,
      show: true
    },
    {
      name: 'Task Board',
      path: '/tasks',
      icon: Kanban,
      show: true
    },
    {
      name: 'Status Management',
      path: '/status',
      icon: Tag,
      show: isAdmin
    },
    {
      name: 'Users',
      path: '/users',
      icon: Users,
      show: isAdmin
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: Settings,
      show: isAdmin
    }
  ];

  // Team nav items - separate and enhanced
  const teamItems = [
    {
      name: 'Creative Team',
      path: '/teams/creative',
      icon: PaintBucket,
      color: 'from-purple-500 to-pink-500',
      textColor: 'text-purple-700',
      bgColor: 'bg-purple-50',
      activeTasks: activeCreativeTasks,
      show: isAdmin || userTeam === 'creative'
    },
    {
      name: 'Web Team',
      path: '/teams/web',
      icon: LayoutList,
      color: 'from-blue-500 to-cyan-500',
      textColor: 'text-blue-700',
      bgColor: 'bg-blue-50',
      activeTasks: activeWebTasks,
      show: isAdmin || userTeam === 'web'
    }
  ];

  const filteredNavItems = navItems.filter(item => item.show);
  const filteredTeamItems = teamItems.filter(item => item.show);

  // Get the current item for icon and styling
  const getCurrentItem = () => {
    const path = location.pathname;
    
    // First check if it's a team page
    if (path.includes('/teams/')) {
      return filteredTeamItems.find(item => item.path === path);
    }
    
    // Then check regular nav items
    return filteredNavItems.find(item => item.path === path);
  };
  
  const currentItem = getCurrentItem();
  
  // Determine if current item is a team item (which has textColor)
  const isTeamItem = currentItem && 'color' in currentItem;
  const currentTextColor = isTeamItem && (currentItem as any).textColor ? (currentItem as any).textColor : "text-primary-600";

  return (
    <div className="h-screen fixed left-0 top-0 w-52 bg-white border-r border-gray-200 flex flex-col z-10 shadow-sm">
      <div className="p-4 flex items-center border-b border-gray-200">
        <PanelLeft className="h-5 w-5 text-primary-600 mr-2" />
        <h1 className="text-lg font-semibold tracking-tight text-primary-800 relative group">
          <span className="relative">
            marketlube
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-500 transition-all duration-300 group-hover:w-full"></span>
          </span>
        </h1>
      </div>
      
      <nav className="flex-1 px-2 py-4 overflow-y-auto">
        <div className="mb-4 px-2">
          <h2 className="text-xs font-medium uppercase tracking-wider text-gray-500">Menu</h2>
        </div>
        <ul className="space-y-1">
          {filteredNavItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={clsx(
                  'flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-all',
                  isActive(item.path)
                    ? 'bg-primary-50 text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-primary-600'
                )}
              >
                <item.icon className={clsx(
                  'h-4 w-4 mr-3',
                  isActive(item.path) ? 'text-primary-600' : 'text-gray-500'
                )} />
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
        
        {/* Teams Section - Collapsible */}
        {filteredTeamItems.length > 0 && (
          <div className="mt-6">
            <div 
              className={clsx(
                'flex items-center justify-between px-2 py-2 rounded-md cursor-pointer transition-colors',
                isTeamActive() ? 'bg-gray-100' : 'hover:bg-gray-50'
              )}
              onClick={() => setTeamsExpanded(!teamsExpanded)}
            >
              <div className="flex items-center">
                <Briefcase className="h-4 w-4 text-gray-500 mr-2" />
                <h2 className="text-sm font-medium text-gray-700">Teams</h2>
              </div>
              {teamsExpanded ? 
                <ChevronDown className="h-4 w-4 text-gray-500" /> : 
                <ChevronRight className="h-4 w-4 text-gray-500" />
              }
            </div>
            
            {teamsExpanded && (
              <ul className="mt-1 space-y-1 pl-3">
                {filteredTeamItems.map((team) => (
                  <li key={team.path}>
                    <Link
                      to={team.path}
                      className={clsx(
                        'flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-all',
                        isActive(team.path)
                          ? `${team.bgColor} ${team.textColor} shadow-sm`
                          : 'text-gray-600 hover:bg-gray-50 hover:text-primary-600'
                      )}
                    >
                      <div className={clsx(
                        'flex justify-center items-center h-6 w-6 rounded-full bg-gradient-to-r',
                        team.color,
                        'mr-2'
                      )}>
                        <team.icon className="h-3.5 w-3.5 text-white" />
                      </div>
                      <div className="flex-1">{team.name.split(' ')[0]}</div>
                      {team.activeTasks > 0 && (
                        <span className="bg-gray-200 text-gray-800 text-xs font-medium rounded-full px-2 py-0.5 ml-2">
                          {team.activeTasks}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </nav>
      
      <div className="p-2 border-t border-gray-200">
        <button
          onClick={logout}
          className="flex items-center px-3 py-2.5 w-full text-left rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-danger-600 transition-colors"
        >
          <LogOut className="h-4 w-4 mr-3 text-gray-500" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;