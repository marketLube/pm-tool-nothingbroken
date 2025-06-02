#!/usr/bin/env node

/**
 * UPDATE SUPABASE KEYS
 * ===================
 * 
 * This script helps you update Supabase API keys in all configuration files.
 * 
 * Usage:
 * node update_keys.mjs <anon_key> [service_role_key]
 */

import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);

if (args.length < 1) {
  console.log('🔑 UPDATE SUPABASE KEYS');
  console.log('=======================\n');
  console.log('Usage: node update_keys.mjs <anon_key> [service_role_key]');
  console.log('\nExample:');
  console.log('node update_keys.mjs "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...."');
  console.log('\nGet your keys from:');
  console.log('https://supabase.com/dashboard/project/ysfknpujqivkudhnhezx/settings/api');
  process.exit(1);
}

const anonKey = args[0];
const serviceRoleKey = args[1];

// Validate anon key format (basic JWT check)
if (!anonKey.includes('.') || anonKey.split('.').length !== 3) {
  console.error('❌ Invalid anon key format. JWT should have 3 parts separated by dots.');
  process.exit(1);
}

if (anonKey.length < 200) {
  console.warn('⚠️  Warning: Anon key seems short. Make sure you copied the complete key.');
}

console.log('🔄 Updating Supabase keys...');
console.log(`Anon key length: ${anonKey.length} characters`);

if (serviceRoleKey) {
  console.log(`Service role key length: ${serviceRoleKey.length} characters`);
}

// Files to update
const filesToUpdate = [
  { file: '.env', desc: 'Environment file' },
  { file: '.env.local', desc: 'Local environment file' },
  { file: 'vercel.json', desc: 'Vercel configuration' }
];

function updateEnvFile(filePath, description) {
  try {
    let content = '';
    
    if (fs.existsSync(filePath)) {
      content = fs.readFileSync(filePath, 'utf8');
    }
    
    // Update or add URL
    const url = 'https://ysfknpujqivkudhnhezx.supabase.co';
    if (content.includes('VITE_SUPABASE_URL=')) {
      content = content.replace(/VITE_SUPABASE_URL=.*/, `VITE_SUPABASE_URL=${url}`);
    } else {
      content += `\nVITE_SUPABASE_URL=${url}`;
    }
    
    // Update or add anon key
    if (content.includes('VITE_SUPABASE_ANON_KEY=')) {
      content = content.replace(/VITE_SUPABASE_ANON_KEY=.*/, `VITE_SUPABASE_ANON_KEY=${anonKey}`);
    } else {
      content += `\nVITE_SUPABASE_ANON_KEY=${anonKey}`;
    }
    
    // Update or add service role key if provided
    if (serviceRoleKey) {
      if (content.includes('SUPABASE_SERVICE_ROLE_KEY=')) {
        content = content.replace(/SUPABASE_SERVICE_ROLE_KEY=.*/, `SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}`);
      } else {
        content += `\nSUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}`;
      }
    }
    
    // Clean up multiple newlines
    content = content.replace(/\n\n+/g, '\n').trim() + '\n';
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated ${description}`);
    
  } catch (error) {
    console.error(`❌ Failed to update ${description}:`, error.message);
  }
}

function updateVercelJson() {
  try {
    let vercelConfig = {};
    
    if (fs.existsSync('vercel.json')) {
      const content = fs.readFileSync('vercel.json', 'utf8');
      vercelConfig = JSON.parse(content);
    }
    
    // Ensure env section exists
    if (!vercelConfig.env) {
      vercelConfig.env = {};
    }
    
    // Update keys
    vercelConfig.env.VITE_SUPABASE_URL = 'https://ysfknpujqivkudhnhezx.supabase.co';
    vercelConfig.env.VITE_SUPABASE_ANON_KEY = anonKey;
    
    // Write back with proper formatting
    fs.writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2) + '\n');
    console.log('✅ Updated Vercel configuration');
    
  } catch (error) {
    console.error('❌ Failed to update vercel.json:', error.message);
  }
}

// Update all files
console.log('\n📝 Updating configuration files...');

updateEnvFile('.env', 'Environment file (.env)');
updateEnvFile('.env.local', 'Local environment file (.env.local)');
updateVercelJson();

console.log('\n🧪 Testing connection...');

// Test the new keys
import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://ysfknpujqivkudhnhezx.supabase.co', anonKey);

try {
  console.log('🔌 Testing Supabase connection...');
  
  const { data, error } = await supabase
    .from('users')
    .select('count', { count: 'exact' })
    .limit(1);
  
  if (error) {
    console.error('❌ Connection test failed:', error.message);
    console.log('\nPossible issues:');
    console.log('1. Key is still incorrect');
    console.log('2. RLS policies are blocking access');
    console.log('3. Users table does not exist');
  } else {
    console.log('✅ Connection successful!');
    console.log('\nNext steps:');
    console.log('1. Test your app login');
    console.log('2. If login fails, run the SQL fix: copy fix_user_authentication.sql to Supabase');
    console.log('3. Consider migrating to proper Supabase Auth: node migrate_users_to_auth.js');
  }
  
} catch (error) {
  console.error('❌ Connection test error:', error.message);
}

console.log('\n🎉 Key update completed!');
console.log('\nFiles updated:');
console.log('- .env');
console.log('- .env.local');
console.log('- vercel.json');
console.log('\nTest your app now!'); 