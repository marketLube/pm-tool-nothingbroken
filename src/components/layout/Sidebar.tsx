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
  Briefcase,
  Building,
  BarChart3
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
    if (path === '/status') return 'Status';
    if (path === '/teams/creative') return 'Creative Team';
    if (path === '/teams/web') return 'Web Team';
    if (path === '/users') return 'Users Management';
    if (path === '/clients') return 'Clients';
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
      name: 'Clients',
      path: '/clients',
      icon: Building,
      show: true
    },
    {
      name: 'Reports & Analytics',
      path: '/reports-analytics',
      icon: BarChart3,
      show: true
    },
    {
      name: 'Status',
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
      show: true
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
    <div className="h-screen fixed left-0 top-0 w-60 bg-white border-r border-gray-100 flex flex-col z-10 shadow-lg transition-all duration-300 ease-in-out">
      <div className="p-5 flex items-center border-b border-gray-100">
        <PanelLeft className="h-5 w-5 text-blue-600 mr-2" />
        <h1 className="text-xl font-bold tracking-tight text-gray-900 relative group">
          <span className="relative bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            marketlube
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 group-hover:w-full"></span>
          </span>
        </h1>
      </div>
      
      <nav className="flex-1 px-3 py-5 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
        <div className="mb-5 px-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Menu</h2>
        </div>
        <ul className="space-y-2">
          {filteredNavItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={clsx(
                  'flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ease-in-out transform hover:translate-x-1',
                  isActive(item.path)
                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 shadow-sm border-l-4 border-blue-500'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'
                )}
              >
                <item.icon className={clsx(
                  'h-5 w-5 mr-3 transition-all duration-200',
                  isActive(item.path) ? 'text-blue-600' : 'text-gray-500'
                )} />
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
        
        {/* Teams Section - Collapsible */}
        {filteredTeamItems.length > 0 && (
          <div className="mt-8">
            <div 
              className={clsx(
                'flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer transition-all duration-200',
                isTeamActive() ? 'bg-gray-100 shadow-sm' : 'hover:bg-gray-50'
              )}
              onClick={() => setTeamsExpanded(!teamsExpanded)}
            >
              <div className="flex items-center">
                <Briefcase className="h-5 w-5 text-gray-600 mr-3" />
                <h2 className="text-sm font-medium text-gray-800">Teams</h2>
              </div>
              <div className="transition-transform duration-300 ease-in-out transform">
                {teamsExpanded ? 
                  <ChevronDown className="h-4 w-4 text-gray-500" /> : 
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                }
              </div>
            </div>
            
            <div className={`mt-2 space-y-2 overflow-hidden transition-all duration-300 ease-in-out ${teamsExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              {filteredTeamItems.map((team) => (
                <li key={team.path} className="list-none pl-3">
                  <Link
                    to={team.path}
                    className={clsx(
                      'flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ease-in-out transform hover:translate-x-1',
                      isActive(team.path)
                        ? `${team.bgColor} ${team.textColor} shadow-sm border-l-4 border-${team.textColor.split('-')[1]}-500`
                        : 'text-gray-600 hover:bg-gray-50 hover:text-primary-600'
                    )}
                  >
                    <div className={clsx(
                      'flex justify-center items-center h-7 w-7 rounded-full bg-gradient-to-r',
                      team.color,
                      'mr-3 shadow-sm'
                    )}>
                      <team.icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">{team.name.split(' ')[0]}</div>
                    {team.activeTasks > 0 && (
                      <span className="bg-white text-gray-800 text-xs font-semibold rounded-full px-2 py-1 ml-2 shadow-sm border border-gray-100">
                        {team.activeTasks}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </div>
          </div>
        )}
      </nav>
      
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={logout}
          className="flex items-center px-4 py-3 w-full text-left rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200 ease-in-out transform hover:translate-x-1"
        >
          <LogOut className="h-5 w-5 mr-3 text-gray-500" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;