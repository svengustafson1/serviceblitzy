#!/bin/bash

# Setup automated backups script
# This script will configure a cron job to run daily backups

# Directory where backups will be stored
BACKUP_DIR="$HOME/service_backups"

# Create the backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Copy the backup script to the backup directory
cp backup.sh "$BACKUP_DIR/backup.sh"
chmod +x "$BACKUP_DIR/backup.sh"

# Create a wrapper script to run backups with the correct path
cat > "$BACKUP_DIR/run_backup.sh" << 'EOF'
#!/bin/bash

# Change to the project directory
cd "$(dirname "$0")/../service"

# Get the current date
DATE=$(date +"%Y-%m-%d")

# Run the backup script
./backup.sh

# Move the backup to the backup directory
mv project_backup_*.tar.gz "$HOME/service_backups/backup_$DATE.tar.gz"

# Keep only the last 7 backups (1 week)
cd "$HOME/service_backups"
ls -t backup_*.tar.gz | tail -n +8 | xargs rm -f 2>/dev/null

# Log completion
echo "$(date): Backup completed" >> "$HOME/service_backups/backup.log"
EOF

chmod +x "$BACKUP_DIR/run_backup.sh"

# Schedule the backup with cron (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * $BACKUP_DIR/run_backup.sh") | crontab -

echo "✅ Automated daily backups have been set up!"
echo "Backups will run daily at 2:00 AM and be stored in $BACKUP_DIR"
echo "Only the last 7 backups will be kept to save disk space"
echo ""
echo "To modify this schedule, type: crontab -e"
echo "To view the cron jobs, type: crontab -l" 