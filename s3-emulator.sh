#!/bin/bash

# s3-emulator.sh
# A shell script that manages the local S3 emulation environment using LocalStack,
# providing developers with a fully functional S3-compatible API for testing file
# upload functionality without requiring an AWS account or incurring cloud costs.

# Set strict error handling
set -e

# Configuration variables
LOCALSTACK_CONTAINER_NAME="localstack-s3"
LOCALSTACK_IMAGE="localstack/localstack:latest"
LOCALSTACK_PORT=4566
DATA_DIR="${HOME}/.localstack-s3-data"

# Default bucket names - these will be created automatically when the container starts
DEFAULT_BUCKETS=("uploads" "documents" "images")

# CORS configuration for direct browser uploads
CORS_CONFIG='{"CORSRules": [{"AllowedHeaders":["*"],"AllowedMethods":["GET","PUT","POST","DELETE","HEAD"],"AllowedOrigins":["*"],"ExposeHeaders":["ETag","x-amz-server-side-encryption","x-amz-request-id","x-amz-id-2"]}]}'

# Colors for output
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

# Function to display usage information
show_usage() {
    echo -e "${BLUE}S3 Emulator - LocalStack S3 Management Script${NC}"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start         Start the S3 emulator container"
    echo "  stop          Stop the S3 emulator container"
    echo "  restart       Restart the S3 emulator container"
    echo "  status        Check the status of the S3 emulator container"
    echo "  reset         Reset the S3 emulator (removes all data)"
    echo "  create-bucket <bucket-name>  Create a new bucket"
    echo "  list-buckets  List all buckets"
    echo "  list-objects <bucket-name>  List objects in a bucket"
    echo "  delete-bucket <bucket-name>  Delete a bucket"
    echo "  configure-cors <bucket-name>  Configure CORS for a bucket"
    echo "  help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start"
    echo "  $0 create-bucket my-custom-bucket"
    echo "  $0 list-objects uploads"
    echo ""
}

# Function to check if Docker is installed and running
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Error: Docker is not installed or not in PATH${NC}"
        echo "Please install Docker and try again."
        exit 1
    fi

    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        echo -e "${RED}Error: Docker daemon is not running${NC}"
        echo "Please start Docker and try again."
        exit 1
    fi
}

# Function to check if AWS CLI is installed
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        echo -e "${YELLOW}Warning: AWS CLI is not installed or not in PATH${NC}"
        echo "Some commands may not work properly."
        echo "Please install AWS CLI for full functionality."
    fi
}

# Function to create the data directory if it doesn't exist
create_data_dir() {
    if [ ! -d "$DATA_DIR" ]; then
        echo -e "${BLUE}Creating data directory: $DATA_DIR${NC}"
        mkdir -p "$DATA_DIR"
    fi
}

# Function to check if the container is running
is_container_running() {
    if docker ps --format '{{.Names}}' | grep -q "^${LOCALSTACK_CONTAINER_NAME}$"; then
        return 0 # true
    else
        return 1 # false
    fi
}

# Function to start the LocalStack container
start_container() {
    if is_container_running; then
        echo -e "${YELLOW}S3 emulator is already running${NC}"
        return 0
    fi

    echo -e "${BLUE}Starting S3 emulator...${NC}"
    create_data_dir

    # Start the LocalStack container
    docker run -d \
        --name "$LOCALSTACK_CONTAINER_NAME" \
        -p "127.0.0.1:${LOCALSTACK_PORT}:4566" \
        -e "SERVICES=s3" \
        -e "DEBUG=0" \
        -e "DATA_DIR=/tmp/localstack/data" \
        -v "${DATA_DIR}:/tmp/localstack/data" \
        -v "/var/run/docker.sock:/var/run/docker.sock" \
        "$LOCALSTACK_IMAGE"

    # Wait for the container to be ready
    echo -e "${BLUE}Waiting for S3 emulator to be ready...${NC}"
    for i in {1..30}; do
        if docker logs "$LOCALSTACK_CONTAINER_NAME" 2>&1 | grep -q "Ready."; then
            echo -e "${GREEN}S3 emulator is now running${NC}"
            create_default_buckets
            return 0
        fi
        sleep 1
    done

    echo -e "${RED}Timed out waiting for S3 emulator to be ready${NC}"
    return 1
}

# Function to stop the LocalStack container
stop_container() {
    if ! is_container_running; then
        echo -e "${YELLOW}S3 emulator is not running${NC}"
        return 0
    fi

    echo -e "${BLUE}Stopping S3 emulator...${NC}"
    docker stop "$LOCALSTACK_CONTAINER_NAME" > /dev/null
    docker rm "$LOCALSTACK_CONTAINER_NAME" > /dev/null
    echo -e "${GREEN}S3 emulator stopped${NC}"
}

# Function to restart the LocalStack container
restart_container() {
    echo -e "${BLUE}Restarting S3 emulator...${NC}"
    stop_container
    start_container
}

# Function to check the status of the LocalStack container
check_status() {
    if is_container_running; then
        echo -e "${GREEN}S3 emulator is running${NC}"
        echo -e "${BLUE}Container name:${NC} $LOCALSTACK_CONTAINER_NAME"
        echo -e "${BLUE}Endpoint:${NC} http://localhost:${LOCALSTACK_PORT}"
        echo -e "${BLUE}AWS CLI usage:${NC} aws --endpoint-url=http://localhost:${LOCALSTACK_PORT} s3 <command>"
        
        # List buckets
        echo -e "\n${BLUE}Available buckets:${NC}"
        list_buckets
    else
        echo -e "${YELLOW}S3 emulator is not running${NC}"
    fi
}

