#!/bin/bash

# Function to display help message
show_help() {
    echo "Usage: ./dev.sh [options]"
    echo ""
    echo "Options:"
    echo "  --help, -h       Display this help message"
    echo "  --migrate, -m    Run database migrations before starting servers"
    echo ""
}

# Process command line arguments
RUN_MIGRATIONS=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --help|-h)
            show_help
            exit 0
            ;;
        --migrate|-m)
            RUN_MIGRATIONS=true
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
    shift
done

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

# Check if the database exists
echo "Checking if 'home_services' database exists..."
if ! psql -l | grep -q home_services; then
    echo "Database 'home_services' doesn't exist. Please run ./setup-and-run.sh first."
    exit 1
fi

# Run migrations if requested
if [ "$RUN_MIGRATIONS" = true ]; then
    echo "Running database migrations..."
    cd backend && node migrate.js
    if [ $? -ne 0 ]; then
        echo "Migration failed. Exiting."
        exit 1
    fi
    cd ..
    echo "Migrations completed successfully."
fi

# Kill any processes running on ports 5000-5010 and 3000-3010
echo "Ensuring ports are available..."
for port in $(seq 5000 5010) $(seq 3000 3010); do
    lsof -ti:$port | xargs kill -9 2>/dev/null
done

# Start the servers
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    echo "Starting the backend server in a new terminal..."
    osascript -e 'tell app "Terminal" to do script "cd \"'$(pwd)'/backend\" && npm run dev"'
    
    echo "Starting the frontend server in a new terminal..."
    osascript -e 'tell app "Terminal" to do script "cd \"'$(pwd)'/frontend\" && npm run dev"'
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    echo "Starting the backend server..."
    gnome-terminal -- bash -c "cd \"$(pwd)/backend\" && npm run dev; exec bash" || 
    xterm -e "cd \"$(pwd)/backend\" && npm run dev" || 
    konsole -e "cd \"$(pwd)/backend\" && npm run dev" || 
    { echo "Could not open a new terminal window. Please open two terminal windows manually."; exit 1; }
    
    echo "Starting the frontend server..."
    gnome-terminal -- bash -c "cd \"$(pwd)/frontend\" && npm run dev; exec bash" || 
    xterm -e "cd \"$(pwd)/frontend\" && npm run dev" || 
    konsole -e "cd \"$(pwd)/frontend\" && npm run dev" || 
    { echo "Could not open a new terminal window. Please open two terminal windows manually."; exit 1; }
else
    # Windows or other OS
    echo "Unsupported OS for automatic terminal launching."
    echo "Please open two terminal windows and run these commands manually:"
    echo "1. cd backend && npm run dev"
    echo "2. cd frontend && npm run dev"
    exit 1
fi

echo "Servers started! Wait a moment and then open http://localhost:3000 in your browser." 