-- File uploads table for storing user-uploaded files
CREATE TABLE IF NOT EXISTS file_uploads (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  related_to VARCHAR(50) NOT NULL CHECK (related_to IN ('PROPERTY', 'SERVICE_REQUEST')),
  related_id INTEGER NOT NULL,
  file_url VARCHAR(255) NOT NULL,
  metadata JSONB, -- Stores file type, size, original filename, and access permissions
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_file_uploads_user ON file_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_related ON file_uploads(related_to, related_id);

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_file_uploads_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the timestamp
DO $$
BEGIN
  -- Drop the trigger if it exists
  DROP TRIGGER IF EXISTS update_file_uploads_timestamp_trigger ON file_uploads;
  
  -- Create the trigger
  CREATE TRIGGER update_file_uploads_timestamp_trigger
  BEFORE UPDATE ON file_uploads
  FOR EACH ROW
  EXECUTE FUNCTION update_file_uploads_timestamp();
END;
$$;