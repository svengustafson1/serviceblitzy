#!/bin/bash

# Backup script for the entire project
# This script will create a complete backup of:
# - All code files
# - PostgreSQL database
# - Environment variables
# - Configuration files

# Exit on any error
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

if [ -f .env ]; then
  cp .env "$BACKUP_DIR/environment/root.env"
fi

# Backup PostgreSQL database
echo "Backing up PostgreSQL database..."
mkdir -p "$BACKUP_DIR/database"

# Extract database connection info from environment variables
if [ -f backend/.env ]; then
  source backend/.env
fi

# Default values if not found in environment
DB_NAME=${DATABASE_NAME:-home_services}
DB_USER=${DATABASE_USER:-postgres}
DB_PASSWORD=${DATABASE_PASSWORD:-postgres}
DB_HOST=${DATABASE_HOST:-localhost}
DB_PORT=${DATABASE_PORT:-5432}

# Try to connect to the database
if pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER > /dev/null 2>&1; then
  echo "Connected to PostgreSQL, creating database backup..."
  
  # Export database schema
  echo "Exporting database schema..."
  PGPASSWORD=$DB_PASSWORD pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME --schema-only > "$BACKUP_DIR/database/schema.sql"
  
  # Export database data
  echo "Exporting database data..."
  PGPASSWORD=$DB_PASSWORD pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME --data-only > "$BACKUP_DIR/database/data.sql"
  
  # Create a full backup
  echo "Creating full database backup..."
  PGPASSWORD=$DB_PASSWORD pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME > "$BACKUP_DIR/database/full_backup.sql"
else
  echo "WARNING: Could not connect to PostgreSQL database. Database backup skipped."
  echo "Database connection error details saved to backup."
  echo "Role 'postgres' does not exist or there's a connection issue." > "$BACKUP_DIR/database/connection_error.txt"
  
  # Backup migration files instead
  echo "Backing up migration files instead..."
  if [ -d backend/src/db/migrations ]; then
    cp -r backend/src/db/migrations "$BACKUP_DIR/database/migrations"
  fi
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
2. Database backup
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
```

### 4. Restore Database

First, create the database if it doesn't exist:
```bash
createdb home_services
```

Then restore the database:
```bash
# For a full restore
psql -d home_services -f database/full_backup.sql

# OR to restore schema and data separately
psql -d home_services -f database/schema.sql
psql -d home_services -f database/data.sql
```

If the database backup was not successful, you'll need to run the migrations:
```bash
# Navigate to the backend directory
cd /path/to/destination/backend

# Run the setup script that includes migrations
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

echo "Backup completed successfully! Archive saved as ${BACKUP_DIR}.tar.gz"
echo "To restore, extract the archive and follow the instructions in RESTORE_INSTRUCTIONS.md" 