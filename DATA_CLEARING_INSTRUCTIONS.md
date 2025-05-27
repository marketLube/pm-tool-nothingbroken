# Data Clearing Instructions

This document provides step-by-step instructions to clear all existing data from your PM Tool application.

## ✅ COMPLETED: Mock Data Cleared

The local mock data has been successfully cleared:
- ✅ `clients` array emptied
- ✅ `tasks` array emptied  
- ✅ `reports` array emptied

## 🔄 NEXT STEPS: Clear Database Data

### Option 1: Quick Clear (All at once)

Run this SQL script in your Supabase SQL editor:

```sql
-- Clear all existing data from the database
DELETE FROM tasks;
DELETE FROM clients;
DELETE FROM reports;

-- Verify deletion
SELECT 'Tasks remaining:' as table_name, COUNT(*) as count FROM tasks
UNION ALL
SELECT 'Clients remaining:' as table_name, COUNT(*) as count FROM clients
UNION ALL
SELECT 'Reports remaining:' as table_name, COUNT(*) as count FROM reports;
```

### Option 2: Step-by-Step Clear (Recommended)

1. **Check current data counts:**
```sql
SELECT 'Current Tasks:' as info, COUNT(*) as count FROM tasks
UNION ALL
SELECT 'Current Clients:' as info, COUNT(*) as count FROM clients
UNION ALL
SELECT 'Current Reports:' as info, COUNT(*) as count FROM reports;
```

2. **Delete all tasks:**
```sql
DELETE FROM tasks;
```

3. **Verify tasks deletion:**
```sql
SELECT 'Tasks after deletion:' as info, COUNT(*) as count FROM tasks;
```

4. **Delete all clients:**
```sql
DELETE FROM clients;
```

5. **Verify clients deletion:**
```sql
SELECT 'Clients after deletion:' as info, COUNT(*) as count FROM clients;
```

6. **Delete all reports:**
```sql
DELETE FROM reports;
```

7. **Final verification:**
```sql
SELECT 'Final Tasks:' as info, COUNT(*) as count FROM tasks
UNION ALL
SELECT 'Final Clients:' as info, COUNT(*) as count FROM clients
UNION ALL
SELECT 'Final Reports:' as info, COUNT(*) as count FROM reports;
```

## 📋 What Data Will Be Preserved

The following data will **NOT** be deleted:
- ✅ User accounts (admins, managers, employees)
- ✅ Team configurations
- ✅ Status configurations
- ✅ Application settings

## 🔄 After Clearing Data

Once you've cleared the data:

1. **Restart your development server** to ensure the changes take effect
2. **Test the application** to verify empty states work correctly
3. **Create new test data** as needed for development

## 📁 Files Created for Data Clearing

- `clear_all_data.sql` - Complete SQL script for clearing all data
- `clear_data_step_by_step.sql` - Step-by-step SQL script with verification
- `clear_mock_data.js` - JavaScript script for clearing mock data (already executed)
- `update_clients_team.sql` - SQL script for updating client teams (for reference)

## ⚠️ Important Notes

- **Backup your data** before running these scripts if you need to preserve anything
- **Run in development environment first** to test the scripts
- **Users and teams are preserved** - only tasks, clients, and reports are cleared
- **The team-based client system** is now in place and ready for new data 