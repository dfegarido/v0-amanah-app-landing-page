-- Fix mosque code generation to prevent duplicates
-- Replace the function with a more robust version that handles race conditions

-- Drop the old function
DROP FUNCTION IF EXISTS get_next_mosque_code();

-- Create a sequence for mosque codes
CREATE SEQUENCE IF NOT EXISTS mosque_code_seq;

-- Set the sequence to start after the highest existing mosque_code
DO $$
DECLARE
  max_code INTEGER;
BEGIN
  SELECT COALESCE(MAX(mosque_code), 0) INTO max_code FROM public.mosques;
  PERFORM setval('mosque_code_seq', max_code);
END $$;

-- Create improved function that uses the sequence
CREATE OR REPLACE FUNCTION get_next_mosque_code()
RETURNS INTEGER AS $$
BEGIN
  RETURN nextval('mosque_code_seq');
END;
$$ LANGUAGE plpgsql;

-- Add comment explaining the function
COMMENT ON FUNCTION get_next_mosque_code() IS 'Returns the next available mosque code using a sequence to prevent duplicates';

