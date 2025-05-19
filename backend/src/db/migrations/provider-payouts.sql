-- Begin transaction
BEGIN;

-- Create provider_payouts table if it doesn't exist
CREATE TABLE IF NOT EXISTS provider_payouts (
  id SERIAL PRIMARY KEY,
  provider_id INTEGER NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  stripe_payout_id VARCHAR(100),
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT provider_payouts_status_check CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Create indexes for provider_payouts table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_indexes WHERE tablename = 'provider_payouts' AND indexname = 'idx_provider_payouts_provider') THEN
    CREATE INDEX idx_provider_payouts_provider ON provider_payouts(provider_id);
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_indexes WHERE tablename = 'provider_payouts' AND indexname = 'idx_provider_payouts_payment') THEN
    CREATE INDEX idx_provider_payouts_payment ON provider_payouts(payment_id);
  END IF;

  IF NOT EXISTS (SELECT FROM pg_indexes WHERE tablename = 'provider_payouts' AND indexname = 'idx_provider_payouts_status') THEN
    CREATE INDEX idx_provider_payouts_status ON provider_payouts(status);
  END IF;
END $$;

-- Create trigger for automatically updating updated_at timestamp
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_provider_payouts_timestamp') THEN
    CREATE OR REPLACE FUNCTION update_provider_payouts_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER update_provider_payouts_timestamp
    BEFORE UPDATE ON provider_payouts
    FOR EACH ROW
    EXECUTE FUNCTION update_provider_payouts_timestamp();
  END IF;
END $$;

-- Commit transaction
COMMIT;