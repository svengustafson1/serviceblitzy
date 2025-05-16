-- Add access_hash column to properties table

-- Check if the column already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'properties'
    AND column_name = 'access_hash'
  ) THEN
    -- Add the column if it doesn't exist
    ALTER TABLE properties
    ADD COLUMN access_hash VARCHAR(255);
    
    RAISE NOTICE 'Added access_hash column to properties table';
  ELSE
    RAISE NOTICE 'access_hash column already exists in properties table';
  END IF;
END $$; 