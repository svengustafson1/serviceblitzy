-- Create recurring_schedules table for storing pattern-based recurring service configurations
CREATE TABLE IF NOT EXISTS recurring_schedules (
  id SERIAL PRIMARY KEY,
  service_request_id INTEGER NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  rrule_pattern VARCHAR(255) NOT NULL,
  next_run TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups by service request
CREATE INDEX IF NOT EXISTS idx_recurring_schedules_service_request_id ON recurring_schedules(service_request_id);

-- Create index for faster lookups by next run time
CREATE INDEX IF NOT EXISTS idx_recurring_schedules_next_run ON recurring_schedules(next_run);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_recurring_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update the updated_at timestamp
CREATE TRIGGER set_recurring_schedules_updated_at
BEFORE UPDATE ON recurring_schedules
FOR EACH ROW
EXECUTE FUNCTION update_recurring_schedules_updated_at();