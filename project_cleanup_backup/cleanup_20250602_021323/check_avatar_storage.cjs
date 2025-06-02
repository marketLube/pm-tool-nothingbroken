const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.log('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function checkAvatarStorage() {
  console.log('🔍 Checking Avatar Storage in Database...\n');
  
  try {
    // Check users table structure
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, avatar_url')
      .limit(10);
    
    if (error) {
      console.log('❌ Error fetching users:', error.message);
      return;
    }
    
    console.log('✅ Users table accessible');
    console.log('📊 Avatar Status Report:');
    console.log('='.repeat(50));
    
    let avatarCount = 0;
    let emptyAvatarCount = 0;
    
    users.forEach(user => {
      const hasAvatar = user.avatar_url && user.avatar_url.trim() !== '';
      console.log(`👤 ${user.name}:`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Avatar: ${hasAvatar ? '✅ ' + user.avatar_url : '❌ No avatar'}`);
      console.log('');
      
      if (hasAvatar) {
        avatarCount++;
      } else {
        emptyAvatarCount++;
      }
    });
    
    console.log('='.repeat(50));
    console.log(`📈 Summary:`);
    console.log(`   Total users: ${users.length}`);
    console.log(`   With avatars: ${avatarCount}`);
    console.log(`   Without avatars: ${emptyAvatarCount}`);
    console.log(`   Avatar coverage: ${((avatarCount / users.length) * 100).toFixed(1)}%`);
    
    // Test avatar update functionality
    console.log('\n🔧 Testing Avatar Update...');
    
    const testUser = users.find(u => u.email === 'althameem@marketlube.in');
    if (testUser) {
      const newAvatarUrl = 'https://api.dicebear.com/7.x/avataaars/svg?seed=TestAvatar&backgroundColor=purple';
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: newAvatarUrl })
        .eq('id', testUser.id);
      
      if (updateError) {
        console.log('❌ Avatar update failed:', updateError.message);
      } else {
        console.log('✅ Avatar update successful!');
        
        // Verify the update
        const { data: updatedUser, error: fetchError } = await supabase
          .from('users')
          .select('avatar_url')
          .eq('id', testUser.id)
          .single();
        
        if (!fetchError && updatedUser) {
          console.log(`✅ Verified: Avatar URL updated to ${updatedUser.avatar_url}`);
        }
      }
    }
    
    // Check database schema for avatar_url column
    console.log('\n🏗️ Checking Database Schema...');
    const { data: schema, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'users')
      .eq('column_name', 'avatar_url');
    
    if (!schemaError && schema && schema.length > 0) {
      console.log('✅ avatar_url column exists in database');
      console.log(`   Type: ${schema[0].data_type}`);
      console.log(`   Nullable: ${schema[0].is_nullable}`);
    } else {
      console.log('❌ avatar_url column not found in database schema');
    }
    
  } catch (err) {
    console.log('❌ Database connection error:', err.message);
  }
}

checkAvatarStorage(); 