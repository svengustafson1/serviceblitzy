-- Notifications table for storing user notifications
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'info', 'success', 'warning', 'error', etc.
  related_to VARCHAR(50), -- 'service_request', 'payment', 'bid', etc.
  related_id INTEGER, -- ID of the related entity
  is_read BOOLEAN DEFAULT FALSE,
  actions JSONB, -- Optional actions the user can take (e.g., buttons to click)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP -- Optional expiration time
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_related ON notifications(related_to, related_id);

-- Function to automatically mark old notifications as read
CREATE OR REPLACE FUNCTION auto_mark_old_notifications_as_read()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark notifications older than 30 days as read
  UPDATE notifications
  SET is_read = TRUE
  WHERE is_read = FALSE 
    AND created_at < NOW() - INTERVAL '30 days';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to run this function daily
DO $$
BEGIN
  -- Drop the trigger if it exists
  DROP TRIGGER IF EXISTS mark_old_notifications_trigger ON notifications;
  
  -- Create the trigger
  CREATE TRIGGER mark_old_notifications_trigger
  AFTER INSERT ON notifications
  EXECUTE FUNCTION auto_mark_old_notifications_as_read();
END;
$$; 