#!/usr/bin/env node

// Security check script to remind about .env before git operations
import fs from 'fs';
import path from 'path';

const gitignorePath = '.gitignore';
const envPath = '.env';

function checkEnvSecurity() {
  console.log('🔒 Security Check: Verifying .env protection...\n');
  
  // Check if .env file exists
  if (!fs.existsSync(envPath)) {
    console.log('✅ No .env file found.');
    return true;
  }
  
  // Check if .gitignore exists
  if (!fs.existsSync(gitignorePath)) {
    console.log('⚠️  No .gitignore found!');
    return false;
  }
  
  // Read .gitignore content
  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  
  // Check if .env is properly ignored
  const isEnvIgnored = gitignoreContent.includes('\n.env\n') || 
                      gitignoreContent.includes('\n.env ') ||
                      gitignoreContent.startsWith('.env\n') ||
                      gitignoreContent.startsWith('.env ');
  
  const isEnvCommented = gitignoreContent.includes('# .env');
  
  if (isEnvIgnored) {
    console.log('✅ .env is properly protected in .gitignore');
    return true;
  } else if (isEnvCommented) {
    console.log('🚨 WARNING: .env file is NOT protected!');
    console.log('🚨 Your database credentials will be exposed to git!');
    console.log('\n📋 To fix this, run:');
    console.log('   sed -i \'\' \'s/# \\.env/.env/g\' .gitignore');
    console.log('\n🛡️  Or manually edit .gitignore to uncomment the .env line');
    return false;
  } else {
    console.log('🚨 CRITICAL: .env file exists but is not in .gitignore!');
    console.log('🚨 Add ".env" to your .gitignore file immediately!');
    return false;
  }
}

function autoFix() {
  console.log('\n🔧 Auto-fixing .env protection...');
  
  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  const fixedContent = gitignoreContent.replace(
    /# \.env\s*# TEMPORARILY COMMENTED OUT.*$/gm, 
    '.env'
  );
  
  fs.writeFileSync(gitignorePath, fixedContent);
  console.log('✅ .env is now protected in .gitignore');
}

// Main execution
const args = process.argv.slice(2);

if (args.includes('--fix')) {
  autoFix();
} else {
  const isSecure = checkEnvSecurity();
  
  if (!isSecure) {
    console.log('\n🚀 Quick fix: npm run secure-env');
    process.exit(1);
  }
} 