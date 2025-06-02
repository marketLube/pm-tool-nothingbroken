#!/bin/bash

echo "🚀 Deploying Supabase Edge Function..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    echo "📥 Download Docker Desktop: https://docs.docker.com/desktop/install/mac-install/"
    exit 1
fi

# Check if Supabase CLI is available
if [ ! -f "./supabase-cli" ]; then
    echo "❌ Supabase CLI not found. Please run the installation script first."
    exit 1
fi

# Deploy the function
echo "📦 Deploying scheduled-rollover function..."
./supabase-cli functions deploy scheduled-rollover --project-ref ysfknpujqivkudhnhezx

if [ $? -eq 0 ]; then
    echo "✅ Edge function deployed successfully!"
    echo ""
    echo "🧪 Testing the function..."
    curl -X POST \
      "https://ysfknpujqivkudhnhezx.supabase.co/functions/v1/scheduled-rollover" \
      -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzZmtucHVqcWl2a3VkaG5oZXp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1OTYxMTMsImV4cCI6MjA2MzE3MjExM30.zSHRvncRmwEMNTPgfIgieN6A4tZ2VeCfu6uZV0xaiSQ" \
      -H "Content-Type: application/json"
    echo ""
    echo ""
    echo "🎉 Deployment complete! Your edge function is now available."
    echo "📅 GitHub Actions will trigger it daily at 12:00 AM IST"
else
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi 