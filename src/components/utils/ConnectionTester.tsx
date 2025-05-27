import React, { useState } from 'react';
import { testSupabaseConnection, testAdminConnection } from '../../utils/supabase';
import { runAdminCredentialsUpdate } from '../../utils/updateAdminCredentials';
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

  const testAdminConnectionHandler = async () => {
    setStatus('testing');
    setMessage('Testing admin Supabase connection...');
    
    try {
      const isConnected = await testAdminConnection();
      
      if (isConnected) {
        setStatus('success');
        setMessage('Successfully connected to Supabase with admin key!');
      } else {
        setStatus('error');
        setMessage('Failed to connect to Supabase with admin key. Check console for details.');
      }
    } catch (error) {
      setStatus('error');
      setMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const updateAdminCredentials = async () => {
    setStatus('testing');
    setMessage('Updating admin credentials in database...');
    
    try {
      const success = await runAdminCredentialsUpdate();
      
      if (success) {
        setStatus('success');
        setMessage('✅ Admin credentials updated successfully! New login: althameem@marketlube.in / Mark@99');
      } else {
        setStatus('error');
        setMessage('❌ Failed to update admin credentials. Check console for details.');
      }
    } catch (error) {
      setStatus('error');
      setMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const testAllDataOperations = async () => {
    setStatus('testing');
    setMessage('Testing all data operations...');
    setTestResults([]);
    
    try {
      // Test fetching existing data
      setTestResults(prev => [...prev, { step: 'Fetching users', data: 'Starting...' }]);
      const users = await userService.getUsers();
      setTestResults(prev => [...prev, { step: 'Users fetched', data: `Found ${users.length} users` }]);

      setTestResults(prev => [...prev, { step: 'Fetching clients', data: 'Starting...' }]);
      const clients = await clientService.getClients();
      setTestResults(prev => [...prev, { step: 'Clients fetched', data: `Found ${clients.length} clients` }]);

      setTestResults(prev => [...prev, { step: 'Fetching tasks', data: 'Starting...' }]);
      const tasks = await taskService.getTasks();
      setTestResults(prev => [...prev, { step: 'Tasks fetched', data: `Found ${tasks.length} tasks` }]);

      setTestResults(prev => [...prev, { step: 'Fetching statuses', data: 'Starting...' }]);
      const statuses = await statusService.getStatuses();
      setTestResults(prev => [...prev, { step: 'Statuses fetched', data: `Found ${statuses.length} statuses` }]);

      setStatus('success');
      setMessage(`Successfully tested all data operations! Found ${users.length} users, ${clients.length} clients, ${tasks.length} tasks, ${statuses.length} statuses`);
    } catch (error) {
      console.error('Test data operations error:', error);
      setStatus('error');
      setMessage(`Error testing data operations: ${error instanceof Error ? error.message : String(error)}`);
      
      setTestResults(prev => [...prev, { 
        step: 'Error occurred', 
        data: error instanceof Error ? { message: error.message, stack: error.stack } : error 
      }]);
    }
  };

  const testClientCreation = async () => {
    setStatus('testing');
    setMessage('Testing client creation...');
    setTestResults([]);
    
    try {
      // Create a test client with a timestamp to make it unique
      const timestamp = new Date().toISOString();
      const testClient: Omit<Client, 'id' | 'dateAdded'> = {
        name: `Test Client ${timestamp}`,
        industry: 'Test Industry',
        contactPerson: 'Test Person',
        email: 'test@example.com',
        phone: '1234567890'
      };
      
      // Record test data
      setTestResults(prev => [...prev, { step: 'Preparing client data', data: testClient }]);
      
      // Create client
      const newClient = await clientService.createClient(testClient);
      
      // Record result
      setTestResults(prev => [...prev, { step: 'Client created', data: newClient }]);
      
      setStatus('success');
      setMessage(`Successfully created test client with ID: ${newClient.id}`);
    } catch (error) {
      console.error('Test client creation error:', error);
      setStatus('error');
      setMessage(`Error creating test client: ${error instanceof Error ? error.message : String(error)}`);
      
      // Record error
      setTestResults(prev => [...prev, { 
        step: 'Error occurred', 
        data: error instanceof Error ? { message: error.message, stack: error.stack } : error 
      }]);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Supabase Connection & Data Tester</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Button 
          variant="primary"
          onClick={testRegularConnection}
          disabled={status === 'testing'}
          size="sm"
        >
          Test Regular Connection
        </Button>
        
        <Button 
          variant="primary"
          onClick={testAdminConnectionHandler}
          disabled={status === 'testing'}
          size="sm"
        >
          Test Admin Connection
        </Button>
        
        <Button 
          variant="secondary"
          onClick={testAllDataOperations}
          disabled={status === 'testing'}
          size="sm"
        >
          Test All Data Fetch
        </Button>
        
        <Button 
          variant="secondary"
          onClick={testClientCreation}
          disabled={status === 'testing'}
          size="sm"
        >
          Test Client Creation
        </Button>
      </div>
      
      <div className="mb-4">
        <Button 
          variant="warning"
          onClick={updateAdminCredentials}
          disabled={status === 'testing'}
          size="sm"
          className="w-full"
        >
          Update Admin Credentials (althameem@marketlube.in / Mark@99)
        </Button>
      </div>
      
      {status !== 'idle' && (
        <div className={`p-4 rounded-md ${
          status === 'testing' ? 'bg-blue-50 text-blue-700' : 
          status === 'success' ? 'bg-green-50 text-green-700' : 
          'bg-red-50 text-red-700'
        }`}>
          <p className="font-medium">{message}</p>
        </div>
      )}
      
      {testResults.length > 0 && (
        <div className="mt-4">
          <h3 className="font-medium mb-2">Test Results:</h3>
          <div className="border rounded-md overflow-hidden max-h-96 overflow-y-auto">
            {testResults.map((result, index) => (
              <div key={index} className={`p-3 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                <p className="font-medium">{result.step}</p>
                <pre className="mt-1 text-xs overflow-auto max-h-40">
                  {typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionTester; 