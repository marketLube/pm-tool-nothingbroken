#!/bin/bash

echo "🧹 Cleaning up PM Tool project - removing unnecessary files..."

# Create a backup directory first
echo "📦 Creating backup directory..."
mkdir -p project_cleanup_backup
timestamp=$(date +"%Y%m%d_%H%M%S")
backup_dir="project_cleanup_backup/cleanup_$timestamp"
mkdir -p "$backup_dir"

# Files to remove (documentation, guides, test files, migration scripts)
files_to_remove=(
    # Documentation and guides
    "MANUAL_DEPLOYMENT_GUIDE.md"
    "DEPLOYMENT_STATUS.md"
    "DEPLOYMENT_GUIDE.md"
    "TEST_DATABASE_PERSISTENCE.md"
    "DEBUG_ROLLOVER_ISSUE.md"
    "ROLLOVER_SETUP_GUIDE.md"
    "FINAL_COMPREHENSIVE_TIMEZONE_AUDIT.md"
    "FINAL_TIMEZONE_AUDIT_COMPLETE.md"
    "COMPREHENSIVE_TIMEZONE_AUDIT_FINAL.md"
    "TIMEZONE_AUDIT_REPORT.md"
    "CRITICAL_FIXES_APPLIED.md"
    "test_rollover_improvement.md"
    "fix_api_keys.md"
    "CALENDAR_EXPORT_SETUP.md"
    "SOCIAL_CALENDAR_FIX_INSTRUCTIONS.md"
    "SOCIAL_CALENDAR_CLIENT_REFRESH_FEATURES.md"
    "SOCIAL_CALENDAR_UPDATED_REQUIREMENTS.md"
    "SOCIAL_CALENDAR_IMPLEMENTATION_SUMMARY.md"
    "SOCIAL_CALENDAR_README.md"
    "STATE_MANAGEMENT_ANALYSIS.md"
    "PRODUCTION_READINESS_STATUS.md"
    "PRODUCTION_CHECKLIST.md"
    "UNASSIGNED_TASKS_IMPLEMENTATION.md"
    "TASK_DELETION_SYNC_IMPLEMENTATION.md"
    "STATUS_DATABASE_INTEGRATION.md"
    "ENHANCED_REPORTS_README.md"
    "SETUP_REPORTS_TABLES.md"
    "REPORTS_ANALYTICS_README.md"
    
    # Test and deployment scripts
    "test-deployment-final.sh"
    "test-deployment.sh"
    "deploy-edge-function.sh"
    "install-supabase-cli.sh"
    
    # Test files
    "test_routing.html"
    
    # JavaScript/Node.js test and migration files
    "clear_all_attendance_today.cjs"
    "clear_all_attendance_today.js"
    "check_avatar_storage.cjs"
    "check_avatar_storage.js"
    "run_rollover_migration.cjs"
    "run_rollover_migration.js"
    "test_new_auth.mjs"
    "test_new_auth.js"
    "change_user_password.js"
    "create_new_user.js"
    "check_table_structure.js"
    "create_missing_auth_users.js"
    "diagnose_auth_users.js"
    "sync_passwords.js"
    "test_supabase_auth.js"
    "migrate_to_supabase_auth.js"
    "simple_auth_fix.js"
    "migrate_users_to_auth.js"
    "update_keys.mjs"
    "auth_test.mjs"
    "quick_auth_fix.mjs"
    "quick_auth_fix.js"
    "test_export_setup.js"
    "test_database_connections_fixed.js"
    "test_database_connections.js"
    "run_statuses_migration.cjs"
    "test_reports_functionality.js"
    "run_enhanced_reports_migration.js"
    "add_mock_reports_data_fixed.js"
    "run_reports_migration.js"
    "add_web_users.js"
    "cleanup-invalid-clients.js"
    
    # SQL migration files (already applied)
    "EMERGENCY_DATABASE_FIX.sql"
    "rollover_logs_table.sql"
    "fix_auth_immediate.sql"
    "quick_sql_fix.sql"
    "FIX_RLS_POLICIES.sql"
    "fix_user_authentication.sql"
    "debug_export_issue.sql"
    "fix_calendar_exports_foreign_key.sql"
    "create_calendar_exports_table.sql"
    "temporary_fix_export.sql"
    "test_simple_insert.sql"
    "check_all_constraints.sql"
    "create_social_calendar_table.sql"
    "FIX_DATABASE_ISSUES.sql"
    "FIX_DATABASE_ISSUES_SAFE.sql"
    "COMPLETE_DATABASE_SETUP.sql"
    "create_statuses_table.sql"
    "URGENT_RLS_FIX.sql"
    "ADD_MISSING_COLUMNS.sql"
    "check_database_structure.sql"
    "COMPLETE_SETUP_FUNCTIONS.sql"
    "COMPLETE_SUPABASE_QUERIES.sql"
    "enhanced_reports_features.sql"
    "SIMPLE_REPORTS_SETUP.sql"
)

# Function to safely remove files
remove_file() {
    local file="$1"
    if [ -f "$file" ]; then
        echo "🗑️  Removing: $file"
        # Copy to backup first
        cp "$file" "$backup_dir/"
        # Remove the file
        rm "$file"
        echo "   ✅ Removed and backed up"
    else
        echo "   ⚠️  File not found: $file"
    fi
}

# Remove each file
for file in "${files_to_remove[@]}"; do
    remove_file "$file"
done

echo ""
echo "🎉 Cleanup completed!"
echo "📁 Backup created at: $backup_dir"
echo ""
echo "✅ KEPT (essential files):"
echo "   - package.json & package-lock.json"
echo "   - vite.config.ts"
echo "   - vercel.json & .vercelignore"
echo "   - src/ directory (all source code)"
echo "   - public/ directory"
echo "   - .github/ directory (GitHub Actions)"
echo "   - supabase/ directory (edge functions)"
echo "   - node_modules/"
echo "   - .git/"
echo ""
echo "🗑️  REMOVED:"
echo "   - All documentation/guide .md files"
echo "   - All test scripts (.sh, .js, .cjs, .mjs)"
echo "   - All SQL migration files"
echo "   - All debugging/development files"
echo ""
echo "✨ Your PM Tool should continue working perfectly!"
echo "   Run 'npm run dev' to verify everything is working." 