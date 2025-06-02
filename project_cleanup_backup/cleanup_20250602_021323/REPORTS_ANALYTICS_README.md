# Reports & Analytics Module

## Overview

The Reports & Analytics module provides a comprehensive daily work tracking and performance analytics system for the project management tool. It features role-based access control, real-time task management, and detailed reporting capabilities.

## Features

### 🎯 Core Functionality

- **Daily Work Tracking**: Track check-in/check-out times, task assignments, and completions
- **Task Management**: Assign tasks to specific days and move them between assigned/completed states
- **Absence Management**: Mark users as absent with automatic time clearing
- **Real-time Updates**: Instant updates when tasks are completed or moved
- **Role-based Access**: Different views for admins and regular users

### 📊 Analytics & Reporting

- **Team Analytics**: Comprehensive team performance metrics
- **Individual Reports**: Personal productivity tracking
- **Completion Rates**: Task completion percentages and trends
- **Time Tracking**: Work hours calculation based on check-in/out times
- **Weekly Views**: Week-by-week progress tracking

### 🎨 User Interface

- **Responsive Design**: Works seamlessly on desktop and mobile
- **Card-based Layout**: Clean, modern interface with intuitive navigation
- **Fixed Filter Panel**: Sticky filters for easy access while scrolling
- **Interactive Elements**: Drag-and-drop style task completion
- **Visual Indicators**: Color-coded status badges and progress indicators

## User Roles & Permissions

### 👑 Admin View
- **Full Access**: View all teams and users
- **Team Selector**: Switch between Web and Creative teams
- **User Selector**: View individual user reports or all users
- **Management Controls**: Add tasks, mark absences, manage check-in times
- **Analytics Dashboard**: Complete team performance overview

### 👤 Employee View
- **Personal Dashboard**: View only their own daily reports
- **Task Management**: Complete assigned tasks and track progress
- **Time Tracking**: Record check-in/check-out times
- **Self-service**: Mark own absences and manage daily activities
- **Limited Filters**: Date selection only

## Technical Implementation

### 🗄️ Database Schema

#### Tables Created:
1. **daily_work_entries**
   - Stores daily work records for each user
   - Tracks check-in/out times, assigned/completed tasks
   - Handles absence marking

2. **task_completions**
   - Records task completion events
   - Links tasks to users with completion timestamps
   - Supports completion notes

#### Security Features:
- **Row Level Security (RLS)**: Users can only access their own data
- **Admin Override**: Admins can view/modify all records
- **Secure Policies**: Comprehensive access control policies

### 🔧 Service Layer

#### dailyReportService.ts
- **CRUD Operations**: Create, read, update, delete daily work entries
- **Task Management**: Move tasks between assigned/completed states
- **Analytics Functions**: Generate reports and calculate metrics
- **Utility Functions**: Helper methods for common operations

### 🎨 Component Architecture

#### ReportsAnalytics.tsx (Main Component)
- **Filter Management**: Team, user, and date filtering
- **State Management**: Real-time updates and data synchronization
- **Navigation**: Week-by-week navigation with quick access buttons

#### DailyCard Component
- **Task Display**: Side-by-side assigned/completed task cards
- **Interactive Elements**: Click-to-complete task functionality
- **Time Management**: Check-in/out time pickers
- **Absence Controls**: Toggle absence status

## Setup Instructions

### 1. Database Migration

Run the database migration to create the necessary tables:

```bash
# Option 1: Run the migration script
node run_reports_migration.js

# Option 2: Manual SQL execution
# Copy the SQL from src/sql/create_reports_analytics_tables.sql
# and run it in your Supabase SQL Editor
```

### 2. Environment Setup

Ensure your environment variables are configured:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key (optional)
```

### 3. Navigation Setup

The module is automatically added to the sidebar navigation as "Reports & Analytics" and is accessible to all authenticated users.

## Usage Guide

### For Admins

1. **Access the Module**: Click "Reports & Analytics" in the sidebar
2. **Select Team**: Choose between Web Team and Creative Team
3. **Filter Users**: Select specific users or view all team members
4. **Navigate Weeks**: Use the week navigation controls or "This Week" button
5. **Manage Tasks**: 
   - Click the circle icon to mark tasks as completed
   - Click the checkmark icon to move tasks back to assigned
   - Use "Add Task" to assign new tasks to specific days
6. **Track Attendance**: Use the "Mark Absent" toggle for each user/day
7. **Monitor Time**: Set check-in/check-out times for accurate hour tracking

### For Employees

1. **View Personal Reports**: Access shows only your own daily cards
2. **Complete Tasks**: Click the circle icon next to assigned tasks to mark them complete
3. **Track Time**: Set your check-in and check-out times
4. **Mark Absence**: Toggle the absence status if you're not working
5. **Navigate Dates**: Use the date picker to view different weeks

## Data Flow

```
User Interaction → Component State → Service Layer → Supabase Database
                                                   ↓
Real-time Updates ← Component Re-render ← Data Fetch ← Database Response
```

## Performance Optimizations

- **Indexed Queries**: Database indexes on frequently queried columns
- **Efficient Loading**: Load only necessary data for current view
- **State Management**: Optimized React state updates
- **Caching**: Intelligent data caching for better performance

## Security Considerations

- **Row Level Security**: Database-level access control
- **Role-based Permissions**: UI elements shown based on user role
- **Data Validation**: Input validation on both client and server
- **Secure Policies**: Comprehensive Supabase RLS policies

## Future Enhancements

### Planned Features
- **Export Functionality**: PDF/Excel export of reports
- **Advanced Analytics**: Trend analysis and predictive insights
- **Notifications**: Automated reminders and alerts
- **Mobile App**: Dedicated mobile application
- **Integration**: Connect with external time tracking tools

### Potential Improvements
- **Bulk Operations**: Mass task assignment and completion
- **Custom Reports**: User-defined report templates
- **Dashboard Widgets**: Customizable analytics widgets
- **API Endpoints**: RESTful API for external integrations

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check Supabase configuration
   - Verify environment variables
   - Ensure database is accessible

2. **Permission Denied Errors**
   - Verify RLS policies are correctly applied
   - Check user authentication status
   - Confirm role assignments

3. **Data Not Loading**
   - Check browser console for errors
   - Verify network connectivity
   - Ensure database tables exist

### Debug Mode

Enable debug logging by setting:
```javascript
localStorage.setItem('debug', 'reports-analytics');
```

## Support

For technical support or feature requests:
1. Check the browser console for error messages
2. Verify database connectivity
3. Review the component props and state
4. Check the service layer for API errors

## Contributing

When contributing to this module:
1. Follow the existing code structure
2. Add proper TypeScript types
3. Include error handling
4. Update documentation
5. Test with both admin and employee roles 