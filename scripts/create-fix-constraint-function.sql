-- Create a PostgreSQL function to fix the team constraint
-- This function can be called via supabase.rpc()

CREATE OR REPLACE FUNCTION fix_team_constraint()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    -- Drop the existing constraint
    BEGIN
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_team_check;
        
        -- Add the new constraint that includes 'all'
        ALTER TABLE users ADD CONSTRAINT users_team_check 
        CHECK (team IN ('creative', 'web', 'all'));
        
        -- Return success status
        result := json_build_object(
            'success', true,
            'message', 'Successfully updated team constraint to allow creative, web, all',
            'timestamp', now()
        );
        
    EXCEPTION WHEN OTHERS THEN
        -- Return error status
        result := json_build_object(
            'success', false,
            'error', SQLERRM,
            'timestamp', now()
        );
    END;
    
    RETURN result;
END;
$$;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION fix_team_constraint() TO authenticated, service_role; 