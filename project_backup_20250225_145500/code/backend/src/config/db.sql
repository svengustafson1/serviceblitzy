-- Database schema for Home Services Platform

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS bids CASCADE;
DROP TABLE IF EXISTS service_requests CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
DROP TABLE IF EXISTS service_providers CASCADE;
DROP TABLE IF EXISTS homeowners CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table (common fields for all user types)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    firebase_uid VARCHAR(128) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(20) NOT NULL DEFAULT 'homeowner', -- 'homeowner', 'provider', 'admin'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create homeowners table
CREATE TABLE homeowners (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_customer_id VARCHAR(128),
    billing_address VARCHAR(255),
    payment_method_id VARCHAR(128),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create service providers table
CREATE TABLE service_providers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255),
    description TEXT,
    services_offered INTEGER[], -- Array of service IDs
    avg_rating DECIMAL(3,2) DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    stripe_account_id VARCHAR(128),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create properties table
CREATE TABLE properties (
    id SERIAL PRIMARY KEY,
    homeowner_id INTEGER NOT NULL REFERENCES homeowners(id) ON DELETE CASCADE,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    zip_code VARCHAR(20) NOT NULL,
    property_size DECIMAL(10,2), -- in square feet
    property_type VARCHAR(50), -- e.g., 'residential', 'commercial'
    notes TEXT,
    qr_code_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create services table
CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    base_price DECIMAL(10,2), -- optional base price
    is_recurring BOOLEAN DEFAULT FALSE,
    markup_percentage DECIMAL(5,2) DEFAULT 15.00, -- Platform markup
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create service requests table
CREATE TABLE service_requests (
    id SERIAL PRIMARY KEY,
    homeowner_id INTEGER NOT NULL REFERENCES homeowners(id),
    property_id INTEGER NOT NULL REFERENCES properties(id),
    service_id INTEGER NOT NULL REFERENCES services(id),
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'bidding', 'scheduled', 'in_progress', 'completed', 'cancelled'
    description TEXT,
    preferred_date DATE,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_frequency VARCHAR(50), -- 'weekly', 'bi-weekly', 'monthly', etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create bids table
CREATE TABLE bids (
    id SERIAL PRIMARY KEY,
    service_request_id INTEGER NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
    provider_id INTEGER NOT NULL REFERENCES service_providers(id),
    price DECIMAL(10,2) NOT NULL,
    estimated_hours DECIMAL(5,2),
    description TEXT,
    ai_recommended BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create invoices table
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    service_request_id INTEGER NOT NULL REFERENCES service_requests(id),
    bid_id INTEGER REFERENCES bids(id),
    homeowner_id INTEGER NOT NULL REFERENCES homeowners(id),
    provider_id INTEGER NOT NULL REFERENCES service_providers(id),
    total_amount DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2) NOT NULL,
    provider_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'cancelled'
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create payments table
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id),
    homeowner_id INTEGER NOT NULL REFERENCES homeowners(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50),
    stripe_payment_id VARCHAR(128),
    status VARCHAR(50), -- 'succeeded', 'pending', 'failed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default services
INSERT INTO services (name, description, category, markup_percentage) VALUES
('Lawn Mowing', 'Regular lawn mowing and trimming service', 'Lawn Care', 15.00),
('Gutter Cleaning', 'Clean and flush gutters and downspouts', 'Exterior Maintenance', 15.00),
('Window Cleaning', 'Professional window cleaning, inside and out', 'Cleaning', 12.00),
('House Cleaning', 'Thorough house cleaning service', 'Cleaning', 10.00),
('HVAC Maintenance', 'Routine HVAC system check and maintenance', 'HVAC', 15.00),
('Exterior Painting', 'House exterior painting service', 'Painting', 15.00),
('Dock Installation', 'Seasonal dock installation service', 'Waterfront', 18.00),
('Dock Removal', 'Seasonal dock removal service', 'Waterfront', 18.00),
('Boat Cleaning', 'Professional boat cleaning and detailing', 'Waterfront', 15.00),
('Snow Plowing', 'Snow removal from driveways and walkways', 'Winter Services', 20.00),
('Lawn Fertilization', 'Professional lawn fertilization service', 'Lawn Care', 15.00),
('Gardening', 'Professional gardening and landscaping service', 'Lawn Care', 15.00);

-- Create index for better query performance
CREATE INDEX idx_service_requests_homeowner ON service_requests(homeowner_id);
CREATE INDEX idx_service_requests_property ON service_requests(property_id);
CREATE INDEX idx_bids_service_request ON bids(service_request_id);
CREATE INDEX idx_bids_provider ON bids(provider_id);
CREATE INDEX idx_invoices_homeowner ON invoices(homeowner_id);
CREATE INDEX idx_properties_homeowner ON properties(homeowner_id); 