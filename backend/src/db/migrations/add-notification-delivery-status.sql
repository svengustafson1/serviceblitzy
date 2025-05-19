-- Add delivery_status column to notifications table for tracking notification delivery status

DO $$
BEGIN
  -- Check if delivery_status column exists
  IF NOT EXISTS (SELECT 1 
                 FROM information_schema.columns 
                 WHERE table_name = 'notifications' 
                 AND column_name = 'delivery_status') THEN
    -- Add delivery_status column
    ALTER TABLE notifications 
    ADD COLUMN delivery_status VARCHAR(50) DEFAULT 'pending' NOT NULL;
    
    -- Create index for faster lookups by delivery status
    CREATE INDEX idx_notifications_delivery_status ON notifications(delivery_status);
    
    RAISE NOTICE 'Added delivery_status column to notifications table';
  ELSE
    RAISE NOTICE 'delivery_status column already exists in notifications table';
  END IF;
  
  -- Check if delivery_channel column exists
  IF NOT EXISTS (SELECT 1 
                 FROM information_schema.columns 
                 WHERE table_name = 'notifications' 
                 AND column_name = 'delivery_channel') THEN
    -- Add delivery_channel column
    ALTER TABLE notifications 
    ADD COLUMN delivery_channel VARCHAR(50) DEFAULT 'all' NOT NULL;
    
    RAISE NOTICE 'Added delivery_channel column to notifications table';
  ELSE
    RAISE NOTICE 'delivery_channel column already exists in notifications table';
  END IF;
  
  -- Check if last_delivery_attempt column exists
  IF NOT EXISTS (SELECT 1 
                 FROM information_schema.columns 
                 WHERE table_name = 'notifications' 
                 AND column_name = 'last_delivery_attempt') THEN
    -- Add last_delivery_attempt column
    ALTER TABLE notifications 
    ADD COLUMN last_delivery_attempt TIMESTAMP;
    
    RAISE NOTICE 'Added last_delivery_attempt column to notifications table';
  ELSE
    RAISE NOTICE 'last_delivery_attempt column already exists in notifications table';
  END IF;
  
  -- Check if delivery_attempts column exists
  IF NOT EXISTS (SELECT 1 
                 FROM information_schema.columns 
                 WHERE table_name = 'notifications' 
                 AND column_name = 'delivery_attempts') THEN
    -- Add delivery_attempts column
    ALTER TABLE notifications 
    ADD COLUMN delivery_attempts INTEGER DEFAULT 0 NOT NULL;
    
    RAISE NOTICE 'Added delivery_attempts column to notifications table';
  ELSE
    RAISE NOTICE 'delivery_attempts column already exists in notifications table';
  END IF;
END;
$$;