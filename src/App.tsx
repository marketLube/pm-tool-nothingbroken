import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { StatusProvider } from './contexts/StatusContext';
import MainLayout from './components/layout/MainLayout';

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

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <StatusProvider>
          <Router>
            <Routes>
              <Route path="/" element={<MainLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="tasks" element={<TaskBoard />} />
                <Route path="status" element={<Status />} />
                <Route path="teams/creative" element={<CreativeTeam />} />
                <Route path="teams/web" element={<WebTeam />} />
                <Route path="reports" element={<Reports />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="users" element={<Users />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Routes>
          </Router>
        </StatusProvider>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;