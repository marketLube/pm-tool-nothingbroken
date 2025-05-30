-- Check all foreign key constraints on calendar_exports table

SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'calendar_exports'
    AND tc.constraint_type = 'FOREIGN KEY';

-- Check if there's a foreign key on client_id
SELECT EXISTS(
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'calendar_exports'
    AND kcu.column_name = 'client_id'
    AND tc.constraint_type = 'FOREIGN KEY'
) as client_id_has_fk;

-- Check current user ID format
SELECT 
    auth.uid() as current_user_id,
    length(auth.uid()::text) as id_length,
    auth.uid()::text ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' as is_valid_uuid
; 