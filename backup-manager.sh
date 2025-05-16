#!/bin/bash

# Backup Manager
# This script provides a user-friendly interface for all backup and restore operations

# Set terminal colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to display the main menu
show_menu() {
    clear
    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}        SERVICE BACKUP MANAGER        ${NC}"
    echo -e "${BLUE}======================================${NC}"
    echo
    echo "Please select an option:"
    echo
    echo "  BACKUP OPTIONS:"
    echo "  1) Create a manual backup"
    echo "  2) Set up automated daily backups"
    echo "  3) Upload backups to cloud storage"
    echo
    echo "  RESTORE OPTIONS:"
    echo "  4) Restore from a local backup"
    echo "  5) Restore from a cloud backup"
    echo
    echo "  MAINTENANCE:"
    echo "  6) Fix PostgreSQL database connection"
    echo "  7) Test backup and restore"
    echo "  8) View backup history"
    echo
    echo "  0) Exit"
    echo
    echo -n "Enter your choice [0-8]: "
}

# Function to check if a script exists and is executable
check_script() {
    if [ ! -f "$1" ]; then
        echo -e "${RED}Error: Script $1 not found.${NC}"
        return 1
    fi
    
    if [ ! -x "$1" ]; then
        chmod +x "$1"
    fi
    
    return 0
}

# Function to press any key to continue
press_any_key() {
    echo
    echo -n "Press any key to continue..."
    read -n 1 -s
    echo
}

# Function to create a manual backup
create_backup() {
    echo -e "${YELLOW}Creating a manual backup...${NC}"
    
    if check_script "./backup.sh"; then
        ./backup.sh
        echo -e "${GREEN}Backup completed.${NC}"
    else
        echo -e "${RED}Could not find backup script.${NC}"
    fi
    
    press_any_key
}

# Function to set up automated backups
setup_automated_backups() {
    echo -e "${YELLOW}Setting up automated daily backups...${NC}"
    
    if check_script "./setup-automated-backups.sh"; then
        ./setup-automated-backups.sh
        echo -e "${GREEN}Automated backups have been set up.${NC}"
    else
        echo -e "${RED}Could not find setup-automated-backups.sh script.${NC}"
    fi
    
    press_any_key
}

# Function to upload backups to cloud
upload_to_cloud() {
    echo -e "${YELLOW}Uploading backups to cloud storage...${NC}"
    
    if check_script "./cloud-backup.sh"; then
        ./cloud-backup.sh
        echo -e "${GREEN}Cloud backup completed.${NC}"
    else
        echo -e "${RED}Could not find cloud-backup.sh script.${NC}"
    fi
    
    press_any_key
}

