import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient('https://ysfknpujqivkudhnhezx.supabase.co', process.env.VITE_SUPABASE_ANON_KEY);

const { data, error } = await supabase.from('users').select('*').limit(1);

if (data && data[0]) {
  console.log('Users table columns:');
  Object.keys(data[0]).forEach(key => console.log(`  ${key}: ${typeof data[0][key]} (${data[0][key]})`));
} else {
  console.log('Error:', error?.message);
} 