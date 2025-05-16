#!/bin/bash

# Script to fix the PostgreSQL user issue
# This will create the 'postgres' role if it doesn't exist

# Set terminal colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "PostgreSQL User Configuration Tool"
echo "=================================="
echo

# Check if PostgreSQL is installed and running
if ! command -v psql &> /dev/null; then
    echo -e "${RED}PostgreSQL is not installed or not in your PATH.${NC}"
    echo "Please install PostgreSQL first."
    exit 1
fi

if ! pg_isready &> /dev/null; then
    echo -e "${RED}PostgreSQL server is not running.${NC}"
    echo "Please start PostgreSQL service first."
    exit 1
fi

# Find current PostgreSQL user
echo -e "${YELLOW}Checking current PostgreSQL user...${NC}"
CURRENT_USER=$(whoami)
echo "Current system user: $CURRENT_USER"

# Try to connect to PostgreSQL
if psql -c "SELECT 1" &> /dev/null; then
    echo -e "${GREEN}Successfully connected to PostgreSQL with current user ($CURRENT_USER).${NC}"
    WORKING_USER=$CURRENT_USER
else
    echo -e "${YELLOW}Could not connect with current user. Checking other users...${NC}"
    WORKING_USER=""
fi

# Check if postgres user exists
if psql -U postgres -c "SELECT 1" &> /dev/null; then
    echo -e "${GREEN}Successfully connected to PostgreSQL with 'postgres' user.${NC}"
    WORKING_USER="postgres"
else
    echo -e "${YELLOW}Could not connect with 'postgres' user.${NC}"
fi

# If no working user found, we need to create one
if [ -z "$WORKING_USER" ]; then
    echo -e "${YELLOW}No working PostgreSQL user found. We need to create one.${NC}"
    
    # Try to create the postgres role using the current user
    echo "Attempting to create 'postgres' role..."
    if createuser -s postgres 2>/dev/null; then
        echo -e "${GREEN}Successfully created 'postgres' role.${NC}"
        WORKING_USER="postgres"
    else
        echo -e "${RED}Failed to create 'postgres' role.${NC}"
        echo "You may need superuser privileges. Try:"
        echo "  sudo createuser -s postgres"
        exit 1
    fi
fi

# Set password for the working user if it's postgres
if [ "$WORKING_USER" == "postgres" ]; then
    echo "Setting password for 'postgres' user..."
    if psql -U $WORKING_USER -c "ALTER USER postgres WITH PASSWORD 'postgres';" &> /dev/null; then
        echo -e "${GREEN}Successfully set password for 'postgres' user.${NC}"
    else
        echo -e "${YELLOW}Could not set password. You can try manually with:${NC}"
        echo "  psql -c \"ALTER USER postgres WITH PASSWORD 'postgres';\""
    fi
fi

# Create home_services database if it doesn't exist
echo "Checking if 'home_services' database exists..."
if ! psql -U $WORKING_USER -lqt | cut -d \| -f 1 | grep -qw home_services; then
    echo "Creating 'home_services' database..."
    if createdb -U $WORKING_USER home_services; then
        echo -e "${GREEN}Successfully created 'home_services' database.${NC}"
    else
        echo -e "${RED}Failed to create database.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}'home_services' database already exists.${NC}"
fi

# Update .env file
if [ -f backend/.env ]; then
    echo "Updating DATABASE_URL in backend/.env..."
    # Save original file
    cp backend/.env backend/.env.bak
    
    # Update the DATABASE_URL
    sed -i.bak "s|DATABASE_URL=postgres://.*@localhost|DATABASE_URL=postgres://$WORKING_USER:postgres@localhost|g" backend/.env
    
    echo -e "${GREEN}Updated DATABASE_URL in backend/.env to use user '$WORKING_USER'.${NC}"
    echo "Original file backed up as backend/.env.bak"
else
    echo -e "${YELLOW}Could not find backend/.env file. Please update your DATABASE_URL manually:${NC}"
    echo "DATABASE_URL=postgres://$WORKING_USER:postgres@localhost:5432/home_services"
fi

echo
echo -e "${GREEN}=================================${NC}"
echo -e "${GREEN}PostgreSQL configuration complete!${NC}"
echo "Working user: $WORKING_USER"
echo "Database: home_services"
echo
echo "Your application should now be able to connect to PostgreSQL."
echo "Try running your application again with:"
echo "  cd backend && npm run dev" 