# Function to restore from a local backup
restore_local() {
    echo -e "${YELLOW}Restoring from a local backup...${NC}"
    
    if ! check_script "./restore.sh"; then
        echo -e "${RED}Could not find restore.sh script.${NC}"
        press_any_key
        return
    fi
    
    # Find all backup archives
    BACKUPS=($(find . -maxdepth 1 -name "project_backup_*.tar.gz" -type f | sort -r))
    
    if [ ${#BACKUPS[@]} -eq 0 ]; then
        echo -e "${RED}No backup archives found in the current directory.${NC}"
        press_any_key
        return
    fi
    
    echo "Available backups:"
    echo
    
    for i in "${!BACKUPS[@]}"; do
        BACKUP_NAME=$(basename "${BACKUPS[$i]}")
        BACKUP_DATE=$(echo "$BACKUP_NAME" | sed 's/project_backup_\([0-9]\{8\}\)_\([0-9]\{6\}\).tar.gz/\1 \2/' | sed 's/\([0-9]\{4\}\)\([0-9]\{2\}\)\([0-9]\{2\}\) \([0-9]\{2\}\)\([0-9]\{2\}\)\([0-9]\{2\}\)/\1-\2-\3 \4:\5:\6/')
        BACKUP_SIZE=$(du -h "${BACKUPS[$i]}" | cut -f1)
        echo "  $((i+1))) $BACKUP_NAME ($BACKUP_SIZE, $BACKUP_DATE)"
    done
    
    echo
    echo -n "Select a backup to restore [1-${#BACKUPS[@]}] or 0 to cancel: "
    read BACKUP_CHOICE
    
    if [[ "$BACKUP_CHOICE" -eq 0 ]]; then
        echo "Restoration cancelled."
        press_any_key
        return
    fi
    
    if [[ "$BACKUP_CHOICE" -lt 1 || "$BACKUP_CHOICE" -gt ${#BACKUPS[@]} ]]; then
        echo -e "${RED}Invalid choice.${NC}"
        press_any_key
        return
    fi
    
    SELECTED_BACKUP="${BACKUPS[$((BACKUP_CHOICE-1))]}"
    
    echo
    echo -n "Enter the directory to restore to (e.g., ~/restored_service): "
    read RESTORE_DIR
    
    if [ -z "$RESTORE_DIR" ]; then
        echo -e "${RED}No directory specified.${NC}"
        press_any_key
        return
    fi
    
    # Expand tilde to home directory if present
    RESTORE_DIR="${RESTORE_DIR/#\~/$HOME}"
    
    echo -e "${YELLOW}Restoring backup to $RESTORE_DIR...${NC}"
    ./restore.sh --backup "$SELECTED_BACKUP" --directory "$RESTORE_DIR"
    
    echo -e "${GREEN}Restoration completed.${NC}"
    press_any_key
}

# Function to restore from a cloud backup
restore_cloud() {
    echo -e "${YELLOW}Restoring from a cloud backup...${NC}"
    
    if ! check_script "./restore.sh"; then
        echo -e "${RED}Could not find restore.sh script.${NC}"
        press_any_key
        return
    fi
    
    echo -n "Enter the directory to restore to (e.g., ~/restored_service): "
    read RESTORE_DIR
    
    if [ -z "$RESTORE_DIR" ]; then
        echo -e "${RED}No directory specified.${NC}"
        press_any_key
        return
    fi
    
    # Expand tilde to home directory if present
    RESTORE_DIR="${RESTORE_DIR/#\~/$HOME}"
    
    echo -e "${YELLOW}Restoring latest cloud backup to $RESTORE_DIR...${NC}"
    ./restore.sh --cloud --directory "$RESTORE_DIR"
    
    echo -e "${GREEN}Restoration completed.${NC}"
    press_any_key
}

# Function to fix PostgreSQL database connection
fix_database() {
    echo -e "${YELLOW}Fixing PostgreSQL database connection...${NC}"
    
    if check_script "./fix-postgres-user.sh"; then
        ./fix-postgres-user.sh
        echo -e "${GREEN}Database configuration completed.${NC}"
    else
        echo -e "${RED}Could not find fix-postgres-user.sh script.${NC}"
    fi
    
    press_any_key
}

# Function to test backup and restore
test_backup_restore() {
    echo -e "${YELLOW}Testing backup and restore process...${NC}"
    
    if ! check_script "./backup.sh" || ! check_script "./restore.sh"; then
        echo -e "${RED}Could not find required scripts.${NC}"
        press_any_key
        return
    fi
    
    # Create a test backup
    echo "1. Creating a test backup..."
    TEST_BACKUP_DIR="test_backup_$(date +%Y%m%d_%H%M%S)"
    ./backup.sh
    LATEST_BACKUP=$(find . -maxdepth 1 -name "project_backup_*.tar.gz" -type f -printf "%T@ %p\n" | sort -nr | head -n 1 | cut -d' ' -f2-)
    
    if [ -z "$LATEST_BACKUP" ]; then
        echo -e "${RED}Failed to create test backup.${NC}"
        press_any_key
        return
    fi
    
    # Create a temporary directory for restoration
    TEST_RESTORE_DIR="/tmp/test_restore_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$TEST_RESTORE_DIR"
    
    echo "2. Restoring to a test directory: $TEST_RESTORE_DIR..."
    ./restore.sh --backup "$LATEST_BACKUP" --directory "$TEST_RESTORE_DIR"
    
    echo "3. Verifying restoration..."
    # Check if critical directories and files exist
    if [ -d "$TEST_RESTORE_DIR/backend" ] && [ -d "$TEST_RESTORE_DIR/frontend" ]; then
        echo -e "${GREEN}✓ Code files restored successfully${NC}"
    else
        echo -e "${RED}✗ Code files restoration failed${NC}"
    fi
    
    if [ -f "$TEST_RESTORE_DIR/backend/.env" ]; then
        echo -e "${GREEN}✓ Environment files restored successfully${NC}"
    else
        echo -e "${RED}✗ Environment files restoration failed${NC}"
    fi
    
    echo "4. Cleaning up test directory..."
    rm -rf "$TEST_RESTORE_DIR"
    
    echo -e "${GREEN}Backup and restore test completed.${NC}"
    echo "You should periodically perform a full test by also:"
    echo "1. Installing dependencies in the restored directory"
    echo "2. Verifying the database connection"
    echo "3. Starting the application to ensure it works"
    
    press_any_key
}

# Function to view backup history
view_backup_history() {
    echo -e "${YELLOW}Backup History${NC}"
    echo "========================="
    
    # Check for local backups
    LOCAL_BACKUPS=($(find . -maxdepth 1 -name "project_backup_*.tar.gz" -type f | sort -r))
    
    echo "Local backups:"
    if [ ${#LOCAL_BACKUPS[@]} -eq 0 ]; then
        echo "  No local backups found."
    else
        for backup in "${LOCAL_BACKUPS[@]}"; do
            BACKUP_NAME=$(basename "$backup")
            BACKUP_DATE=$(echo "$BACKUP_NAME" | sed 's/project_backup_\([0-9]\{8\}\)_\([0-9]\{6\}\).tar.gz/\1 \2/' | sed 's/\([0-9]\{4\}\)\([0-9]\{2\}\)\([0-9]\{2\}\) \([0-9]\{2\}\)\([0-9]\{2\}\)\([0-9]\{2\}\)/\1-\2-\3 \4:\5:\6/')
            BACKUP_SIZE=$(du -h "$backup" | cut -f1)
            echo "  - $BACKUP_NAME ($BACKUP_SIZE, $BACKUP_DATE)"
        done
    fi
    
    echo
    
    # Check automated backup directory
    AUTOMATED_BACKUP_DIR="$HOME/service_backups"
    if [ -d "$AUTOMATED_BACKUP_DIR" ]; then
        AUTOMATED_BACKUPS=($(find "$AUTOMATED_BACKUP_DIR" -name "backup_*.tar.gz" -type f | sort -r))
        
        echo "Automated backups (in $AUTOMATED_BACKUP_DIR):"
        if [ ${#AUTOMATED_BACKUPS[@]} -eq 0 ]; then
            echo "  No automated backups found."
        else
            for backup in "${AUTOMATED_BACKUPS[@]}"; do
                BACKUP_NAME=$(basename "$backup")
                BACKUP_DATE=$(echo "$BACKUP_NAME" | sed 's/backup_\([0-9-]\+\).tar.gz/\1/')
                BACKUP_SIZE=$(du -h "$backup" | cut -f1)
                echo "  - $BACKUP_NAME ($BACKUP_SIZE, created on $BACKUP_DATE)"
            done
        fi
        
        echo
        
        # Check backup log
        BACKUP_LOG="$AUTOMATED_BACKUP_DIR/backup.log"
        if [ -f "$BACKUP_LOG" ]; then
            echo "Recent backup log entries:"
            tail -n 5 "$BACKUP_LOG"
        fi
    else
        echo "Automated backup directory not found."
        echo "Automated backups are not set up yet."
    fi
    
    echo
    
    # Check cloud backups if rclone is available
    if command -v rclone &> /dev/null; then
        CLOUD_PROVIDER="gdrive"
        CLOUD_PATH="service_backups"
        
        if rclone listremotes | grep -q "^${CLOUD_PROVIDER}:"; then
            echo "Cloud backups (in ${CLOUD_PROVIDER}:${CLOUD_PATH}):"
            if rclone ls "${CLOUD_PROVIDER}:${CLOUD_PATH}" 2>/dev/null | grep -q ".tar.gz"; then
                rclone ls "${CLOUD_PROVIDER}:${CLOUD_PATH}" | grep ".tar.gz"
            else
                echo "  No cloud backups found."
            fi
        else
            echo "Cloud storage not configured."
            echo "Run cloud-backup.sh to set up cloud storage."
        fi
    else
        echo "Cloud storage tool (rclone) not installed."
        echo "Run cloud-backup.sh to install and configure cloud storage."
    fi
    
    press_any_key
}

# Main program loop
while true; do
    show_menu
    read choice
    
    case $choice in
        1) create_backup ;;
        2) setup_automated_backups ;;
        3) upload_to_cloud ;;
        4) restore_local ;;
        5) restore_cloud ;;
        6) fix_database ;;
        7) test_backup_restore ;;
        8) view_backup_history ;;
        0) 
            echo "Exiting Backup Manager. Goodbye!"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid option. Please try again.${NC}"
            press_any_key
            ;;
    esac
done 