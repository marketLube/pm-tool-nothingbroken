# 🚀 Automated Deployment Guide

This guide will help you set up automated deployment for your PM Tool that triggers every time you push code to the main branch.

## 📋 Prerequisites

1. **GitHub Repository** (✅ You have this)
2. **Vercel Account** (Free tier available)
3. **Supabase Project** (✅ You have this)

## 🔧 Setup Steps

### 1. Create Vercel Account & Project

1. Go to [vercel.com](https://vercel.com) and sign up with your GitHub account
2. Click "New Project" and import your GitHub repository
3. Configure project settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm ci`

### 2. Get Vercel Tokens & IDs

After creating your project, you'll need these values:

#### Get Vercel Token:
1. Go to [Vercel Settings > Tokens](https://vercel.com/account/tokens)
2. Create a new token with scope: Full Account
3. Copy the token (you'll need this for GitHub Secrets)

#### Get Vercel Project ID:
1. Go to your project in Vercel
2. Go to Settings > General
3. Copy the "Project ID"

#### Get Vercel Organization ID:
1. Go to [Vercel Settings > General](https://vercel.com/account)
2. Copy your "Team ID" (this is your Org ID)

### 3. Configure GitHub Environment & Secrets

#### Step 3A: Create Production Environment
1. Go to your GitHub repository
2. Navigate to **Settings** > **Environments**
3. Click **New Environment**
4. Name it: `production`
5. Configure protection rules:
   - ✅ **Required reviewers**: Add yourself (optional but recommended)
   - ✅ **Wait timer**: 0 minutes (for instant deployment)
   - ✅ **Deployment branches and tags**: Selected branches only → `main`

#### Step 3B: Add Environment Secrets
In your `production` environment, add these secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `VITE_SUPABASE_URL` | `https://ysfknpujqivkudhnhezx.supabase.co` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Your Supabase anon key |
| `VERCEL_TOKEN` | `[Your Vercel Token]` | Token from Step 2 |
| `VERCEL_ORG_ID` | `[Your Vercel Org ID]` | Organization ID from Step 2 |
| `VERCEL_PROJECT_ID` | `[Your Vercel Project ID]` | Project ID from Step 2 |

### 4. Configure Vercel Environment Variables

1. In Vercel, go to your project → **Settings** → **Environment Variables**
2. Add these variables for **Production** environment:

| Name | Value | Environment |
|------|-------|-------------|
| `VITE_SUPABASE_URL` | `https://ysfknpujqivkudhnhezx.supabase.co` | Production |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Production |

## 🎯 How It Works

### Deployment Trigger
Every time you push to `main` branch:

1. **🧪 Test Phase**: Runs linting and type checking
2. **🏗️ Build Phase**: Creates production build with your environment variables
3. **🚀 Deploy Phase**: Deploys to Vercel automatically
4. **📢 Notify Phase**: Reports success/failure

### Branch Protection
- Only pushes to `main` trigger production deployments
- Pull requests run tests but don't deploy
- All tests must pass before deployment

## 📊 Monitoring Deployments

### GitHub Actions
- Go to **Actions** tab in your repository
- View real-time deployment progress
- Check logs for any issues

### Vercel Dashboard
- View live deployments at [vercel.com/dashboard](https://vercel.com/dashboard)
- Monitor performance and usage
- Access deployment logs

## 🔄 Testing the Setup

1. **Make a small change** to your code
2. **Commit and push** to main branch:
   ```bash
   git add .
   git commit -m "test: trigger automated deployment"
   git push origin main
   ```
3. **Watch the magic happen**:
   - GitHub Actions will start automatically
   - Check the Actions tab for progress
   - Your site will be live on Vercel in ~2-3 minutes

## 🎉 Success!

Once set up, you'll have:

- ✅ **Automated testing** on every push
- ✅ **Automatic deployment** to production
- ✅ **Environment-specific configuration**
- ✅ **Deployment status notifications**
- ✅ **Professional CI/CD pipeline**

## 🆘 Troubleshooting

### Common Issues:

1. **Build Failures**
   - Check that all environment variables are set correctly
   - Ensure no TypeScript errors in your code

2. **Deployment Failures**
   - Verify Vercel tokens are correct and have proper permissions
   - Check that project/org IDs match your Vercel account

3. **Runtime Errors**
   - Ensure Supabase URLs and keys are correctly set in production
   - Check browser console for any missing environment variables

### Getting Help:
- Check GitHub Actions logs for detailed error messages
- Review Vercel deployment logs in your dashboard
- Ensure all secrets are properly configured in GitHub

---

🎊 **Your PM Tool will now automatically deploy every time you push code!** 🎊 

npx vercel login
# Choose "Continue with GitHub" 