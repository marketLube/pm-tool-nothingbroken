import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { StatusProvider } from './contexts/StatusContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { RealtimeProvider } from './contexts/RealtimeContext';
import { SimpleRealtimeProvider } from './contexts/SimpleRealtimeContext';
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import UserSyncComponent from './components/UserSyncComponent';
import SessionIndicator from './components/ui/SessionIndicator';
import { ensurePasswordField } from './utils/supabase';

// Pages
import Dashboard from './pages/Dashboard';
import TaskBoard from './pages/TaskBoard';
import SimpleTaskBoard from './pages/SimpleTaskBoard';
import CreativeTeam from './pages/teams/CreativeTeam';
import WebTeam from './pages/teams/WebTeam';
import Reports from './pages/Reports';
import Analytics from './pages/Analytics';
import ReportsAnalytics from './pages/ReportsAnalytics';
import Users from './pages/Users';
import Clients from './pages/Clients';
import Settings from './pages/Settings';
import Status from './pages/Status';
import SuperAdminModules from './pages/SuperAdminModules';
import Attendance from './pages/Attendance';
import AttendanceCalendar from './pages/AttendanceCalendar';
import SocialCalendar from './pages/SocialCalendar';
import CalendarExport from './pages/CalendarExport';
import Unauthorized from './pages/Unauthorized';
import Login from './pages/Login';
import ConnectionTester from './components/utils/ConnectionTester';
import BiometricTest from './components/utils/BiometricTest';
import BiometricDebug from './components/utils/BiometricDebug';
import BrowserDebugger from './components/utils/BrowserDebugger';

function App() {
  // Run once when the app starts
  useEffect(() => {
    // Ensure the password field exists in the database
    ensurePasswordField()
      .then(() => console.log('Database schema check completed'))
      .catch(err => console.error('Error checking database schema:', err));
  }, []);

  return (
    <NotificationProvider>
      <AuthProvider>
        <StatusProvider>
          <SimpleRealtimeProvider>
            <RealtimeProvider>
              <DataProvider>
              <UserSyncComponent />
              <SessionIndicator />
              <Router>
                <Routes>
                  {/* Login route - accessible to everyone but redirects to dashboard if logged in */}
                  <Route path="/login" element={<Login />} />
                  
                  {/* Unauthorized page - accessible to everyone */}
                  <Route path="/unauthorized" element={<Unauthorized />} />
                  
                  {/* Public Calendar Export - No authentication required */}
                  <Route path="/calendar-export/:token" element={<CalendarExport />} />
                  
                  {/* Temporary testing routes */}
                  <Route path="/test-connection" element={<ConnectionTester />} />
                  <Route path="/test-biometric" element={<BiometricTest />} />
                  <Route path="/debug-biometric" element={<BiometricDebug />} />
                  <Route path="/simple-tasks" element={<SimpleTaskBoard />} />
                  <Route path="/debug-browser" element={<BrowserDebugger />} />
                  
                  {/* Protected routes within MainLayout */}
                  <Route element={<ProtectedRoute requireAuth redirectPath="/login" />}>
                    <Route element={<MainLayout />}>
                      {/* Dashboard is accessible to everyone who is authenticated */}
                      <Route index element={<Dashboard />} />
                      
                      {/* Task Board - Accessible to all authenticated users */}
                      <Route path="tasks" element={<TaskBoard />} />
                      
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
                      
                      {/* Super Admin Modules - Super Admin only */}
                      <Route 
                        element={
                          <ProtectedRoute 
                            resource="super_admin" 
                            action="access" 
                          />
                        }
                      >
                        <Route path="super-admin/modules" element={<SuperAdminModules />} />
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
                      
                      {/* Client Management - Accessible to all authenticated users */}
                      <Route path="clients" element={<Clients />} />
                      
                      {/* Reports & Analytics - Accessible to all authenticated users */}
                      <Route path="reports-analytics" element={<ReportsAnalytics />} />
                      
                      {/* Attendance - Accessible to all authenticated users */}
                      <Route path="attendance" element={<Attendance />} />
                      <Route path="attendance/calendar" element={<AttendanceCalendar />} />
                      
                      {/* Calendar - Accessible to all authenticated users */}
                      <Route path="calendar" element={<SocialCalendar />} />
                      
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
                    </Route>
                  </Route>
                  
                  {/* Redirect root to login if not authenticated */}
                  <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
                              </Router>
              </DataProvider>
            </RealtimeProvider>
          </SimpleRealtimeProvider>
        </StatusProvider>
      </AuthProvider>
    </NotificationProvider>
  );
}

export default App;