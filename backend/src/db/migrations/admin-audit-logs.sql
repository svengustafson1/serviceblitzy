-- Admin audit logs table for tracking all administrative actions for security and compliance purposes
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id SERIAL PRIMARY KEY,
  admin_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action_type VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'approve', 'reject', etc.
  entity_name VARCHAR(50) NOT NULL, -- 'user', 'service_provider', 'homeowner', 'service_request', etc.
  entity_id INTEGER NOT NULL, -- ID of the affected entity
  details JSONB NOT NULL, -- Comprehensive information about the changes made
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin ON admin_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_entity ON admin_audit_logs(entity_name, entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_timestamp ON admin_audit_logs(timestamp);

-- Function to automatically purge old audit logs based on retention policy
CREATE OR REPLACE FUNCTION purge_old_admin_audit_logs()
RETURNS TRIGGER AS $$
DECLARE
  retention_days INTEGER;
BEGIN
  -- Get retention days from environment variable or use default (90 days)
  BEGIN
    retention_days := current_setting('app.admin_audit_retention_days')::INTEGER;
  EXCEPTION WHEN OTHERS THEN
    retention_days := 90; -- Default retention period
  END;
  
  -- Delete audit logs older than the retention period
  DELETE FROM admin_audit_logs
  WHERE timestamp < NOW() - (retention_days * INTERVAL '1 day');
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to run this function periodically
DO $$
BEGIN
  -- Drop the trigger if it exists
  DROP TRIGGER IF EXISTS purge_old_admin_audit_logs_trigger ON admin_audit_logs;
  
  -- Create the trigger
  CREATE TRIGGER purge_old_admin_audit_logs_trigger
  AFTER INSERT ON admin_audit_logs
  EXECUTE FUNCTION purge_old_admin_audit_logs();
END;
$$;

-- Comment explaining the retention policy
COMMENT ON TABLE admin_audit_logs IS 'Tracks all administrative actions for security and compliance purposes. Retention period configurable via ADMIN_AUDIT_RETENTION_DAYS environment variable (default: 90 days).';