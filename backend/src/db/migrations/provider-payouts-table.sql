-- Begin transaction
BEGIN;

-- Create provider_payouts table if it doesn't exist
CREATE TABLE IF NOT EXISTS provider_payouts (
  id SERIAL PRIMARY KEY,
  provider_id INTEGER NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,
  stripe_transfer_id VARCHAR(100) UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  platform_fee DECIMAL(10, 2) NOT NULL,
  original_amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'usd',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  payout_date TIMESTAMP,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
  
  IF NOT EXISTS (SELECT FROM pg_indexes WHERE tablename = 'provider_payouts' AND indexname = 'idx_provider_payouts_payout_date') THEN
    CREATE INDEX idx_provider_payouts_payout_date ON provider_payouts(payout_date);
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_indexes WHERE tablename = 'provider_payouts' AND indexname = 'idx_provider_payouts_created_at') THEN
    CREATE INDEX idx_provider_payouts_created_at ON provider_payouts(created_at);
  END IF;
END $$;

-- Add stripe_connect_account_id to service_providers table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'service_providers' AND column_name = 'stripe_connect_account_id'
  ) THEN
    ALTER TABLE service_providers 
    ADD COLUMN stripe_connect_account_id VARCHAR(100),
    ADD COLUMN stripe_connect_onboarded BOOLEAN DEFAULT FALSE,
    ADD COLUMN stripe_connect_onboarding_date TIMESTAMP,
    ADD COLUMN commission_rate DECIMAL(5, 2) DEFAULT 10.00; -- Default 10% commission rate
  END IF;
END $$;

-- Commit transaction
COMMIT;