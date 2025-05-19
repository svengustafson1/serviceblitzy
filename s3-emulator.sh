#!/bin/bash

# S3 emulator script using LocalStack

# Check if Docker is installed and running
if ! command -v docker > /dev/null; then
    echo "Docker is not installed. Please install Docker to use the S3 emulator."
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Docker is not running. Please start Docker to use the S3 emulator."
    exit 1
fi

# Check if LocalStack is already running
if docker ps | grep -q localstack; then
    echo "LocalStack is already running. Using existing container."
else
    echo "Starting LocalStack container for S3 emulation..."
    docker run -d \
        --name localstack \
        -p 4566:4566 \
        -e SERVICES=s3 \
        -e DEBUG=0 \
        -e DATA_DIR=/tmp/localstack/data \
        -v "${TMPDIR:-/tmp}/localstack:/tmp/localstack" \
        localstack/localstack:latest
    
    # Wait for LocalStack to start
    echo "Waiting for LocalStack to start..."
    sleep 5
    
    # Check if LocalStack started successfully
    if ! docker ps | grep -q localstack; then
        echo "Failed to start LocalStack. Please check Docker logs."
        exit 1
    fi
fi

# Configure AWS CLI for local use
export AWS_ACCESS_KEY_ID="test"
export AWS_SECRET_ACCESS_KEY="test"
export AWS_DEFAULT_REGION="us-east-1"

# Create default buckets
echo "Creating default S3 buckets..."
aws --endpoint-url=http://localhost:4566 s3 mb s3://home-services-uploads 2>/dev/null || echo "Bucket home-services-uploads already exists or could not be created."
aws --endpoint-url=http://localhost:4566 s3 mb s3://property-images 2>/dev/null || echo "Bucket property-images already exists or could not be created."
aws --endpoint-url=http://localhost:4566 s3 mb s3://service-documents 2>/dev/null || echo "Bucket service-documents already exists or could not be created."

# Configure CORS for the buckets
echo "Configuring CORS for S3 buckets..."
cat > /tmp/cors-config.json << EOF
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedOrigins": ["http://localhost:3000"],
      "ExposeHeaders": ["ETag"]
    }
  ]
}
EOF

aws --endpoint-url=http://localhost:4566 s3api put-bucket-cors --bucket home-services-uploads --cors-configuration file:///tmp/cors-config.json
aws --endpoint-url=http://localhost:4566 s3api put-bucket-cors --bucket property-images --cors-configuration file:///tmp/cors-config.json
aws --endpoint-url=http://localhost:4566 s3api put-bucket-cors --bucket service-documents --cors-configuration file:///tmp/cors-config.json

# List buckets to confirm
echo "Listing available S3 buckets:"
aws --endpoint-url=http://localhost:4566 s3 ls

echo "S3 emulator is running on port 4566."
echo "Use 'aws --endpoint-url=http://localhost:4566 s3 ls' to interact with it."
echo "Press Ctrl+C to stop the emulator."

# Keep the script running to maintain the terminal window
while true; do
    sleep 60
done