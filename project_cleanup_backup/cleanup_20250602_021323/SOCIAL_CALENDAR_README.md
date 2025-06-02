# Social Calendar Module

## Overview
The Social Calendar is a dedicated module for planning and managing social media content across teams. It provides a visual monthly calendar interface with task management capabilities independent of the main TaskBoard.

## Features

### 🗓️ **Calendar Interface**
- **Monthly View**: Full month calendar with week-based layout
- **Today Indicator**: Current date is highlighted with blue ring
- **Navigation**: Previous/Next month navigation with "Today" button
- **Responsive Design**: Adapts to different screen sizes

### 🎯 **Task Management**
- **Add Tasks**: Click on any date or use the "Add Task" button
- **Edit Tasks**: Click edit icon on task cards
- **Delete Tasks**: Click delete icon with confirmation
- **Independent Tasks**: Tasks are separate from main TaskBoard system

### 🔍 **Advanced Filtering**
- **Team Filter**: Filter by Creative Team, Web Team, or All Teams
- **Client Filter**: Filter by specific clients from selected team
- **Real-time Updates**: Filters update task visibility instantly
- **Active Filter Tags**: Visual indicators for active filters

### 👥 **Team Integration**
- **Cross-Team Visibility**: Admin and all users can view both teams
- **Client Association**: Tasks linked to specific clients
- **User Assignment**: Tasks can be assigned to team members
- **Role-Based Access**: Proper permissions for different user roles

### 📊 **Task Features**
- **Priority Levels**: High, Medium, Low with color indicators
- **Time Scheduling**: Optional start and end times
- **Team Colors**: Visual distinction (Purple for Creative, Blue for Web)
- **Task Preview**: Live preview during task creation
- **Detailed Information**: Title, description, client, assignee, priority

### 📈 **Statistics Dashboard**
- **Total Tasks**: Overall task count with current filters
- **Team Breakdown**: Separate counters for Creative and Web teams
- **Priority Tracking**: High priority task counter
- **Real-time Updates**: Statistics update based on active filters

## User Interface

### 🎨 **Design Elements**
- **Modern Gradient Headers**: Blue to purple gradient
- **Hover Effects**: Smooth transitions and micro-interactions
- **Color Coding**: Team-based colors and priority indicators
- **Statistics Cards**: Gradient-colored cards with icons
- **Responsive Layout**: Mobile-friendly design

### 🔧 **Usability Features**
- **Collapsible Filters**: Toggle filter panel visibility
- **Clear Filter Options**: Easy filter reset functionality
- **Task Actions on Hover**: Edit/Delete buttons appear on hover
- **Form Validation**: Client-side validation with error messages
- **Auto-team Filtering**: Client dropdown updates based on selected team

## Permissions

### 👤 **Access Control**
- **Visible To**: Admin and all users in both Creative and Web teams
- **Task Creation**: All authorized users can create tasks
- **Task Management**: Users can edit/delete tasks they have access to
- **Client Access**: Users see clients from their team (Admins see all)

## Technical Implementation

### 🏗️ **Architecture**
- **React Component**: Modern functional component with hooks
- **State Management**: Local state with useState and useMemo
- **Type Safety**: Full TypeScript implementation
- **Date Handling**: date-fns library for date operations
- **Modal System**: Reusable modal components

### 🔄 **Data Flow**
1. **Task Storage**: In-memory state (can be extended to database)
2. **Filter Logic**: Client-side filtering with memoization
3. **Team Integration**: Uses existing client and user data
4. **Real-time Updates**: Immediate UI updates after actions

### 📱 **Responsive Design**
- **Mobile First**: Optimized for mobile devices
- **Grid Layouts**: CSS Grid for calendar structure
- **Flexible Cards**: Adapting task cards for different screen sizes
- **Touch Friendly**: Large touch targets for mobile interaction

## Integration Points

### 🔗 **System Integration**
- **Client Data**: Uses existing client management system
- **User Data**: Integrates with user management
- **Team Structure**: Respects existing team hierarchy
- **Navigation**: Integrated into main navigation sidebar

### 🚀 **Future Enhancements**
- **Database Persistence**: Store tasks in Supabase
- **Recurring Tasks**: Support for recurring social media posts
- **Content Templates**: Pre-defined content templates
- **Analytics Integration**: Track task completion rates
- **Export Features**: Export calendar data
- **Notifications**: Task reminders and notifications

## Usage Instructions

### 📋 **Getting Started**
1. Navigate to "Social Calendar" in the sidebar
2. Use filters to focus on specific teams or clients
3. Click on any date to add a new task
4. Fill in task details and save
5. View, edit, or delete tasks as needed

### 💡 **Best Practices**
- Use descriptive task titles
- Assign tasks to specific team members
- Set appropriate priority levels
- Include detailed descriptions for complex tasks
- Use time slots for scheduled posts
- Review and update tasks regularly

## Support
For issues or feature requests related to the Social Calendar module, please contact the development team or create a ticket in the project management system. 