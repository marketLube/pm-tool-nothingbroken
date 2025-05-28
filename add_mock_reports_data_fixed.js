import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { format, subDays, addDays } from 'date-fns';

// Use the correct Supabase credentials from the app
const supabaseUrl = 'https://ysfknpujqivkudhnhezx.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzZmtucHVqcWl2a3VkaG5oZXp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzU5NjExMywiZXhwIjoyMDYzMTcyMTEzfQ.7q0ONGSxRUvWJS_Vo3DcXnoZt6DSpBqsZhcnX9JTARI';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function addMockReportsData() {
  try {
    console.log('🚀 Adding mock data for Reports & Analytics...');
    
    // First, check if tables exist
    console.log('🔍 Checking if tables exist...');
    
    const { data: dailyWorkTest, error: dailyWorkError } = await supabase
      .from('daily_work_entries')
      .select('*')
      .limit(1);
    
    if (dailyWorkError) {
      console.error('❌ daily_work_entries table does not exist. Please run the SQL from SETUP_REPORTS_TABLES.md first.');
      return;
    }
    
    const { data: taskCompletionsTest, error: taskCompletionsError } = await supabase
      .from('task_completions')
      .select('*')
      .limit(1);
    
    if (taskCompletionsError) {
      console.error('❌ task_completions table does not exist. Please run the SQL from SETUP_REPORTS_TABLES.md first.');
      return;
    }
    
    console.log('✅ Tables exist, proceeding with data creation...');
    
    // Get all users and clients
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('is_active', true);
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }
    
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*');
    
    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
      return;
    }
    
    console.log(`Found ${users.length} active users and ${clients.length} clients`);
    
    // Create some sample tasks for both teams
    const mockTasks = [];
    const creativeUsers = users.filter(u => u.team === 'creative');
    const webUsers = users.filter(u => u.team === 'web');
    const creativeClients = clients.filter(c => c.team === 'creative');
    const webClients = clients.filter(c => c.team === 'web');
    
    // Creative team tasks
    const creativeTasks = [
      {
        title: 'Brand Logo Design',
        description: 'Create a modern logo for the client',
        priority: 'high',
        team: 'creative',
        status: 'scripting'
      },
      {
        title: 'Social Media Campaign',
        description: 'Design social media posts for product launch',
        priority: 'medium',
        team: 'creative',
        status: 'edit_pending'
      },
      {
        title: 'Product Photography',
        description: 'Professional product photos for e-commerce',
        priority: 'high',
        team: 'creative',
        status: 'shoot_finished'
      },
      {
        title: 'Website Banner Design',
        description: 'Create promotional banners for website',
        priority: 'low',
        team: 'creative',
        status: 'client_approval'
      },
      {
        title: 'Video Advertisement',
        description: 'Create 30-second promotional video',
        priority: 'high',
        team: 'creative',
        status: 'not_started'
      }
    ];
    
    // Web team tasks
    const webTaskTemplates = [
      {
        title: 'E-commerce Website',
        description: 'Build online store with payment integration',
        priority: 'high',
        team: 'web',
        status: 'development_started'
      },
      {
        title: 'Mobile App Development',
        description: 'React Native app for iOS and Android',
        priority: 'medium',
        team: 'web',
        status: 'ui_finished'
      },
      {
        title: 'Database Optimization',
        description: 'Improve query performance and indexing',
        priority: 'medium',
        team: 'web',
        status: 'testing'
      },
      {
        title: 'API Integration',
        description: 'Integrate third-party payment APIs',
        priority: 'high',
        team: 'web',
        status: 'client_reviewing'
      },
      {
        title: 'Website Redesign',
        description: 'Modern responsive website redesign',
        priority: 'low',
        team: 'web',
        status: 'not_started'
      }
    ];
    
    // Create tasks for creative team
    for (let i = 0; i < creativeTasks.length; i++) {
      const task = creativeTasks[i];
      const assignee = creativeUsers[i % creativeUsers.length];
      const client = creativeClients[i % creativeClients.length];
      
      mockTasks.push({
        id: uuidv4(),
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assignee_id: assignee.id,
        client_id: client.id,
        team: task.team,
        due_date: format(addDays(new Date(), Math.floor(Math.random() * 14) + 1), 'yyyy-MM-dd'),
        created_at: new Date().toISOString(),
        created_by: assignee.id
      });
    }
    
    // Create tasks for web team
    for (let i = 0; i < webTaskTemplates.length; i++) {
      const task = webTaskTemplates[i];
      const assignee = webUsers[i % webUsers.length];
      const client = webClients[i % webClients.length];
      
      mockTasks.push({
        id: uuidv4(),
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assignee_id: assignee.id,
        client_id: client.id,
        team: task.team,
        due_date: format(addDays(new Date(), Math.floor(Math.random() * 14) + 1), 'yyyy-MM-dd'),
        created_at: new Date().toISOString(),
        created_by: assignee.id
      });
    }
    
    console.log(`📝 Creating ${mockTasks.length} sample tasks...`);
    
    // Insert tasks
    for (const task of mockTasks) {
      const { error: taskError } = await supabase
        .from('tasks')
        .insert([task]);
      
      if (taskError) {
        console.error(`Error creating task ${task.title}:`, taskError);
      } else {
        console.log(`✅ Created task: ${task.title}`);
      }
    }
    
    // Create daily work entries for the past week
    console.log('\n📅 Creating daily work entries for the past week...');
    
    const dailyEntries = [];
    const taskCompletions = [];
    
    // Generate data for the past 7 days
    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const date = format(subDays(new Date(), dayOffset), 'yyyy-MM-dd');
      
      for (const user of users) {
        // 80% chance user worked on any given day
        if (Math.random() > 0.2) {
          const checkInTime = `${8 + Math.floor(Math.random() * 2)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`;
          const checkOutTime = `${17 + Math.floor(Math.random() * 3)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`;
          
          const workEntry = {
            id: uuidv4(),
            user_id: user.id,  // Fixed: use user_id instead of userId
            date: date,
            check_in_time: checkInTime,  // Fixed: use check_in_time instead of checkInTime
            check_out_time: checkOutTime,  // Fixed: use check_out_time instead of checkOutTime
            is_absent: false,  // Fixed: use is_absent instead of isAbsent
            notes: `Work completed for ${date}`,
            created_at: new Date().toISOString()
          };
          
          dailyEntries.push(workEntry);
          
          // Get user's tasks and randomly complete some
          const userTasks = mockTasks.filter(t => t.assignee_id === user.id);
          
          // 30% chance to complete a task on any given day
          if (userTasks.length > 0 && Math.random() > 0.7) {
            const taskToComplete = userTasks[Math.floor(Math.random() * userTasks.length)];
            
            const completion = {
              id: uuidv4(),
              user_id: user.id,  // Fixed: use user_id instead of userId
              task_id: taskToComplete.id,  // Fixed: use task_id instead of taskId
              date: date,
              completed_at: `${date}T${checkOutTime}:00Z`,  // Fixed: use completed_at instead of completedAt
              notes: `Completed during work session`,
              created_at: new Date().toISOString()
            };
            
            taskCompletions.push(completion);
          }
        } else {
          // User was absent
          const workEntry = {
            id: uuidv4(),
            user_id: user.id,  // Fixed: use user_id instead of userId
            date: date,
            check_in_time: null,  // Fixed: use check_in_time instead of checkInTime
            check_out_time: null,  // Fixed: use check_out_time instead of checkOutTime
            is_absent: true,  // Fixed: use is_absent instead of isAbsent
            notes: 'Absent',
            created_at: new Date().toISOString()
          };
          
          dailyEntries.push(workEntry);
        }
      }
    }
    
    console.log(`📊 Creating ${dailyEntries.length} daily work entries...`);
    
    // Insert daily work entries in batches
    const batchSize = 10;
    for (let i = 0; i < dailyEntries.length; i += batchSize) {
      const batch = dailyEntries.slice(i, i + batchSize);
      const { error: entryError } = await supabase
        .from('daily_work_entries')
        .insert(batch);
      
      if (entryError) {
        console.error(`Error creating work entries batch ${i}-${i + batchSize}:`, entryError);
      } else {
        console.log(`✅ Created work entries batch ${i + 1}-${Math.min(i + batchSize, dailyEntries.length)}`);
      }
    }
    
    console.log(`🎯 Creating ${taskCompletions.length} task completions...`);
    
    // Insert task completions in batches
    for (let i = 0; i < taskCompletions.length; i += batchSize) {
      const batch = taskCompletions.slice(i, i + batchSize);
      const { error: completionError } = await supabase
        .from('task_completions')
        .insert(batch);
      
      if (completionError) {
        console.error(`Error creating task completions batch ${i}-${i + batchSize}:`, completionError);
      } else {
        console.log(`✅ Created task completions batch ${i + 1}-${Math.min(i + batchSize, taskCompletions.length)}`);
      }
    }
    
    console.log('\n✅ Mock data creation completed!');
    console.log('\n📈 Summary:');
    console.log(`- Created ${mockTasks.length} sample tasks`);
    console.log(`- Created ${dailyEntries.length} daily work entries`);
    console.log(`- Created ${taskCompletions.length} task completions`);
    console.log(`- Data spans the last 7 days`);
    console.log('\n🎉 You can now test the Reports & Analytics page with realistic data!');
    
    // Verify data was inserted
    console.log('\n🔍 Verifying data insertion...');
    
    const { data: verifyWork, error: verifyWorkError } = await supabase
      .from('daily_work_entries')
      .select('*')
      .limit(5);
    
    if (verifyWorkError) {
      console.error('Error verifying work entries:', verifyWorkError);
    } else {
      console.log(`✅ Verified: ${verifyWork.length} work entries found in database`);
    }
    
    const { data: verifyCompletions, error: verifyCompletionsError } = await supabase
      .from('task_completions')
      .select('*')
      .limit(5);
    
    if (verifyCompletionsError) {
      console.error('Error verifying task completions:', verifyCompletionsError);
    } else {
      console.log(`✅ Verified: ${verifyCompletions.length} task completions found in database`);
    }
    
  } catch (err) {
    console.error('Exception:', err);
  }
}

addMockReportsData(); 