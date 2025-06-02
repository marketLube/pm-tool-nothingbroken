#!/bin/bash

# 🚀 Automated Deployment Setup Script
# This script automates as much of the deployment setup as possible

echo "🚀 Starting Automated Deployment Setup..."
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Read environment variables
source .env

echo -e "${BLUE}📋 Found Environment Variables:${NC}"
echo "✅ VITE_SUPABASE_URL: $VITE_SUPABASE_URL"
echo "✅ VITE_SUPABASE_ANON_KEY: ${VITE_SUPABASE_ANON_KEY:0:20}..."
echo "✅ VITE_SUPABASE_SERVICE_ROLE_KEY: ${VITE_SUPABASE_SERVICE_ROLE_KEY:0:20}..."
echo ""

# Create optimized vercel.json with your actual values
echo -e "${YELLOW}🔧 Creating optimized Vercel configuration...${NC}"
cat > vercel.json << EOF
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "installCommand": "npm ci",
  "devCommand": "npm run dev",
  "rewrites": [
    {
      "source": "/((?!api/).*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  "env": {
    "VITE_SUPABASE_URL": "$VITE_SUPABASE_URL",
    "VITE_SUPABASE_ANON_KEY": "$VITE_SUPABASE_ANON_KEY"
  }
}
EOF
echo "✅ Vercel configuration updated with your environment variables"

# Check if user has Vercel CLI installed
echo -e "\n${YELLOW}🔍 Checking Vercel CLI...${NC}"
if command -v vercel &> /dev/null; then
    echo "✅ Vercel CLI found"
    
    echo -e "\n${BLUE}🚀 Attempting to auto-deploy to Vercel...${NC}"
    echo "This will:"
    echo "1. Create a new Vercel project"
    echo "2. Deploy your PM Tool automatically"
    echo "3. Set up environment variables"
    
    read -p "Proceed with Vercel deployment? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🚀 Deploying to Vercel..."
        vercel --prod --yes
        
        # Get project info
        VERCEL_PROJECT_ID=$(vercel ls --scope=personal --json | jq -r '.[0].uid' 2>/dev/null || echo "")
        VERCEL_ORG_ID=$(vercel whoami --json | jq -r '.user.id' 2>/dev/null || echo "")
        
        if [ ! -z "$VERCEL_PROJECT_ID" ] && [ ! -z "$VERCEL_ORG_ID" ]; then
            echo "✅ Deployment successful!"
            echo "📝 Project ID: $VERCEL_PROJECT_ID"
            echo "📝 Organization ID: $VERCEL_ORG_ID"
        fi
    fi
else
    echo -e "${RED}❌ Vercel CLI not found${NC}"
    echo "Installing Vercel CLI..."
    npm install -g vercel
    echo "✅ Vercel CLI installed. Please run this script again."
fi

# GitHub Secrets Setup Instructions
echo -e "\n${BLUE}🔐 GitHub Secrets Configuration${NC}"
echo "================================================"
echo "Now you need to add these secrets to your GitHub repository:"
echo ""
echo -e "${GREEN}1. Go to: https://github.com/marketLube/project-6/settings/environments${NC}"
echo -e "${GREEN}2. Create environment: 'production'${NC}"
echo -e "${GREEN}3. Add these secrets:${NC}"
echo ""
echo "Secret Name: VITE_SUPABASE_URL"
echo "Secret Value: $VITE_SUPABASE_URL"
echo ""
echo "Secret Name: VITE_SUPABASE_ANON_KEY"  
echo "Secret Value: $VITE_SUPABASE_ANON_KEY"
echo ""

# If we have Vercel info, show those secrets too
if [ ! -z "$VERCEL_PROJECT_ID" ]; then
    echo "Secret Name: VERCEL_PROJECT_ID"
    echo "Secret Value: $VERCEL_PROJECT_ID"
    echo ""
    echo "Secret Name: VERCEL_ORG_ID"
    echo "Secret Value: $VERCEL_ORG_ID"
    echo ""
fi

echo "Secret Name: VERCEL_TOKEN"
echo "Secret Value: [Get from https://vercel.com/account/tokens]"
echo ""

# Generate GitHub CLI commands for faster setup
echo -e "\n${YELLOW}⚡ Quick Setup Commands (if you have GitHub CLI):${NC}"
echo "gh secret set VITE_SUPABASE_URL --body=\"$VITE_SUPABASE_URL\" --env production"
echo "gh secret set VITE_SUPABASE_ANON_KEY --body=\"$VITE_SUPABASE_ANON_KEY\" --env production"

if [ ! -z "$VERCEL_PROJECT_ID" ]; then
    echo "gh secret set VERCEL_PROJECT_ID --body=\"$VERCEL_PROJECT_ID\" --env production"
    echo "gh secret set VERCEL_ORG_ID --body=\"$VERCEL_ORG_ID\" --env production"
fi

echo ""
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo "Next steps:"
echo "1. Add the GitHub secrets above"
echo "2. Get your Vercel token from https://vercel.com/account/tokens"
echo "3. Push to main branch to trigger automatic deployment"
echo ""
echo "Your PM Tool will automatically deploy on every push! 🚀" 