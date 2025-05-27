-- Create a function to add the password field if it doesn't exist
CREATE OR REPLACE FUNCTION public.add_password_field()
RETURNS void AS $$
BEGIN
    -- Check if the password column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'password'
    ) THEN
        -- If it doesn't exist, add it
        EXECUTE 'ALTER TABLE public.users ADD COLUMN password TEXT';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 