# Function to reset the LocalStack container (remove all data)
reset_container() {
    echo -e "${YELLOW}Resetting S3 emulator...${NC}"
    stop_container
    
    echo -e "${YELLOW}Removing data directory: $DATA_DIR${NC}"
    rm -rf "$DATA_DIR"
    
    start_container
    echo -e "${GREEN}S3 emulator has been reset${NC}"
}

# Function to create default buckets
create_default_buckets() {
    echo -e "${BLUE}Creating default buckets...${NC}"
    for bucket in "${DEFAULT_BUCKETS[@]}"; do
        create_bucket "$bucket"
        configure_cors "$bucket"
    done
}

# Function to create a bucket
create_bucket() {
    local bucket_name=$1
    
    if [ -z "$bucket_name" ]; then
        echo -e "${RED}Error: Bucket name is required${NC}"
        return 1
    fi
    
    echo -e "${BLUE}Creating bucket: $bucket_name${NC}"
    if aws --endpoint-url=http://localhost:${LOCALSTACK_PORT} s3 mb s3://$bucket_name > /dev/null 2>&1; then
        echo -e "${GREEN}Bucket created: $bucket_name${NC}"
    else
        echo -e "${YELLOW}Bucket may already exist: $bucket_name${NC}"
    fi
}

# Function to list all buckets
list_buckets() {
    if ! is_container_running; then
        echo -e "${YELLOW}S3 emulator is not running${NC}"
        return 1
    fi
    
    aws --endpoint-url=http://localhost:${LOCALSTACK_PORT} s3 ls
}

# Function to list objects in a bucket
list_objects() {
    local bucket_name=$1
    
    if [ -z "$bucket_name" ]; then
        echo -e "${RED}Error: Bucket name is required${NC}"
        return 1
    fi
    
    if ! is_container_running; then
        echo -e "${YELLOW}S3 emulator is not running${NC}"
        return 1
    fi
    
    echo -e "${BLUE}Listing objects in bucket: $bucket_name${NC}"
    aws --endpoint-url=http://localhost:${LOCALSTACK_PORT} s3 ls s3://$bucket_name
}

# Function to delete a bucket
delete_bucket() {
    local bucket_name=$1
    
    if [ -z "$bucket_name" ]; then
        echo -e "${RED}Error: Bucket name is required${NC}"
        return 1
    fi
    
    if ! is_container_running; then
        echo -e "${YELLOW}S3 emulator is not running${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}Deleting bucket: $bucket_name${NC}"
    aws --endpoint-url=http://localhost:${LOCALSTACK_PORT} s3 rb s3://$bucket_name --force
    echo -e "${GREEN}Bucket deleted: $bucket_name${NC}"
}

# Function to configure CORS for a bucket
configure_cors() {
    local bucket_name=$1
    
    if [ -z "$bucket_name" ]; then
        echo -e "${RED}Error: Bucket name is required${NC}"
        return 1
    fi
    
    if ! is_container_running; then
        echo -e "${YELLOW}S3 emulator is not running${NC}"
        return 1
    fi
    
    echo -e "${BLUE}Configuring CORS for bucket: $bucket_name${NC}"
    
    # Create a temporary file for the CORS configuration
    local temp_file=$(mktemp)
    echo "$CORS_CONFIG" > "$temp_file"
    
    # Apply the CORS configuration
    aws --endpoint-url=http://localhost:${LOCALSTACK_PORT} s3api put-bucket-cors \
        --bucket "$bucket_name" \
        --cors-configuration file://$temp_file
    
    # Remove the temporary file
    rm "$temp_file"
    
    echo -e "${GREEN}CORS configured for bucket: $bucket_name${NC}"
}

# Main function to handle commands
main() {
    # Check dependencies
    check_docker
    check_aws_cli
    
    # Process command
    case "$1" in
        start)
            start_container
            ;;
        stop)
            stop_container
            ;;
        restart)
            restart_container
            ;;
        status)
            check_status
            ;;
        reset)
            reset_container
            ;;
        create-bucket)
            if [ -z "$2" ]; then
                echo -e "${RED}Error: Bucket name is required${NC}"
                show_usage
                exit 1
            fi
            if ! is_container_running; then
                echo -e "${YELLOW}S3 emulator is not running. Starting...${NC}"
                start_container
            fi
            create_bucket "$2"
            configure_cors "$2"
            ;;
        list-buckets)
            list_buckets
            ;;
        list-objects)
            if [ -z "$2" ]; then
                echo -e "${RED}Error: Bucket name is required${NC}"
                show_usage
                exit 1
            fi
            list_objects "$2"
            ;;
        delete-bucket)
            if [ -z "$2" ]; then
                echo -e "${RED}Error: Bucket name is required${NC}"
                show_usage
                exit 1
            fi
            delete_bucket "$2"
            ;;
        configure-cors)
            if [ -z "$2" ]; then
                echo -e "${RED}Error: Bucket name is required${NC}"
                show_usage
                exit 1
            fi
            configure_cors "$2"
            ;;
        help)
            show_usage
            ;;
        *)
            show_usage
            exit 1
            ;;
    esac
}

# Execute main function with all arguments
main "$@"