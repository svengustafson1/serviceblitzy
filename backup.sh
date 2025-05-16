#!/bin/bash

# Backup script for the entire project
# This script will create a complete backup of:
# - All code files
# - PostgreSQL database
# - Environment variables
# - Configuration files

# Exit on any error (except for database errors which we handle)
set -e

# Create backup directory with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="project_backup_$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

echo "Creating backup in $BACKUP_DIR..."

# Backup all code files
echo "Backing up code files..."
rsync -av --exclude="node_modules" --exclude=".next" --exclude=".git" --exclude="$BACKUP_DIR" ./ "$BACKUP_DIR/code/"

# Create a directory for environment files
mkdir -p "$BACKUP_DIR/environment"

# Backup environment files
echo "Backing up environment files..."
if [ -f backend/.env ]; then
  cp backend/.env "$BACKUP_DIR/environment/backend.env"
fi

if [ -f frontend/.env ]; then
  cp frontend/.env "$BACKUP_DIR/environment/frontend.env"
fi

if [ -f frontend/.env.local ]; then
  cp frontend/.env.local "$BACKUP_DIR/environment/frontend.env.local"
fi

if [ -f .env ]; then
  cp .env "$BACKUP_DIR/environment/root.env"
fi

# Backup PostgreSQL database
echo "Backing up PostgreSQL database..."
mkdir -p "$BACKUP_DIR/database"

# Extract database connection info from .env file
DB_URL=""
if [ -f backend/.env ]; then
  # Extract DATABASE_URL if it exists
  DB_URL=$(grep DATABASE_URL backend/.env | cut -d '=' -f2-)
  echo "Found DATABASE_URL: $DB_URL"
  
  # Log this for reference
  echo "DATABASE_URL=$DB_URL" > "$BACKUP_DIR/database/db_connection_info.txt"
fi

# Backup database schema files unconditionally
echo "Backing up database migration files..."
if [ -d backend/src/db/migrations ]; then
  cp -r backend/src/db/migrations "$BACKUP_DIR/database/migrations"
  echo "✓ Migration files backed up successfully"
fi

# Try to backup the database itself (this might fail, but we'll handle that)
echo "Attempting PostgreSQL database backup (this may fail if database connection issues exist)..."

# Detect the current PostgreSQL user (the one running the script)
CURRENT_USER=$(whoami)
echo "Current system user: $CURRENT_USER"

# First try with postgres user (common default)
if pg_dump -U postgres -d home_services > "$BACKUP_DIR/database/full_backup.sql" 2>/dev/null; then
  echo "✓ Database backup successful using postgres user"
elif pg_dump -U $CURRENT_USER -d home_services > "$BACKUP_DIR/database/full_backup.sql" 2>/dev/null; then
  echo "✓ Database backup successful using current user ($CURRENT_USER)"
else
  echo "⚠️ Database backup failed - this is expected based on the 'role postgres does not exist' error"
  echo "Database connection error details saved to backup."
  echo "Role 'postgres' does not exist or there's a connection issue." > "$BACKUP_DIR/database/connection_error.txt"
  
  # Add troubleshooting info
  cat > "$BACKUP_DIR/database/db_troubleshooting.md" << 'EOT'
# Database Connection Troubleshooting

The database backup failed during the backup process. Here's how to fix it:

## Check your PostgreSQL installation:

1. Verify PostgreSQL is running:
   ```
   pg_isready
   ```

2. Find your current PostgreSQL user:
   ```
   psql -c "\du"
   ```

3. Update your connection string:
   Edit `backend/.env` and update the DATABASE_URL with your actual PostgreSQL username:
   ```
   DATABASE_URL=postgres://YOUR_USERNAME:password@localhost:5432/home_services
   ```

4. If needed, create the postgres role:
   ```
   createuser -s postgres
   ```

5. Create the database if it doesn't exist:
   ```
   createdb home_services
   ```

Database schema has been preserved in the migration files in this backup.
EOT
fi

# Backup package.json files to record dependencies
echo "Backing up dependency information..."
mkdir -p "$BACKUP_DIR/dependencies"
if [ -f backend/package.json ]; then
  cp backend/package.json "$BACKUP_DIR/dependencies/backend-package.json"
fi
if [ -f backend/package-lock.json ]; then
  cp backend/package-lock.json "$BACKUP_DIR/dependencies/backend-package-lock.json"
fi
if [ -f frontend/package.json ]; then
  cp frontend/package.json "$BACKUP_DIR/dependencies/frontend-package.json"
fi
if [ -f frontend/package-lock.json ]; then
  cp frontend/package-lock.json "$BACKUP_DIR/dependencies/frontend-package-lock.json"
fi

# Create a README with restoration instructions
echo "Creating restoration instructions..."
cat > "$BACKUP_DIR/RESTORE_INSTRUCTIONS.md" << 'EOF'
# Backup Restoration Instructions

This backup contains the following components:
1. Code files
2. Database backup (if successful) or migration files
3. Environment files
4. Dependency information

## Restoration Steps

### 1. Restore Code Files
```bash
# Copy the code files to your desired location
cp -r code/* /path/to/destination/
```

### 2. Install Dependencies
```bash
# For backend
cd /path/to/destination/backend
npm install

# For frontend
cd /path/to/destination/frontend
npm install
```

### 3. Restore Environment Variables
```bash
# Copy environment files
cp environment/backend.env /path/to/destination/backend/.env
cp environment/frontend.env /path/to/destination/frontend/.env
[ -f environment/frontend.env.local ] && cp environment/frontend.env.local /path/to/destination/frontend/.env.local
```

### 4. Restore Database

First, create the database if it doesn't exist:
```bash
createdb home_services
```

If the database backup was successful:
```bash
# Full restore
psql -d home_services -f database/full_backup.sql
```

If the database backup was not successful, you'll need to run the migrations:
```bash
# Navigate to the backend directory
cd /path/to/destination/backend

# Run migrations from the backed up files
for f in path/to/backup/database/migrations/*.sql; do
  psql -d home_services -f "$f"
done

# Or run the setup script that includes migrations
npm run db:setup
```

### 5. Start the Application
```bash
# Start backend
cd /path/to/destination/backend
npm run dev

# Start frontend
cd /path/to/destination/frontend
npm run dev
```
EOF

# Create a compressed archive
echo "Creating compressed archive..."
tar -czf "${BACKUP_DIR}.tar.gz" "$BACKUP_DIR"

# Clean up the uncompressed directory
rm -rf "$BACKUP_DIR"

echo "✅ Backup completed successfully! Archive saved as ${BACKUP_DIR}.tar.gz"
echo "To restore, extract the archive and follow the instructions in RESTORE_INSTRUCTIONS.md" 