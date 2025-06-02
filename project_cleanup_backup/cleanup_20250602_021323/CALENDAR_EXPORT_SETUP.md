# Calendar Export Feature Setup

## Overview
The Calendar Export feature allows you to generate shareable links for clients to view their calendars without requiring authentication. This is perfect for sharing project timelines and social media content schedules with clients.

## Features
- **Export Button**: Located in the Social/Project Calendar header
- **Dynamic Titles**: 
  - Creative Team → "Social Calendar"
  - Web Team → "Project Calendar"
  - All Teams → "Content Calendar"
- **Team Filtering**: Admins can filter by team before exporting
- **Shareable Links**: Generated links work for 45 days without login
- **Dual Views**: Clients can switch between Calendar and List views
- **Security**: Links expire automatically and are token-based
- **Professional Branding**: Footer includes marketlube attribution

## Database Setup

### 1. Run the SQL Script
Execute the `create_calendar_exports_table.sql` file in your Supabase SQL editor:

```bash
# Copy the contents of create_calendar_exports_table.sql
# and run it in Supabase Dashboard > SQL Editor
```

### 2. Verify Table Creation
The script creates:
- `calendar_exports` table with proper structure
- RLS policies for security
- Indexes for performance
- Auto-cleanup functions for expired exports

## How It Works

### For Admin/Team Members:
1. **Select Team**: (Admin only) Choose Creative, Web, or All Teams
2. **Select Client**: Choose the client you want to export
3. **Click Export & Share**: Button in the header next to "Add Task"
4. **Copy Link**: Modal shows the generated shareable link
5. **Share with Client**: Send the link via email or other communication

### For Clients:
1. **Open Link**: Click the shared link (no login required)
2. **View Calendar**: See their tasks in a beautiful calendar layout
3. **Switch Views**: Toggle between Calendar and List views
4. **Mobile Friendly**: Responsive design works on all devices

## Export Link Details

### Generated URL Format:
```
https://yourapp.com/calendar-export/export_1234567890_abc123def
```

### Link Properties:
- **Unique Token**: Each export has a unique identifier
- **45-Day Expiration**: Links automatically expire after 45 days
- **Team-Specific**: Shows only tasks for the selected team/client
- **Read-Only**: Clients can view but not modify tasks

## Security Features

### Row Level Security (RLS):
- Users can only create exports for their accessible clients
- Public can only view non-expired exports
- Automatic cleanup of expired data

### Token-Based Access:
- Long, random tokens prevent guessing
- No client authentication required
- Links can't be enumerated or brute-forced

## Usage Examples

### Creative Team Export:
- Title: "Social Calendar"
- Shows: Social media content tasks
- Team Badge: Purple "Creative" badges

### Web Team Export:
- Title: "Project Calendar" 
- Shows: Web project tasks
- Team Badge: Blue "Web" badges

### All Teams Export:
- Title: "Content Calendar"
- Shows: All tasks with team-specific colors
- Mixed Badges: Both Creative and Web

## Troubleshooting

### Export Button Disabled:
- Make sure a client is selected
- Check that you have tasks for the selected client/team

### Link Not Working:
- Verify the link hasn't expired (45 days)
- Check that the calendar_exports table exists
- Ensure RLS policies are properly set

### No Tasks Showing:
- Confirm tasks exist for the selected date range
- Check team filter settings
- Verify client has tasks assigned

## Technical Details

### Database Schema:
```sql
calendar_exports (
  id UUID PRIMARY KEY,
  token VARCHAR(255) UNIQUE,
  client_id UUID,
  client_name VARCHAR(255),
  team VARCHAR(50),
  tasks JSONB,
  created_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_by UUID
)
```

### API Endpoints:
- `POST /calendar_exports` - Create new export
- `GET /calendar_exports?token=...` - Retrieve export data

### Frontend Routes:
- `/social-calendar` - Main calendar management
- `/calendar-export/:token` - Public client view

## Maintenance

### Cleanup Expired Exports:
The system includes an automatic cleanup function. You can also manually run:

```sql
SELECT cleanup_expired_calendar_exports();
```

### Monitor Export Usage:
```sql
SELECT 
  client_name,
  team,
  created_at,
  expires_at,
  CASE 
    WHEN expires_at < NOW() THEN 'Expired'
    ELSE 'Active'
  END as status
FROM calendar_exports 
ORDER BY created_at DESC;
```

## Integration Notes

- Exports include all tasks for the selected client/team combination
- Task colors match team assignments (Purple=Creative, Blue=Web)
- Links are immediately shareable after generation
- No additional client setup required 