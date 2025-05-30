-- TEMPORARY FIX: Remove all foreign key constraints from calendar_exports
-- This will allow exports to work immediately while we debug the proper solution

-- Drop all foreign key constraints on calendar_exports
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    FOR constraint_name IN 
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        WHERE tc.table_name = 'calendar_exports'
        AND tc.constraint_type = 'FOREIGN KEY'
    LOOP
        EXECUTE 'ALTER TABLE calendar_exports DROP CONSTRAINT ' || constraint_name;
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END LOOP;
END $$;

-- Verify no foreign key constraints remain
SELECT
    tc.constraint_name,
    kcu.column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'calendar_exports'
    AND tc.constraint_type = 'FOREIGN KEY';

-- If the above returns no rows, all constraints are removed 