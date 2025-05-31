import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysfknpujqivkudhnhezx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzZmtucHVqcWl2a3VkaG5oZXp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1OTYxMTMsImV4cCI6MjA2MzE3MjExM30.zSHRvncRmwEMNTPgfIgieN6A4tZ2VeCfu6u';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testNewAuthLogic() {
  console.log('🧪 Testing New Authentication Logic');
  console.log('==================================');
  
  const testUsers = [
    { email: 'testuser@marketlube.com', password: 'testpass123' },
    { email: 'althameem@marketlube.in', password: 'Mark@99' }, // Try admin too
    { email: 'nonexistent@test.com', password: 'wrong' }
  ];

  for (const testUser of testUsers) {
    console.log(`\n🔐 Testing: ${testUser.email}`);
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', testUser.email.toLowerCase())
        .eq('password', testUser.password)
        .eq('is_active', true)
        .limit(1);
      
      if (error) {
        console.log(`  ❌ Error: ${error.message}`);
        continue;
      }
      
      if (data && data.length > 0) {
        const user = data[0];
        console.log(`  ✅ Login successful!`);
        console.log(`     Name: ${user.name}`);
        console.log(`     Role: ${user.role}`);
        console.log(`     Team: ${user.team}`);
      } else {
        console.log(`  ❌ Invalid credentials or user not found`);
      }
    } catch (error) {
      console.log(`  ❌ Exception: ${error.message}`);
    }
  }
  
  console.log('\n📊 Test Summary');
  console.log('===============');
  console.log('If you see ✅ for any users above, authentication is working!');
  console.log('Next step: Start the dev server and test in the browser.');
}

testNewAuthLogic(); 