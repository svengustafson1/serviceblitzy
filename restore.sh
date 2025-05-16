#!/bin/bash

# Restoration Script
# This script automates the process of restoring from a backup

# Set terminal colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Directory to restore to
RESTORE_DIR=""

# Backup archive to restore from
BACKUP_ARCHIVE=""

# Function to display usage
usage() {
    echo "Usage: $0 [options]"
    echo
    echo "Options:"
    echo "  -b, --backup ARCHIVE   Specify the backup archive to restore from"
    echo "  -d, --directory DIR    Specify the directory to restore to"
    echo "  -c, --cloud            Restore from the latest cloud backup"
    echo "  -h, --help             Display this help message"
    echo
    echo "Examples:"
    echo "  $0 --backup project_backup_20250225_150158.tar.gz --directory ~/restored_service"
    echo "  $0 --cloud --directory ~/restored_service"
    exit 1
}

# Parse command line arguments
while (( "$#" )); do
    case "$1" in
        -b|--backup)
            BACKUP_ARCHIVE="$2"
            shift 2
            ;;
        -d|--directory)
            RESTORE_DIR="$2"
            shift 2
            ;;
        -c|--cloud)
            USE_CLOUD=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo "Error: Unsupported option $1" >&2
            usage
            ;;
    esac
done

# Check if restore directory is specified
if [ -z "$RESTORE_DIR" ]; then
    echo -e "${YELLOW}Restore directory not specified.${NC}"
    echo -e "Please specify a directory to restore to with -d or --directory."
    usage
fi

# Create restore directory if it doesn't exist
mkdir -p "$RESTORE_DIR"

# Temporary directory for extraction
TMP_DIR=$(mktemp -d)
echo "Created temporary directory: $TMP_DIR"

# Function to clean up temporary files
cleanup() {
    echo "Cleaning up temporary files..."
    rm -rf "$TMP_DIR"
}

# Set up trap to ensure cleanup on exit
trap cleanup EXIT

# If restoring from cloud, download the latest backup
if [ "$USE_CLOUD" = true ]; then
    echo -e "${YELLOW}Restoring from cloud backup...${NC}"
    
    # Check if rclone is installed
    if ! command -v rclone &> /dev/null; then
        echo -e "${RED}rclone is not installed. Cannot restore from cloud.${NC}"
        echo "Please install rclone or use a local backup instead."
        exit 1
    fi
    
    # Cloud provider and remote path (must match cloud-backup.sh)
    CLOUD_PROVIDER="gdrive"
    CLOUD_PATH="service_backups"
    
    # Check if cloud provider is configured
    if ! rclone listremotes | grep -q "^${CLOUD_PROVIDER}:"; then
        echo -e "${RED}rclone is not configured for ${CLOUD_PROVIDER}.${NC}"
        echo "Please run ./cloud-backup.sh first to configure cloud storage."
        exit 1
    fi
    
    # Check if there are any backups in the cloud
    if ! rclone ls "${CLOUD_PROVIDER}:${CLOUD_PATH}" | grep -q ".tar.gz"; then
        echo -e "${RED}No backups found in the cloud.${NC}"
        echo "Please run ./cloud-backup.sh first to upload backups."
        exit 1
    fi
    
    # Get the latest backup
    echo "Finding the latest backup in the cloud..."
    LATEST_BACKUP=$(rclone lsl "${CLOUD_PROVIDER}:${CLOUD_PATH}" | grep ".tar.gz" | sort -k2,3 -r | head -n 1 | awk '{print $NF}')
    
    if [ -z "$LATEST_BACKUP" ]; then
        echo -e "${RED}Could not determine the latest backup.${NC}"
        exit 1
    fi
    
    echo "Latest backup: $LATEST_BACKUP"
    
    # Download the backup
    echo "Downloading backup from cloud..."
    rclone copy "${CLOUD_PROVIDER}:${CLOUD_PATH}/$LATEST_BACKUP" "$TMP_DIR" --progress
    
    # Set the backup archive path
    BACKUP_ARCHIVE="$TMP_DIR/$LATEST_BACKUP"
else
    # Check if backup archive is specified and exists
    if [ -z "$BACKUP_ARCHIVE" ]; then
        echo -e "${YELLOW}Backup archive not specified.${NC}"
        echo -e "Please specify a backup archive with -b or --backup."
        usage
    fi
    
    if [ ! -f "$BACKUP_ARCHIVE" ]; then
        echo -e "${RED}Backup archive does not exist: $BACKUP_ARCHIVE${NC}"
        exit 1
    fi
