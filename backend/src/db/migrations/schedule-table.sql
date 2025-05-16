-- Create schedule_items table for storing schedule entries
CREATE TABLE IF NOT EXISTS schedule_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  end_date DATE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('service', 'invoice', 'reminder')),
  property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL,
  service_request_id INTEGER REFERENCES service_requests(id) ON DELETE SET NULL,
  invoice_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,
  completed BOOLEAN DEFAULT FALSE,
  recurrence VARCHAR(50) CHECK (recurrence IN ('none', 'daily', 'weekly', 'bi_weekly', 'monthly', 'yearly')),
  time_slot VARCHAR(100),
  amount DECIMAL(10, 2),
  provider VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_schedule_items_user_id ON schedule_items(user_id);

-- Create index for faster lookups by date
CREATE INDEX IF NOT EXISTS idx_schedule_items_date ON schedule_items(date);

-- Create index for faster lookups by type
CREATE INDEX IF NOT EXISTS idx_schedule_items_type ON schedule_items(type);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_schedule_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update the updated_at timestamp
CREATE TRIGGER set_schedule_items_updated_at
BEFORE UPDATE ON schedule_items
FOR EACH ROW
EXECUTE FUNCTION update_schedule_items_updated_at(); 