-- Begin transaction
BEGIN;

-- Check if the payments table structure needs to be updated
DO $$ 
BEGIN
  -- Check if service_request_id column exists
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'service_request_id'
  ) THEN
    -- Add new columns to the existing payments table
    ALTER TABLE payments 
    ADD COLUMN service_request_id INTEGER REFERENCES service_requests(id) ON DELETE CASCADE,
    ADD COLUMN bid_id INTEGER REFERENCES bids(id) ON DELETE SET NULL,
    ADD COLUMN provider_id INTEGER REFERENCES service_providers(id) ON DELETE CASCADE,
    ADD COLUMN currency VARCHAR(3) DEFAULT 'usd',
    ADD COLUMN description TEXT,
    ADD COLUMN payment_date TIMESTAMP,
    ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    
    -- Rename stripe_payment_id to stripe_payment_intent_id for consistency if it exists
    IF EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'payments' AND column_name = 'stripe_payment_id'
    ) THEN
      ALTER TABLE payments RENAME COLUMN stripe_payment_id TO stripe_payment_intent_id;
    END IF;
  END IF;
END $$;

-- Create indexes only if they don't exist yet
DO $$
BEGIN
  -- Create index for service_request_id if it doesn't exist and the column exists
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'service_request_id'
  ) AND NOT EXISTS (
    SELECT FROM pg_indexes 
    WHERE tablename = 'payments' AND indexname = 'idx_payments_service_request'
  ) THEN
    CREATE INDEX idx_payments_service_request ON payments(service_request_id);
  END IF;
  
  -- Create other indexes if they don't exist
  IF NOT EXISTS (SELECT FROM pg_indexes WHERE tablename = 'payments' AND indexname = 'idx_payments_homeowner') THEN
    CREATE INDEX idx_payments_homeowner ON payments(homeowner_id);
  END IF;
  
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'provider_id'
  ) AND NOT EXISTS (
    SELECT FROM pg_indexes 
    WHERE tablename = 'payments' AND indexname = 'idx_payments_provider'
  ) THEN
    CREATE INDEX idx_payments_provider ON payments(provider_id);
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_indexes WHERE tablename = 'payments' AND indexname = 'idx_payments_status') THEN
    CREATE INDEX idx_payments_status ON payments(status);
  END IF;
  
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'payment_date'
  ) AND NOT EXISTS (
    SELECT FROM pg_indexes 
    WHERE tablename = 'payments' AND indexname = 'idx_payments_payment_date'
  ) THEN
    CREATE INDEX idx_payments_payment_date ON payments(payment_date);
  END IF;
END $$;

-- Create refunds table if it doesn't exist
CREATE TABLE IF NOT EXISTS refunds (
  id SERIAL PRIMARY KEY,
  payment_id INTEGER REFERENCES payments(id) ON DELETE CASCADE,
  stripe_refund_id VARCHAR(100) UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  initiated_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  initiated_by_role VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for refunds table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_indexes WHERE tablename = 'refunds' AND indexname = 'idx_refunds_payment') THEN
    CREATE INDEX idx_refunds_payment ON refunds(payment_id);
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_indexes WHERE tablename = 'refunds' AND indexname = 'idx_refunds_status') THEN
    CREATE INDEX idx_refunds_status ON refunds(status);
  END IF;
END $$;

-- Commit transaction
COMMIT; 