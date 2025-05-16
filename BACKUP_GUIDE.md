# Complete Backup and Restoration Guide

This guide documents the comprehensive backup and restoration system for your service application.

## Table of Contents

1. [Overview](#overview)
2. [Manual Backup](#manual-backup)
3. [Automated Backups](#automated-backups)
4. [Cloud Backups](#cloud-backups)
5. [Database Configuration](#database-configuration)
6. [Restoration](#restoration)
7. [Testing Your Backup](#testing-your-backup)
8. [Troubleshooting](#troubleshooting)

## Overview

The backup system consists of the following components:

- **backup.sh**: The main backup script that creates comprehensive backups of:
  - All code files (excluding node_modules and build directories)
  - PostgreSQL database (schema and data)
  - Environment variables
  - Dependencies information

- **setup-automated-backups.sh**: Sets up automated daily backups via cron

- **cloud-backup.sh**: Uploads backups to cloud storage (Google Drive, Dropbox, AWS S3, etc.)

- **fix-postgres-user.sh**: Resolves the "role postgres does not exist" error by configuring PostgreSQL correctly

- **restore.sh**: Automates the restoration process from a backup

## Manual Backup

To create a backup manually:

```bash
# Make sure the script is executable
chmod +x backup.sh

# Run the backup
./backup.sh
```

This will create a timestamped backup archive (e.g., `project_backup_20250225_150158.tar.gz`) in the current directory.

The backup contains:
- All code files (in the `code/` directory)
- Database backup (in the `database/` directory)
- Environment files (in the `environment/` directory)
- Dependency information (in the `dependencies/` directory)
- Restoration instructions (in `RESTORE_INSTRUCTIONS.md`)

## Automated Backups

To set up automated daily backups:

```bash
# Make sure the script is executable
chmod +x setup-automated-backups.sh

# Run the setup script
./setup-automated-backups.sh
```

This will:
1. Create a backup directory at `~/service_backups/`
2. Set up a cron job to run backups daily at 2:00 AM
3. Keep only the last 7 days of backups to save disk space

To view the configured cron jobs:
```bash
crontab -l
```

To modify the cron job (e.g., to change the time or frequency):
```bash
crontab -e
```

## Cloud Backups

To upload your backups to cloud storage:

```bash
# Make sure the script is executable
chmod +x cloud-backup.sh

# Run the cloud backup script
./cloud-backup.sh
```

The first time you run this script, it will:
1. Check if `rclone` is installed (and install it if needed)
2. Guide you through the configuration of your chosen cloud provider
3. Upload all backups from `~/service_backups/` to the cloud

Supported cloud providers:
- Google Drive (`gdrive`)
- Dropbox (`dropbox`)
- Amazon S3 (`s3`)
- Microsoft OneDrive (`onedrive`)
- And many others supported by `rclone`

To change the cloud provider, edit the `CLOUD_PROVIDER` variable in `cloud-backup.sh`.

To automatically upload backups to the cloud after each scheduled backup, the script will provide instructions for modifying your automated backup configuration.

## Database Configuration

If you're seeing the error `role "postgres" does not exist`, you can fix it by running:

```bash
# Make sure the script is executable
chmod +x fix-postgres-user.sh

# Run the PostgreSQL configuration script
./fix-postgres-user.sh
```

This script will:
1. Check if PostgreSQL is installed and running
2. Find a working PostgreSQL user
3. Create the `postgres` role if it doesn't exist
4. Set a password for the PostgreSQL user
5. Create the `home_services` database if it doesn't exist
6. Update your `backend/.env` file with the correct DATABASE_URL

## Restoration

To restore from a backup:

```bash
# Make sure the script is executable
chmod +x restore.sh

# Restore from a local backup
./restore.sh --backup project_backup_20250225_150158.tar.gz --directory ~/restored_service

# Or restore from the latest cloud backup
./restore.sh --cloud --directory ~/restored_service
```

The restoration script will:
1. Extract the backup archive
2. Copy all code files to the destination directory
3. Restore environment variables
4. Attempt to restore the database
5. Provide instructions for next steps

After restoration, you may need to:
1. Install dependencies
2. Configure the database (if it wasn't restored automatically)
3. Start the application

## Testing Your Backup

It's important to regularly test your backup and restoration process. Here's how:

```bash
# Create a backup
./backup.sh

# Try restoring it to a different directory
./restore.sh --backup project_backup_TIMESTAMP.tar.gz --directory ~/test_restore

# Check if the restored application works
cd ~/test_restore/backend
npm install
npm run dev

# In another terminal
cd ~/test_restore/frontend
npm install
npm run dev
```

## Troubleshooting

### Database Connection Issues

If you see the error `role "postgres" does not exist`:

1. Run the fix-postgres-user.sh script:
   ```bash
   ./fix-postgres-user.sh
   ```

2. Manually find your PostgreSQL username:
   ```bash
   psql -c "\du"
   ```

3. Update your connection string:
   ```
   DATABASE_URL=postgres://YOUR_USERNAME:password@localhost:5432/home_services
   ```

### Automated Backup Issues

If automated backups aren't running:

1. Check if the cron job is properly set up:
   ```bash
   crontab -l | grep backup
   ```

2. Check the backup log:
   ```bash
   cat ~/service_backups/backup.log
   ```

3. Run the backup manually to see if there are any errors:
   ```bash
   ~/service_backups/run_backup.sh
   ```

### Cloud Backup Issues

If cloud backups aren't working:

1. Check if rclone is installed:
   ```bash
   rclone --version
   ```

2. Verify your cloud configuration:
   ```bash
   rclone listremotes
   ```

3. Test connectivity to your cloud provider:
   ```bash
   rclone lsd gdrive:
   ```

4. Reconfigure your cloud provider:
   ```bash
   rclone config
   ``` 