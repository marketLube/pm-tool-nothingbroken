import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { StatusProvider } from './contexts/StatusContext';
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Pages
import Dashboard from './pages/Dashboard';
import TaskBoard from './pages/TaskBoard';
import CreativeTeam from './pages/teams/CreativeTeam';
import WebTeam from './pages/teams/WebTeam';
import Reports from './pages/Reports';
import Analytics from './pages/Analytics';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Status from './pages/Status';
import Unauthorized from './pages/Unauthorized';

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <StatusProvider>
          <Router>
            <Routes>
              <Route path="/" element={<MainLayout />}>
                {/* Dashboard is accessible to everyone who is authenticated */}
                <Route 
                  element={<ProtectedRoute requireAuth />}
                >
                  <Route index element={<Dashboard />} />
                </Route>
                
                {/* Task Board - Accessible to all authenticated users */}
                <Route 
                  element={<ProtectedRoute requireAuth />}
                >
                  <Route path="tasks" element={<TaskBoard />} />
                </Route>
                
                {/* Status Management - Admin only */}
                <Route 
                  element={
                    <ProtectedRoute 
                      resource="status" 
                      action="manage" 
                    />
                  }
                >
                  <Route path="status" element={<Status />} />
                </Route>
                
                {/* Team Pages - Team-specific permissions */}
                <Route 
                  element={
                    <ProtectedRoute 
                      resource="team" 
                      action="view" 
                      resourceTeam="creative" 
                    />
                  }
                >
                  <Route path="teams/creative" element={<CreativeTeam />} />
                </Route>
                
                <Route 
                  element={
                    <ProtectedRoute 
                      resource="team" 
                      action="view" 
                      resourceTeam="web" 
                    />
                  }
                >
                  <Route path="teams/web" element={<WebTeam />} />
                </Route>
                
                {/* Reports - Accessible to everyone with report view permission */}
                <Route 
                  element={
                    <ProtectedRoute 
                      resource="report" 
                      action="view" 
                    />
                  }
                >
                  <Route path="reports" element={<Reports />} />
                </Route>
                
                {/* Analytics - Admin and managers only */}
                <Route 
                  element={
                    <ProtectedRoute 
                      resource="report" 
                      action="approve" 
                    />
                  }
                >
                  <Route path="analytics" element={<Analytics />} />
                </Route>
                
                {/* User Management - Admin only */}
                <Route 
                  element={
                    <ProtectedRoute 
                      resource="user" 
                      action="view" 
                    />
                  }
                >
                  <Route path="users" element={<Users />} />
                </Route>
                
                {/* Settings - Admin only */}
                <Route 
                  element={
                    <ProtectedRoute 
                      resource="team" 
                      action="manage" 
                    />
                  }
                >
                  <Route path="settings" element={<Settings />} />
                </Route>
                
                {/* Unauthorized page - accessible to everyone */}
                <Route path="unauthorized" element={<Unauthorized />} />
              </Route>
            </Routes>
          </Router>
        </StatusProvider>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;