fi

echo -e "${YELLOW}Restoring from backup: $BACKUP_ARCHIVE${NC}"
echo -e "${YELLOW}Restoring to: $RESTORE_DIR${NC}"

# Extract the backup archive
echo "Extracting backup archive..."
tar -xzf "$BACKUP_ARCHIVE" -C "$TMP_DIR"

# Find the extracted directory (it should be the only directory)
EXTRACTED_DIR=$(find "$TMP_DIR" -maxdepth 1 -type d -not -path "$TMP_DIR" | head -n 1)

if [ -z "$EXTRACTED_DIR" ]; then
    echo -e "${RED}Could not find extracted directory.${NC}"
    exit 1
fi

echo "Extracted to: $EXTRACTED_DIR"

# Restore code files
echo "Restoring code files..."
cp -r "$EXTRACTED_DIR/code/"* "$RESTORE_DIR/"

# Restore environment files
echo "Restoring environment files..."
mkdir -p "$RESTORE_DIR/backend"
mkdir -p "$RESTORE_DIR/frontend"

if [ -f "$EXTRACTED_DIR/environment/backend.env" ]; then
    cp "$EXTRACTED_DIR/environment/backend.env" "$RESTORE_DIR/backend/.env"
    echo "✓ Restored backend/.env"
fi

if [ -f "$EXTRACTED_DIR/environment/frontend.env" ]; then
    cp "$EXTRACTED_DIR/environment/frontend.env" "$RESTORE_DIR/frontend/.env"
    echo "✓ Restored frontend/.env"
fi

if [ -f "$EXTRACTED_DIR/environment/frontend.env.local" ]; then
    cp "$EXTRACTED_DIR/environment/frontend.env.local" "$RESTORE_DIR/frontend/.env.local"
    echo "✓ Restored frontend/.env.local"
fi

if [ -f "$EXTRACTED_DIR/environment/root.env" ]; then
    cp "$EXTRACTED_DIR/environment/root.env" "$RESTORE_DIR/.env"
    echo "✓ Restored .env"
fi

# Restore database 
echo "Checking if PostgreSQL is available..."
if command -v psql &> /dev/null; then
    # Find a working PostgreSQL user
    CURRENT_USER=$(whoami)
    
    if psql -c "SELECT 1" &> /dev/null; then
        WORKING_USER=$CURRENT_USER
    elif psql -U postgres -c "SELECT 1" &> /dev/null; then
        WORKING_USER="postgres"
    else
        echo -e "${YELLOW}Could not find a working PostgreSQL user.${NC}"
        echo "You may need to run ./fix-postgres-user.sh after restoration."
        WORKING_USER=""
    fi
    
    if [ -n "$WORKING_USER" ]; then
        echo "Using PostgreSQL user: $WORKING_USER"
        
        # Create the database if it doesn't exist
        if ! psql -U $WORKING_USER -lqt | cut -d \| -f 1 | grep -qw home_services; then
            echo "Creating database home_services..."
            createdb -U $WORKING_USER home_services
        fi
        
        # Check if we have a full database backup
        if [ -f "$EXTRACTED_DIR/database/full_backup.sql" ]; then
            echo "Restoring database from full backup..."
            psql -U $WORKING_USER -d home_services -f "$EXTRACTED_DIR/database/full_backup.sql"
            echo "✓ Database restored from full backup"
        elif [ -d "$EXTRACTED_DIR/database/migrations" ]; then
            echo "Restoring database from migrations..."
            for f in "$EXTRACTED_DIR/database/migrations/"*.sql; do
                echo "Applying migration: $(basename "$f")"
                psql -U $WORKING_USER -d home_services -f "$f"
            done
            echo "✓ Database restored from migrations"
        else
            echo -e "${YELLOW}No database backup or migrations found.${NC}"
            echo "You may need to setup the database manually."
        fi
    fi
else
    echo -e "${YELLOW}PostgreSQL not found. Skipping database restoration.${NC}"
    echo "You will need to restore the database manually."
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Restoration completed successfully!${NC}"
echo
echo "Next steps:"
echo "1. Navigate to the restored directory:"
echo "   cd $RESTORE_DIR"
echo
echo "2. Install dependencies:"
echo "   cd backend && npm install"
echo "   cd ../frontend && npm install"
echo
echo "3. If the database connection fails, run:"
echo "   ./fix-postgres-user.sh"
echo
echo "4. Start the application:"
echo "   cd backend && npm run dev        # In one terminal"
echo "   cd frontend && npm run dev       # In another terminal" 