-- Test simple insert to identify the exact issue

-- Test 1: Try inserting with minimal data (no created_by)
INSERT INTO calendar_exports (
    token,
    client_id,
    client_name,
    team,
    tasks,
    expires_at
) VALUES (
    'test_token_' || extract(epoch from now()),
    'b7e12345-1234-1234-1234-123456789abc', -- fake client_id for testing
    'Test Client',
    'creative',
    '[]'::jsonb,
    now() + interval '7 days'
);

-- If the above fails, it will show the exact constraint violation

-- Clean up the test record
DELETE FROM calendar_exports WHERE token LIKE 'test_token_%'; 