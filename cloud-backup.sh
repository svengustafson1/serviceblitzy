#!/bin/bash

# Cloud Backup Script
# This script uploads your backups to a cloud storage provider using rclone
# Supported providers: Google Drive, Dropbox, AWS S3, OneDrive, etc.

# Set terminal colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Local backup directory
LOCAL_BACKUP_DIR="$HOME/service_backups"

# Cloud provider and remote path (change these according to your preference)
CLOUD_PROVIDER="gdrive" # Options: gdrive, s3, dropbox, etc.
CLOUD_PATH="service_backups"

echo "Cloud Backup Tool"
echo "================="
echo 

# Check if rclone is installed
if ! command -v rclone &> /dev/null; then
    echo -e "${YELLOW}rclone is not installed. Let's install it.${NC}"
    
    # Install rclone
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            echo "Installing rclone using Homebrew..."
            brew install rclone
        else
            echo -e "${YELLOW}Homebrew not found. Installing rclone manually...${NC}"
            curl https://rclone.org/install.sh | sudo bash
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        echo "Installing rclone..."
        curl https://rclone.org/install.sh | sudo bash
    else
        echo -e "${RED}Unsupported operating system.${NC}"
        echo "Please install rclone manually: https://rclone.org/install/"
        exit 1
    fi
fi

# Check if rclone installation was successful
if ! command -v rclone &> /dev/null; then
    echo -e "${RED}Failed to install rclone.${NC}"
    echo "Please install it manually: https://rclone.org/install/"
    exit 1
fi

# Check if rclone is configured for the selected provider
if ! rclone listremotes | grep -q "^${CLOUD_PROVIDER}:"; then
    echo -e "${YELLOW}rclone is not configured for ${CLOUD_PROVIDER}.${NC}"
    echo "Let's set it up now."
    
    # Run rclone config
    echo "Running rclone config. Please follow the prompts to set up your cloud provider."
    echo "When asked for the name, use '${CLOUD_PROVIDER}'"
    echo
    echo -e "${YELLOW}Press Enter to continue...${NC}"
    read
    
    rclone config
    
    # Check if configuration was successful
    if ! rclone listremotes | grep -q "^${CLOUD_PROVIDER}:"; then
        echo -e "${RED}Failed to configure ${CLOUD_PROVIDER}.${NC}"
        echo "Please try again with a different name or provider."
        exit 1
    fi
fi

# Create remote directory if it doesn't exist
echo "Ensuring remote directory exists..."
rclone mkdir "${CLOUD_PROVIDER}:${CLOUD_PATH}" 2>/dev/null || true

# Check if local backup directory exists
if [ ! -d "$LOCAL_BACKUP_DIR" ]; then
    echo -e "${YELLOW}Local backup directory does not exist. Creating it...${NC}"
    mkdir -p "$LOCAL_BACKUP_DIR"
    
    echo "No backups found. Please run a backup first:"
    echo "  ./backup.sh"
    exit 1
fi

# Check if there are any backups
if [ ! "$(ls -A "$LOCAL_BACKUP_DIR" 2>/dev/null)" ]; then
    echo -e "${YELLOW}No backups found in $LOCAL_BACKUP_DIR.${NC}"
    echo "Please run a backup first:"
    echo "  ./backup.sh"
    exit 1
fi

# Upload backups to cloud
echo "Uploading backups to ${CLOUD_PROVIDER}:${CLOUD_PATH}..."
rclone copy "$LOCAL_BACKUP_DIR" "${CLOUD_PROVIDER}:${CLOUD_PATH}" --progress

# Check if upload was successful
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Backups successfully uploaded to ${CLOUD_PROVIDER}:${CLOUD_PATH}.${NC}"
    
    # List remote backups
    echo
    echo "Remote backups:"
    rclone ls "${CLOUD_PROVIDER}:${CLOUD_PATH}"
else
    echo -e "${RED}Failed to upload backups.${NC}"
    echo "Please check your internet connection and try again."
    exit 1
fi

echo
echo -e "${GREEN}==========================${NC}"
echo -e "${GREEN}Cloud backup completed!${NC}"
echo
echo "To add this to your automated backup process:"
echo "1. Edit $HOME/service_backups/run_backup.sh"
echo "2. Add the following line at the end (before the log line):"
echo "   $PWD/cloud-backup.sh"
echo
echo "This will automatically upload backups to the cloud after each backup." 