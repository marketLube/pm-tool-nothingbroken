import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Use the correct Supabase credentials from the app
const supabaseUrl = 'https://ysfknpujqivkudhnhezx.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzZmtucHVqcWl2a3VkaG5oZXp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzU5NjExMywiZXhwIjoyMDYzMTcyMTEzfQ.7q0ONGSxRUvWJS_Vo3DcXnoZt6DSpBqsZhcnX9JTARI';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function addWebUsers() {
  try {
    console.log('Adding web team users...');
    
    const webUsers = [
      {
        id: uuidv4(),
        name: 'Michael Chen',
        email: 'michael@marketlube.com',
        role: 'manager',
        team: 'web',
        join_date: '2023-03-10',
        avatar_url: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150',
        is_active: true,
        allowed_statuses: null,
        password: 'password123',
        created_at: new Date().toISOString()
      },
      {
        id: uuidv4(),
        name: 'David Kim',
        email: 'david@marketlube.com',
        role: 'employee',
        team: 'web',
        join_date: '2023-05-20',
        avatar_url: 'https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=150',
        is_active: true,
        allowed_statuses: null,
        password: 'password123',
        created_at: new Date().toISOString()
      },
      {
        id: uuidv4(),
        name: 'James Wilson',
        email: 'james@marketlube.com',
        role: 'employee',
        team: 'web',
        join_date: '2023-07-03',
        avatar_url: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150',
        is_active: true,
        allowed_statuses: null,
        password: 'password123',
        created_at: new Date().toISOString()
      }
    ];
    
    for (const user of webUsers) {
      console.log(`Adding user: ${user.name} (${user.email})`);
      
      const { data, error } = await supabase
        .from('users')
        .insert([user])
        .select()
        .single();
      
      if (error) {
        console.error(`Error adding user ${user.name}:`, error);
      } else {
        console.log(`✅ Successfully added ${user.name}`);
      }
    }
    
    console.log('\n✅ Finished adding web team users!');
    
    // Verify the users were added
    const { data: allUsers, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('team', 'web');
    
    if (fetchError) {
      console.error('Error fetching web users:', fetchError);
    } else {
      console.log(`\nVerification: Found ${allUsers.length} web team users:`);
      allUsers.forEach(user => {
        console.log(`- ${user.name} (${user.role}) - Active: ${user.is_active}`);
      });
    }
    
  } catch (err) {
    console.error('Exception:', err);
  }
}

addWebUsers(); 