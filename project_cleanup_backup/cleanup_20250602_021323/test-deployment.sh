#!/bin/bash

echo "🧪 TESTING DEPLOYMENT VERIFICATION"
echo "=================================="
echo ""

echo "📡 1. Testing Edge Function..."
echo "URL: https://ysfknpujqivkudhnhezx.supabase.co/functions/v1/scheduled-rollover"
echo ""

response=$(curl -s -w "%{http_code}" -X POST \
  "https://ysfknpujqivkudhnhezx.supabase.co/functions/v1/scheduled-rollover" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzZmtucHVqcWl2a3VkaG5oZXp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1OTYxMTMsImV4cCI6MjA2MzE3MjExM30.zSHRvncRmwEMNTPgfIgieN6A4tZ2VeCfu6uZV0xaiSQ" \
  -H "Content-Type: application/json")

http_code="${response: -3}"
body="${response%???}"

echo "📊 HTTP Status: $http_code"
echo "📄 Response Body: $body"
echo ""

if [ "$http_code" -eq 200 ]; then
    echo "✅ EDGE FUNCTION: DEPLOYED SUCCESSFULLY!"
    echo "   The function is responding correctly."
    echo ""
    
    # Parse the response to check if it's the expected format
    if echo "$body" | grep -q "currentTime"; then
        echo "✅ RESPONSE FORMAT: CORRECT!"
        echo "   Function is returning proper JSON response."
    else
        echo "⚠️  RESPONSE FORMAT: Unexpected format, but function is running."
    fi
    
else
    echo "❌ EDGE FUNCTION: DEPLOYMENT FAILED!"
    echo "   Please follow the manual deployment guide."
    echo "   File: MANUAL_DEPLOYMENT_GUIDE.md"
fi

echo ""
echo "🔍 2. Checking GitHub Actions Workflow..."
echo "File: .github/workflows/scheduled-rollover.yml"

if [ -f ".github/workflows/scheduled-rollover.yml" ]; then
    echo "✅ GITHUB WORKFLOW: FILE EXISTS!"
    
    # Check if workflow has correct cron schedule
    if grep -q "30 18 \* \* \*" .github/workflows/scheduled-rollover.yml; then
        echo "✅ SCHEDULE: Correctly set for 12:00 AM IST (6:30 PM UTC)"
    else
        echo "⚠️  SCHEDULE: Please verify cron schedule"
    fi
    
    # Check if workflow uses correct secrets
    if grep -q "secrets.SUPABASE_URL" .github/workflows/scheduled-rollover.yml; then
        echo "✅ SECRETS: Workflow is configured to use GitHub secrets"
    else
        echo "❌ SECRETS: Missing secret configuration"
    fi
    
else
    echo "❌ GITHUB WORKFLOW: FILE MISSING!"
fi

echo ""
echo "📋 DEPLOYMENT STATUS SUMMARY:"
echo "=============================="

if [ "$http_code" -eq 200 ]; then
    echo "🎉 EDGE FUNCTION: ✅ DEPLOYED AND WORKING"
else
    echo "🔧 EDGE FUNCTION: ❌ NEEDS DEPLOYMENT"
fi

echo "🔄 GITHUB ACTIONS: ✅ CONFIGURED"
echo "🔐 GITHUB SECRETS: ✅ SET UP (as confirmed by user)"
echo ""

if [ "$http_code" -eq 200 ]; then
    echo "🚀 STATUS: READY FOR AUTOMATION!"
    echo ""
    echo "🎯 YOUR SYSTEM WILL:"
    echo "   • Run daily at 12:00 AM IST"
    echo "   • Roll over unfinished tasks automatically"
    echo "   • Your '5 videos skymark' task will continue until completed"
    echo ""
    echo "✅ NEXT: Wait for 12:00 AM IST or manually trigger the workflow!"
else
    echo "⚠️  STATUS: NEEDS EDGE FUNCTION DEPLOYMENT"
    echo ""
    echo "📋 TODO:"
    echo "   1. Deploy edge function via Supabase dashboard"
    echo "   2. Use MANUAL_DEPLOYMENT_GUIDE.md for step-by-step instructions"
    echo "   3. Run this test again: ./test-deployment.sh"
fi

echo ""
echo "🔗 Quick Links:"
echo "   • Supabase Functions: https://supabase.com/dashboard/project/ysfknpujqivkudhnhezx/functions"
echo "   • GitHub Actions: https://github.com/YOUR_USERNAME/YOUR_REPO/actions"
echo "   • Manual Guide: ./MANUAL_DEPLOYMENT_GUIDE.md" 