#!/bin/bash

echo "🚀 Installing Supabase CLI..."

# Check if Homebrew is installed
if command -v brew &> /dev/null; then
    echo "📦 Using Homebrew to install Supabase CLI..."
    brew install supabase/tap/supabase
elif command -v npm &> /dev/null; then
    echo "📦 Using npm to install Supabase CLI..."
    sudo npm install -g supabase
else
    echo "📦 Downloading Supabase CLI binary..."
    # Download for macOS
    curl -L "https://github.com/supabase/cli/releases/latest/download/supabase_darwin_amd64.tar.gz" -o supabase.tar.gz
    tar -xzf supabase.tar.gz
    sudo mv supabase /usr/local/bin/
    rm supabase.tar.gz
fi

echo "✅ Checking installation..."
if command -v supabase &> /dev/null; then
    echo "🎉 Supabase CLI installed successfully!"
    supabase --version
else
    echo "❌ Installation failed. Please install manually."
fi 