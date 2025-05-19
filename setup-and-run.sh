#!/bin/bash

# Function to check if PostgreSQL is running
check_postgres() {
    if command -v pg_isready > /dev/null; then
        if pg_isready > /dev/null 2>&1; then
            echo "PostgreSQL is running."
            return 0
        else
            echo "PostgreSQL is not running. Please start PostgreSQL."
            return 1
        fi
    else
        echo "pg_isready not found. Make sure PostgreSQL is installed."
        return 1
    fi
}

# Function to check if Docker is installed and running
check_docker() {
    if command -v docker > /dev/null; then
        if docker info > /dev/null 2>&1; then
            echo "Docker is running."
            return 0
        else
            echo "Docker is installed but not running. Please start Docker."
            return 1
        fi
    else
        echo "Docker not found. Docker is required for LocalStack (S3 emulation)."
        return 1
    fi
}

# Function to set up AWS S3 emulation using LocalStack
setup_localstack() {
    echo "Setting up LocalStack for AWS S3 emulation..."
    
    # Check if LocalStack is already running
    if docker ps | grep -q "localstack/localstack"; then
        echo "LocalStack is already running."
    else
        echo "Starting LocalStack container..."
        docker run -d \
            --name localstack \
            -p 4566:4566 \
            -e SERVICES=s3 \
            -e DEFAULT_REGION=us-east-1 \
            localstack/localstack
        
        # Wait for LocalStack to be ready
        echo "Waiting for LocalStack to be ready..."
        sleep 5
        
        # Create a test bucket
        echo "Creating test bucket 'home-services-uploads'..."
        aws --endpoint-url=http://localhost:4566 s3 mb s3://home-services-uploads
        
        echo "LocalStack setup complete."
    fi
}

# Function to configure AWS credentials
configure_aws_credentials() {
    echo "Configuring AWS credentials for local development..."
    
    # Check if AWS CLI is installed
    if ! command -v aws > /dev/null; then
        echo "AWS CLI not found. Please install it for full functionality."
        return 1
    fi
    
    # Create or update AWS credentials file
    mkdir -p ~/.aws
    
    # Check if credentials file exists and has a default profile
    if [ ! -f ~/.aws/credentials ] || ! grep -q "\[default\]" ~/.aws/credentials; then
        echo "Creating default AWS credentials for local development..."
        cat > ~/.aws/credentials << EOF
[default]
aws_access_key_id = test
aws_secret_access_key = test
region = us-east-1
EOF
        echo "AWS credentials configured for local development."
    else
        echo "AWS credentials file already exists. Skipping configuration."
    fi
    
    return 0
}

# Check if PostgreSQL is running
check_postgres || exit 1

# Check if the database exists, and create it if it doesn't
echo "Checking if 'home_services' database exists..."
if psql -l | grep -q home_services; then
    echo "Database 'home_services' already exists."
else
    echo "Creating 'home_services' database..."
    createdb home_services || { echo "Failed to create database. Check PostgreSQL permissions."; exit 1; }
fi

# Install dependencies
echo "Installing backend dependencies..."
(cd backend && npm install)

# Install new dependencies
echo "Installing new backend dependencies..."
(cd backend && npm install socket.io aws-sdk multer @stripe/connect-js rrule)

echo "Installing frontend dependencies..."
(cd frontend && npm install)

# Install new frontend dependencies
echo "Installing new frontend dependencies..."
(cd frontend && npm install socket.io-client chart.js react-chartjs-2)

# Run database setup
echo "Setting up the database schema..."
(cd backend && npm run setup)

# Check if new migration files exist and run them
echo "Checking for new migration files..."
if [ -f backend/src/db/migrations/recurring-schedules.sql ] || 
   [ -f backend/src/db/migrations/file-uploads.sql ] || 
   [ -f backend/src/db/migrations/provider-payouts.sql ]; then
    echo "Running new migration files..."
    
    if [ -f backend/src/db/migrations/recurring-schedules.sql ]; then
        echo "Setting up recurring schedules table..."
        psql -d home_services -f backend/src/db/migrations/recurring-schedules.sql
    fi
    
    if [ -f backend/src/db/migrations/file-uploads.sql ]; then
        echo "Setting up file uploads table..."
        psql -d home_services -f backend/src/db/migrations/file-uploads.sql
    fi
    
    if [ -f backend/src/db/migrations/provider-payouts.sql ]; then
        echo "Setting up provider payouts table..."
        psql -d home_services -f backend/src/db/migrations/provider-payouts.sql
    fi
else
    echo "No new migration files found. Database schema should be up to date."
fi

# Ask if user wants to set up LocalStack for S3 emulation
echo "Do you want to set up LocalStack for AWS S3 emulation? (requires Docker) (y/n)"
read -r setup_s3
if [[ "$setup_s3" == "y" || "$setup_s3" == "Y" ]]; then
    if check_docker; then
        setup_localstack
        configure_aws_credentials
    else
        echo "Skipping LocalStack setup due to Docker not being available."
    fi
else
    echo "Skipping LocalStack setup."
fi

# Create or update .env file with required variables
echo "Setting up environment variables..."
if [ ! -f backend/.env ]; then
    echo "Creating .env file in backend directory..."
    cat > backend/.env << EOF
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Connection
DATABASE_URL=postgresql://localhost:5432/home_services

# Authentication
JWT_SECRET=dev_jwt_secret
REFRESH_TOKEN_SECRET=dev_refresh_token_secret

# External Services
STRIPE_SECRET_KEY=your_stripe_test_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
FRONTEND_URL=http://localhost:3000

# WebSocket Configuration
WEBSOCKET_PORT=3002
WEBSOCKET_JWT_SECRET=dev_websocket_jwt_secret

# File Upload Configuration
AWS_S3_BUCKET=home-services-uploads
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_ENDPOINT=http://localhost:4566
FILE_UPLOAD_MAX_SIZE=5242880
FILE_UPLOAD_ALLOWED_TYPES=image/png,image/jpeg,application/pdf,application/msword

# Stripe Connect Configuration
STRIPE_CLIENT_ID=your_stripe_client_id
STRIPE_PAYOUT_THRESHOLD=100
STRIPE_PAYOUT_INTERVAL=weekly

# Recurring Schedule Configuration
RRULE_DEFAULT_WKST=MO
SCHEDULE_CONFLICT_RESOLUTION=skip
EOF
    echo "Environment variables configured."
else
    echo ".env file already exists in backend directory. Please update it manually with new required variables."
    echo "Required variables include: WEBSOCKET_PORT, AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, etc."
fi

echo "====================================="
echo "Setup complete! To run the application:"
echo "1. In one terminal: cd backend && npm run dev"
echo "2. In another terminal: cd frontend && npm run dev"
echo "3. Open your browser to http://localhost:3000"
echo "====================================="

echo "Would you like to start the servers now? (y/n)"
read -r answer
if [[ "$answer" == "y" || "$answer" == "Y" ]]; then
    echo "Starting the backend server in a new terminal..."
    osascript -e 'tell app "Terminal" to do script "cd \"'$(pwd)'/backend\" && npm run dev"'
    
    echo "Starting the frontend server in a new terminal..."
    osascript -e 'tell app "Terminal" to do script "cd \"'$(pwd)'/frontend\" && npm run dev"'
    
    echo "Servers started! Wait a moment and then open http://localhost:3000 in your browser."
fi