-- Password Issue Diagnostic Script
-- This script helps identify how passwords are currently stored in the system

-- 1. Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
    AND column_name IN ('password', 'password_hash')
ORDER BY column_name;

-- 2. Sample password data analysis
SELECT 
    id,
    name,
    email,
    CASE 
        WHEN password IS NOT NULL THEN 'HAS_PASSWORD'
        ELSE 'NO_PASSWORD'
    END as password_status,
    CASE 
        WHEN password_hash IS NOT NULL THEN 'HAS_PASSWORD_HASH'
        ELSE 'NO_PASSWORD_HASH'
    END as password_hash_status,
    CASE 
        WHEN password LIKE '$2b$%' OR password LIKE '$2a$%' THEN 'BCRYPT_HASHED'
        WHEN password_hash LIKE '$2b$%' OR password_hash LIKE '$2a$%' THEN 'BCRYPT_HASHED_IN_HASH_COLUMN'
        WHEN LENGTH(password) > 50 THEN 'LIKELY_HASHED'
        WHEN LENGTH(password) BETWEEN 6 AND 20 THEN 'LIKELY_PLAINTEXT'
        ELSE 'UNKNOWN'
    END as password_type,
    LEFT(password, 10) || '...' as password_preview,
    created_at
FROM users 
WHERE is_active = true
ORDER BY created_at DESC;

-- 3. Count password storage patterns
SELECT 
    CASE 
        WHEN password IS NOT NULL AND password_hash IS NOT NULL THEN 'BOTH_COLUMNS'
        WHEN password IS NOT NULL AND password_hash IS NULL THEN 'PASSWORD_ONLY'
        WHEN password IS NULL AND password_hash IS NOT NULL THEN 'HASH_ONLY'
        ELSE 'NO_PASSWORD'
    END as storage_pattern,
    COUNT(*) as user_count
FROM users 
WHERE is_active = true
GROUP BY 
    CASE 
        WHEN password IS NOT NULL AND password_hash IS NOT NULL THEN 'BOTH_COLUMNS'
        WHEN password IS NOT NULL AND password_hash IS NULL THEN 'PASSWORD_ONLY'
        WHEN password IS NULL AND password_hash IS NOT NULL THEN 'HASH_ONLY'
        ELSE 'NO_PASSWORD'
    END
ORDER BY user_count DESC;

-- 4. Check if any users have bcrypt-style hashes
SELECT 
    'BCRYPT_IN_PASSWORD_COLUMN' as location,
    COUNT(*) as count
FROM users 
WHERE password LIKE '$2%'
    AND is_active = true

UNION ALL

SELECT 
    'BCRYPT_IN_PASSWORD_HASH_COLUMN' as location,
    COUNT(*) as count
FROM users 
WHERE password_hash LIKE '$2%'
    AND is_active = true;

-- 5. Recent user creations (to see pattern differences)
SELECT 
    name,
    email,
    LENGTH(password) as password_length,
    LEFT(password, 15) || '...' as password_start,
    CASE 
        WHEN password LIKE '$2%' THEN 'HASHED'
        ELSE 'PLAINTEXT'
    END as format,
    created_at
FROM users 
WHERE is_active = true
    AND created_at > NOW() - INTERVAL '30 days'
ORDER BY created_at DESC; 