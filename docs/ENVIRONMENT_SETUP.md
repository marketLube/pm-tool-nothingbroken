# Environment Setup Guide

This guide explains how to properly set up environment variables for the PM Tool project.

## 🔑 Environment Files Overview

The project uses multiple environment files for different purposes:

| File | Purpose | Gitignored | Contains |
|------|---------|------------|----------|
| `.env` | Main development environment | ✅ Yes | Actual Supabase credentials |
| `.env.example` | Template for developers | ❌ No | Example/placeholder values |
| `.env.local` | Local overrides | ✅ Yes | Local development overrides |
| `.env.production` | Production environment | ✅ Yes | Production credentials |

## 🚨 Why .env is Gitignored

The `.env` file contains sensitive API keys and credentials that should **NEVER** be committed to version control:

```bash
# ❌ SENSITIVE - These are real API keys
VITE_SUPABASE_URL=https://ysfknpujqivkudhnhezx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

This is why the `.env` file is listed in `.gitignore` and won't appear in normal file operations.

## 🛠️ Setting Up Environment

### Option 1: Automated Setup (Recommended)

```bash
# Run the setup script
npm run setup

# Or directly
./scripts/setup-env.sh
```

### Option 2: Manual Setup

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit the .env file:**
   ```bash
   # Open in your preferred editor
   nano .env
   # or
   code .env
   ```

3. **Replace placeholder values with actual credentials**

## 🔍 Checking Environment Status

Use these commands to verify your environment setup:

```bash
# Check if environment variables are configured
npm run check-env

# Show environment file status
npm run setup

# Verify all files exist
ls -la | grep "\.env"
```

## 🐛 Troubleshooting

### Issue: "Could not find file .env"

**Cause:** The .env file is gitignored and hidden from file operations.

**Solution:**
```bash
# Check if file actually exists
ls -la | grep "\.env"

# If it exists, use terminal commands to view it
cat .env

# If it doesn't exist, create it
npm run setup
```

### Issue: 406 or 400 API Errors

**Cause:** Environment variables not loaded or incorrect.

**Solution:**
1. Verify environment variables are set:
   ```bash
   npm run check-env
   ```

2. Restart development server:
   ```bash
   npm run dev
   ```

3. Clear Vite cache if needed:
   ```bash
   npm run dev:clean
   ```

### Issue: User ID Mismatch (400 Bad Request)

**Cause:** Authentication system using mock user IDs instead of real Supabase UUIDs.

**Solution:** This has been fixed in the AuthContext. The system now:
- ✅ Loads users from Supabase database
- ✅ Uses real UUIDs (e.g., `53419fb2-9e21-40f1-8bcc-9e4575548523`)
- ✅ Maps authentication properly

## 🔒 Security Best Practices

1. **Never commit .env files** - They're gitignored for a reason
2. **Use .env.example** - For sharing configuration structure
3. **Rotate keys regularly** - Update Supabase credentials periodically
4. **Use different keys** - Separate credentials for development/production

## 📝 Required Environment Variables

### Supabase Configuration

```bash
# Your Supabase project URL
VITE_SUPABASE_URL=https://your-project-id.supabase.co

# Public anon key (safe to expose to client)
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service role key (for server-side operations)
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Where to Find These Values

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the values:
   - Project URL → `VITE_SUPABASE_URL`
   - anon public → `VITE_SUPABASE_ANON_KEY`
   - service_role → `VITE_SUPABASE_SERVICE_ROLE_KEY`

## 🚀 Quick Reference Commands

```bash
# Environment setup
npm run setup                    # Interactive setup script
npm run check-env               # Check environment status

# Development
npm run dev                     # Start development server
npm run dev:clean              # Clear cache and start
npm run type-check             # Check TypeScript errors

# Debugging
ls -la | grep "\.env"          # List environment files
cat .env                       # View .env content (terminal only)
./scripts/setup-env.sh         # Run setup script directly
```

## 📁 File Visibility in Different Contexts

| Context | Can See .env | Method |
|---------|--------------|--------|
| File explorer | ❌ No | Gitignored |
| IDE/Editor | ❌ No | Gitignored |
| Terminal `ls` | ✅ Yes | `ls -la \| grep "\.env"` |
| Terminal `cat` | ✅ Yes | `cat .env` |
| Setup script | ✅ Yes | Uses terminal commands |

This is why I sometimes "miss" the .env file - it's properly gitignored for security! 