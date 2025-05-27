// Script to clear mock data from mockData.ts
// Run this with: node clear_mock_data.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mockDataPath = path.join(__dirname, 'src', 'utils', 'mockData.ts');

try {
  // Read the current file
  let content = fs.readFileSync(mockDataPath, 'utf8');
  
  console.log('Clearing mock data...');
  
  // Replace clients array with empty array
  content = content.replace(
    /export const clients: Client\[] = \[[\s\S]*?\];/,
    'export const clients: Client[] = [];'
  );
  
  // Replace tasks array with empty array
  content = content.replace(
    /export const tasks: Task\[] = \[[\s\S]*?\];/,
    'export const tasks: Task[] = [];'
  );
  
  // Replace reports array with empty array (if it exists)
  content = content.replace(
    /export const reports: Report\[] = \[[\s\S]*?\];/,
    'export const reports: Report[] = [];'
  );
  
  // Write the updated content back to the file
  fs.writeFileSync(mockDataPath, content, 'utf8');
  
  console.log('✅ Mock data cleared successfully!');
  console.log('- Clients array emptied');
  console.log('- Tasks array emptied');
  console.log('- Reports array emptied (if existed)');
  
} catch (error) {
  console.error('❌ Error clearing mock data:', error.message);
} 