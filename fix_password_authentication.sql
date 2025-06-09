-- Fix Password Authentication Issues
-- This script standardizes password storage and fixes authentication

-- 1. Ensure both password columns exist
DO $$
BEGIN
    -- Add password column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password'
    ) THEN
        ALTER TABLE users ADD COLUMN password TEXT;
    END IF;
    
    -- Add password_hash column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password_hash'
    ) THEN
        ALTER TABLE users ADD COLUMN password_hash TEXT;
    END IF;
END $$;

-- 2. Create improved authentication function that handles both plain text and hashed passwords
CREATE OR REPLACE FUNCTION authenticate_user(
    user_email TEXT,
    user_password TEXT
)
RETURNS TABLE(
    user_id UUID,
    user_name TEXT,
    email TEXT,
    role TEXT,
    team TEXT,
    is_active BOOLEAN,
    auth_method TEXT
) AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- Get user record
    SELECT * INTO user_record
    FROM users 
    WHERE lower(email) = lower(user_email) 
        AND is_active = true;
    
    -- If user not found, return empty
    IF user_record IS NULL THEN
        RETURN;
    END IF;
    
    -- Method 1: Try exact password match (for auto-generated passwords)
    IF user_record.password = user_password THEN
        RETURN QUERY
        SELECT 
            user_record.id,
            user_record.name,
            user_record.email,
            user_record.role,
            user_record.team,
            user_record.is_active,
            'plaintext'::TEXT;
        RETURN;
    END IF;
    
    -- Method 2: Try bcrypt verification if password_hash exists
    IF user_record.password_hash IS NOT NULL THEN
        -- Note: This requires pgcrypto extension and crypt function
        -- For now, we'll add a placeholder that can be enhanced
        -- In production, you'd use: crypt(user_password, user_record.password_hash) = user_record.password_hash
        
        RETURN QUERY
        SELECT 
            user_record.id,
            user_record.name,
            user_record.email,
            user_record.role,
            user_record.team,
            user_record.is_active,
            'bcrypt'::TEXT
        WHERE user_record.password_hash = crypt(user_password, user_record.password_hash);
        
        IF FOUND THEN
            RETURN;
        END IF;
    END IF;
    
    -- Method 3: Check if password column contains a bcrypt hash
    IF user_record.password LIKE '$2%' THEN
        RETURN QUERY
        SELECT 
            user_record.id,
            user_record.name,
            user_record.email,
            user_record.role,
            user_record.team,
            user_record.is_active,
            'bcrypt_in_password'::TEXT
        WHERE user_record.password = crypt(user_password, user_record.password);
        
        IF FOUND THEN
            RETURN;
        END IF;
    END IF;
    
    -- If no authentication method worked, return empty
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Enable pgcrypto extension for bcrypt support
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 4. Create function to migrate plaintext passwords to hashed format
CREATE OR REPLACE FUNCTION migrate_plaintext_passwords()
RETURNS TABLE(
    migrated_count INTEGER,
    message TEXT
) AS $$
DECLARE
    user_rec RECORD;
    migration_count INTEGER := 0;
BEGIN
    -- Find users with plaintext passwords (not starting with $2)
    FOR user_rec IN 
        SELECT id, email, password
        FROM users 
        WHERE password IS NOT NULL 
            AND password NOT LIKE '$2%'
            AND LENGTH(password) BETWEEN 6 AND 50
            AND is_active = true
    LOOP
        -- Hash the plaintext password and store in password_hash column
        UPDATE users 
        SET password_hash = crypt(user_rec.password, gen_salt('bf', 12))
        WHERE id = user_rec.id;
        
        migration_count := migration_count + 1;
        
        RAISE NOTICE 'Migrated password for user: %', user_rec.email;
    END LOOP;
    
    RETURN QUERY SELECT 
        migration_count,
        CASE 
            WHEN migration_count > 0 THEN 
                format('Successfully migrated %s passwords to hashed format', migration_count)
            ELSE 
                'No plaintext passwords found to migrate'
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to standardize password storage
CREATE OR REPLACE FUNCTION standardize_password_storage()
RETURNS TABLE(
    action TEXT,
    count INTEGER,
    details TEXT
) AS $$
DECLARE
    plaintext_count INTEGER;
    hash_only_count INTEGER;
    both_columns_count INTEGER;
BEGIN
    -- Count current storage patterns
    SELECT COUNT(*) INTO plaintext_count
    FROM users 
    WHERE password IS NOT NULL 
        AND password NOT LIKE '$2%'
        AND (password_hash IS NULL OR password_hash = '')
        AND is_active = true;
    
    SELECT COUNT(*) INTO hash_only_count
    FROM users 
    WHERE password_hash IS NOT NULL 
        AND (password IS NULL OR password = '')
        AND is_active = true;
    
    SELECT COUNT(*) INTO both_columns_count
    FROM users 
    WHERE password IS NOT NULL 
        AND password_hash IS NOT NULL
        AND is_active = true;
    
    -- Return analysis
    RETURN QUERY SELECT 'ANALYSIS'::TEXT, plaintext_count, 'Users with plaintext passwords only';
    RETURN QUERY SELECT 'ANALYSIS'::TEXT, hash_only_count, 'Users with hashed passwords only';
    RETURN QUERY SELECT 'ANALYSIS'::TEXT, both_columns_count, 'Users with both password formats';
    
    -- Migrate plaintext passwords to hashed format
    IF plaintext_count > 0 THEN
        PERFORM migrate_plaintext_passwords();
        RETURN QUERY SELECT 'MIGRATION'::TEXT, plaintext_count, 'Plaintext passwords migrated to hashed format';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create view for safe user authentication (without exposing passwords)
CREATE OR REPLACE VIEW user_auth_info AS
SELECT 
    id,
    name,
    email,
    role,
    team,
    is_active,
    join_date,
    avatar_url,
    allowed_statuses,
    created_at,
    updated_at,
    CASE 
        WHEN password_hash IS NOT NULL THEN 'hashed'
        WHEN password IS NOT NULL AND password LIKE '$2%' THEN 'bcrypt_in_password'
        WHEN password IS NOT NULL THEN 'plaintext'
        ELSE 'no_password'
    END as password_status
FROM users;

-- 7. Grant necessary permissions
GRANT EXECUTE ON FUNCTION authenticate_user(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION migrate_plaintext_passwords() TO authenticated;
GRANT EXECUTE ON FUNCTION standardize_password_storage() TO authenticated;
GRANT SELECT ON user_auth_info TO authenticated;

-- 8. Run the standardization
SELECT * FROM standardize_password_storage();

-- 9. Test authentication function (example)
-- SELECT * FROM authenticate_user('test@example.com', 'password123'); 