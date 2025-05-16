#!/bin/bash

# Function to check if PostgreSQL is running
check_postgres() {
    if command -v pg_isready > /dev/null; then
        if pg_isready > /dev/null 2>&1; then
            echo "PostgreSQL is running."
            return 0
        else
            echo "PostgreSQL is not running. Please start PostgreSQL."
            return 1
        fi
    else
        echo "pg_isready not found. Make sure PostgreSQL is installed."
        return 1
    fi
}

# Check if PostgreSQL is running
check_postgres || exit 1

# Check if the database exists, and create it if it doesn't
echo "Checking if 'home_services' database exists..."
if psql -l | grep -q home_services; then
    echo "Database 'home_services' already exists."
else
    echo "Creating 'home_services' database..."
    createdb home_services || { echo "Failed to create database. Check PostgreSQL permissions."; exit 1; }
fi

# Install dependencies
echo "Installing backend dependencies..."
(cd backend && npm install)

echo "Installing frontend dependencies..."
(cd frontend && npm install)

# Run database setup
echo "Setting up the database schema..."
(cd backend && npm run setup)

echo "====================================="
echo "Setup complete! To run the application:"
echo "1. In one terminal: cd backend && npm run dev"
echo "2. In another terminal: cd frontend && npm run dev"
echo "3. Open your browser to http://localhost:3000"
echo "====================================="

echo "Would you like to start the servers now? (y/n)"
read -r answer
if [[ "$answer" == "y" || "$answer" == "Y" ]]; then
    echo "Starting the backend server in a new terminal..."
    osascript -e 'tell app "Terminal" to do script "cd \"'$(pwd)'/backend\" && npm run dev"'
    
    echo "Starting the frontend server in a new terminal..."
    osascript -e 'tell app "Terminal" to do script "cd \"'$(pwd)'/frontend\" && npm run dev"'
    
    echo "Servers started! Wait a moment and then open http://localhost:3000 in your browser."
fi 