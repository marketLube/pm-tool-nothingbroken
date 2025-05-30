import React, { useState } from 'react';
import { testSupabaseConnection } from '../../utils/supabase';
import Button from '../ui/Button';
import * as clientService from '../../services/clientService';
import * as userService from '../../services/userService';
import * as taskService from '../../services/taskService';
import * as statusService from '../../services/statusService';
import { Client, User, Task, Status } from '../../types';

const ConnectionTester: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [testResults, setTestResults] = useState<any[]>([]);

  const testRegularConnection = async () => {
    setStatus('testing');
    setMessage('Testing regular Supabase connection...');
    
    try {
      const isConnected = await testSupabaseConnection();
      
      if (isConnected) {
        setStatus('success');
        setMessage('Successfully connected to Supabase with regular key!');
      } else {
        setStatus('error');
        setMessage('Failed to connect to Supabase with regular key. Check console for details.');
      }
    } catch (error) {
      setStatus('error');
      setMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // NOTE: Admin connection test removed since we no longer use admin client for security reasons
  // All operations now use regular client with proper Row Level Security (RLS) policies

  const testAllServices = async () => {
    setStatus('testing');
    setMessage('Testing all services...');
    setTestResults([]);
    
    const results: any[] = [];
    
    try {
      // Test client service
      try {
        const clients = await clientService.getClients();
        results.push({ service: 'Client Service', status: 'success', count: clients.length });
      } catch (error) {
        results.push({ service: 'Client Service', status: 'error', error: String(error) });
      }
      
      // Test user service
      try {
        const users = await userService.getUsers();
        results.push({ service: 'User Service', status: 'success', count: users.length });
      } catch (error) {
        results.push({ service: 'User Service', status: 'error', error: String(error) });
      }
      
      // Test task service
      try {
        const tasks = await taskService.getTasks();
        results.push({ service: 'Task Service', status: 'success', count: tasks.length });
      } catch (error) {
        results.push({ service: 'Task Service', status: 'error', error: String(error) });
      }
      
      // Test status service
      try {
        const statuses = await statusService.getStatuses();
        results.push({ service: 'Status Service', status: 'success', count: statuses.length });
      } catch (error) {
        results.push({ service: 'Status Service', status: 'error', error: String(error) });
      }
      
      setTestResults(results);
      
      const hasErrors = results.some(r => r.status === 'error');
      if (hasErrors) {
        setStatus('error');
        setMessage('Some services failed. Check results below.');
      } else {
        setStatus('success');
        setMessage('All services working correctly!');
      }
      
    } catch (error) {
      setStatus('error');
      setMessage(`Error testing services: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Connection Tester</h2>
      
      <div className="space-y-4">
        <div className="flex space-x-4">
          <Button onClick={testRegularConnection} disabled={status === 'testing'}>
            Test Regular Connection
          </Button>
          
          <Button onClick={testAllServices} disabled={status === 'testing'}>
            Test All Services
          </Button>
        </div>
        
        {message && (
          <div className={`p-4 rounded-md ${
            status === 'success' ? 'bg-green-100 text-green-800' :
            status === 'error' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {message}
          </div>
        )}
        
        {testResults.length > 0 && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Service Test Results:</h3>
            <div className="space-y-2">
              {testResults.map((result, index) => (
                <div key={index} className={`p-3 rounded-md ${
                  result.status === 'success' ? 'bg-green-50 border border-green-200' :
                  'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{result.service}</span>
                    <span className={`px-2 py-1 rounded text-sm ${
                      result.status === 'success' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {result.status}
                    </span>
                  </div>
                  {result.count !== undefined && (
                    <div className="text-sm text-gray-600 mt-1">
                      Found {result.count} records
                    </div>
                  )}
                  {result.error && (
                    <div className="text-sm text-red-600 mt-1">
                      Error: {result.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionTester; 