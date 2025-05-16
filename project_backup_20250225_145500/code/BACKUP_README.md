# Project Backup Solution

This backup solution provides a comprehensive way to back up your entire project, including:

1. **All code files** - All source code is preserved, excluding large directories like `node_modules` and `.next`
2. **Database** - PostgreSQL database schema and data
3. **Environment variables** - Configuration settings from `.env` files
4. **Dependencies** - Package information to recreate the exact development environment

## How to Run the Backup

Simply execute the backup script:

```bash
chmod +x backup.sh
./backup.sh
```

The script will:
1. Create a timestamped backup directory
2. Copy all code files using rsync (excluding node_modules)
3. Back up all environment files
4. Attempt to backup the PostgreSQL database
   - If database backup fails (as it might with the current "role postgres does not exist" error), it will save the migration files instead
5. Save dependency information
6. Create restoration instructions
7. Create a compressed archive (tar.gz) of everything

## Fixing the Current Database Error

The error you're seeing: `role "postgres" does not exist` indicates that PostgreSQL is running, but the default `postgres` user doesn't exist or has a different name on your system.

To fix this:

1. Determine the correct PostgreSQL user name:
   ```bash
   psql -l
   ```
   (This will show you the user you're connecting as)

2. Update your backend/.env file with the correct user:
   ```
   DATABASE_URL=postgres://CORRECT_USERNAME:password@localhost:5432/home_services
   ```

3. If you need to create the postgres role:
   ```bash
   createuser -s postgres
   ```

4. Set a password for the postgres user:
   ```bash
   psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"
   ```

## Backup Frequency Recommendations

For this type of project, I recommend:

1. **Daily automated backups** - Set up a cron job to run the backup script daily
2. **Backup before major changes** - Run a manual backup before significant code changes
3. **Remote storage** - Copy backups to a cloud storage service for additional security

## Restoring from Backup

Each backup contains a `RESTORE_INSTRUCTIONS.md` file with detailed steps for restoration. The general process is:

1. Extract the archive
2. Copy code files to the destination
3. Restore environment variables
4. Restore the database
5. Install dependencies
6. Start the application 