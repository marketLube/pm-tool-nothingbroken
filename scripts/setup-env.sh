#!/bin/bash

# PM Tool Environment Setup Script
# This script helps set up the environment files for development

echo "🚀 PM Tool Environment Setup"
echo "=============================="

# Check if .env already exists
if [ -f ".env" ]; then
    echo "✅ .env file already exists"
    echo "📝 Current environment variables:"
    echo ""
    grep -v "^#" .env | grep -v "^$" | sed 's/=.*/=***HIDDEN***/'
    echo ""
else
    echo "⚠️  .env file not found"
    
    if [ -f ".env.example" ]; then
        echo "📋 Copying .env.example to .env..."
        cp .env.example .env
        echo "✅ .env file created from template"
        echo ""
        echo "🔧 Please edit .env file with your actual Supabase credentials:"
        echo "   - VITE_SUPABASE_URL"
        echo "   - VITE_SUPABASE_ANON_KEY"
        echo "   - VITE_SUPABASE_SERVICE_ROLE_KEY"
    else
        echo "❌ .env.example not found. Creating basic template..."
        cat > .env << EOF
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
EOF
        echo "✅ Basic .env template created"
        echo "🔧 Please edit .env file with your actual Supabase credentials"
    fi
fi

echo ""
echo "📁 Environment file status:"
echo "   .env        $([ -f ".env" ] && echo "✅ EXISTS" || echo "❌ MISSING")"
echo "   .env.example $([ -f ".env.example" ] && echo "✅ EXISTS" || echo "❌ MISSING")"
echo "   .env.local   $([ -f ".env.local" ] && echo "✅ EXISTS" || echo "❌ MISSING")"

echo ""
echo "🔍 Checking environment variables..."
if [ -f ".env" ]; then
    if grep -q "VITE_SUPABASE_URL=your_supabase_url_here" .env; then
        echo "⚠️  Please update VITE_SUPABASE_URL in .env file"
    else
        echo "✅ VITE_SUPABASE_URL configured"
    fi
    
    if grep -q "VITE_SUPABASE_ANON_KEY=your_anon_key_here" .env; then
        echo "⚠️  Please update VITE_SUPABASE_ANON_KEY in .env file"
    else
        echo "✅ VITE_SUPABASE_ANON_KEY configured"
    fi
    
    if grep -q "VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here" .env; then
        echo "⚠️  Please update VITE_SUPABASE_SERVICE_ROLE_KEY in .env file"
    else
        echo "✅ VITE_SUPABASE_SERVICE_ROLE_KEY configured"
    fi
fi

echo ""
echo "🚀 Next steps:"
echo "   1. Edit .env file with your actual Supabase credentials"
echo "   2. Run 'npm install' to install dependencies"
echo "   3. Run 'npm run dev' to start development server"
echo "   4. Access application at http://localhost:5173"
echo ""
echo "📚 For more information, see README.md" 