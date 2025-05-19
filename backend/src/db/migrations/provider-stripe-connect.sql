-- Add stripe_connect_account_id column to service_providers table
-- This migration adds support for Stripe Connect integration

DO $$
BEGIN
    -- Check if stripe_connect_account_id column exists in service_providers table
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'service_providers' AND column_name = 'stripe_connect_account_id'
    ) THEN
        -- Add stripe_connect_account_id column
        ALTER TABLE service_providers ADD COLUMN stripe_connect_account_id VARCHAR(255);
        RAISE NOTICE 'Added stripe_connect_account_id column to service_providers table';
    ELSE
        RAISE NOTICE 'stripe_connect_account_id column already exists in service_providers table';
    END IF;

    -- Check if stripe_connect_onboarded_at column exists in service_providers table
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'service_providers' AND column_name = 'stripe_connect_onboarded_at'
    ) THEN
        -- Add stripe_connect_onboarded_at column
        ALTER TABLE service_providers ADD COLUMN stripe_connect_onboarded_at TIMESTAMP;
        RAISE NOTICE 'Added stripe_connect_onboarded_at column to service_providers table';
    ELSE
        RAISE NOTICE 'stripe_connect_onboarded_at column already exists in service_providers table';
    END IF;

    -- Check if payout_schedule column exists in service_providers table
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'service_providers' AND column_name = 'payout_schedule'
    ) THEN
        -- Add payout_schedule column
        ALTER TABLE service_providers ADD COLUMN payout_schedule VARCHAR(50) DEFAULT 'standard';
        RAISE NOTICE 'Added payout_schedule column to service_providers table';
    ELSE
        RAISE NOTICE 'payout_schedule column already exists in service_providers table';
    END IF;

    -- Check if index on stripe_connect_account_id exists
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'service_providers' AND indexname = 'idx_service_providers_stripe_connect_account_id'
    ) THEN
        -- Create index on stripe_connect_account_id
        CREATE INDEX idx_service_providers_stripe_connect_account_id ON service_providers(stripe_connect_account_id);
        RAISE NOTICE 'Created index on stripe_connect_account_id column';
    ELSE
        RAISE NOTICE 'Index on stripe_connect_account_id column already exists';
    END IF;
END
$$;