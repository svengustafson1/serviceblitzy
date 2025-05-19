#!/bin/bash

# Function to display help message
show_help() {
    echo "Usage: ./dev.sh [options]"
    echo ""
    echo "Options:"
    echo "  --help, -h       Display this help message"
    echo "  --migrate, -m    Run database migrations before starting servers"
    echo "  --websocket, -w  Start the WebSocket server (default: enabled)"
    echo "  --s3, -s         Start the S3 emulator for local file storage (default: enabled)"
    echo ""
}

# Process command line arguments
RUN_MIGRATIONS=false
START_WEBSOCKET=true
START_S3=true

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --help|-h)
            show_help
            exit 0
            ;;
        --migrate|-m)
            RUN_MIGRATIONS=true
            ;;
        --websocket|-w)
            if [[ "$2" == "false" ]]; then
                START_WEBSOCKET=false
                shift
            else
                START_WEBSOCKET=true
            fi
            ;;
        --s3|-s)
            if [[ "$2" == "false" ]]; then
                START_S3=false
                shift
            else
                START_S3=true
            fi
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

# Function to check AWS configuration
check_aws_config() {
    if [ "$START_S3" = true ]; then
        echo "Checking AWS configuration..."
        if ! command -v aws > /dev/null; then
            echo "AWS CLI not found. S3 emulator may not work properly."
            echo "Consider installing AWS CLI with: pip install awscli"
        fi
        
        # Check for AWS credentials
        if [ ! -f "$HOME/.aws/credentials" ] && [ -z "$AWS_ACCESS_KEY_ID" ] && [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
            echo "Warning: AWS credentials not found. S3 emulator will use default credentials."
            echo "For production, configure AWS credentials with: aws configure"
        else
            echo "AWS credentials found."
        fi
    fi
}

# Check if PostgreSQL is running
check_postgres || exit 1

# Check AWS configuration
check_aws_config

# Check if the database exists
echo "Checking if 'home_services' database exists..."
if ! psql -l | grep -q home_services; then
    echo "Database 'home_services' doesn't exist. Please run ./setup-and-run.sh first."
    exit 1
}

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

# Kill any processes running on ports 5000-5010, 3000-3010, and 4000
echo "Ensuring ports are available..."
for port in $(seq 5000 5010) $(seq 3000 3010) 4000; do
    lsof -ti:$port | xargs kill -9 2>/dev/null
done

# Start the S3 emulator if enabled
if [ "$START_S3" = true ]; then
    echo "Starting the S3 emulator..."
    if [ -f "./s3-emulator.sh" ]; then
        chmod +x ./s3-emulator.sh
    else
        echo "Warning: s3-emulator.sh not found. S3 emulation will not be available."
        START_S3=false
    fi
fi

# Start the servers
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    echo "Starting the backend server in a new terminal..."
    osascript -e 'tell app "Terminal" to do script "cd \"'$(pwd)'/backend\" && npm run dev"'
    
    echo "Starting the frontend server in a new terminal..."
    osascript -e 'tell app "Terminal" to do script "cd \"'$(pwd)'/frontend\" && npm run dev"'
    
    if [ "$START_WEBSOCKET" = true ]; then
        echo "Starting the WebSocket server in a new terminal..."
        osascript -e 'tell app "Terminal" to do script "cd \"'$(pwd)'/backend\" && npm run websocket"'
    fi
    
    if [ "$START_S3" = true ]; then
        echo "Starting the S3 emulator in a new terminal..."
        osascript -e 'tell app "Terminal" to do script "cd \"'$(pwd)'\" && ./s3-emulator.sh"'
    fi
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    echo "Starting the backend server..."
    gnome-terminal -- bash -c "cd \"$(pwd)/backend\" && npm run dev; exec bash" || 
    xterm -e "cd \"$(pwd)/backend\" && npm run dev" || 
    konsole -e "cd \"$(pwd)/backend\" && npm run dev" || 
    { echo "Could not open a new terminal window. Please open terminal windows manually."; exit 1; }
    
    echo "Starting the frontend server..."
    gnome-terminal -- bash -c "cd \"$(pwd)/frontend\" && npm run dev; exec bash" || 
    xterm -e "cd \"$(pwd)/frontend\" && npm run dev" || 
    konsole -e "cd \"$(pwd)/frontend\" && npm run dev" || 
    { echo "Could not open a new terminal window. Please open terminal windows manually."; exit 1; }
    
    if [ "$START_WEBSOCKET" = true ]; then
        echo "Starting the WebSocket server..."
        gnome-terminal -- bash -c "cd \"$(pwd)/backend\" && npm run websocket; exec bash" || 
        xterm -e "cd \"$(pwd)/backend\" && npm run websocket" || 
        konsole -e "cd \"$(pwd)/backend\" && npm run websocket" || 
        { echo "Could not open a new terminal window. Please start the WebSocket server manually."; }
    fi
    
    if [ "$START_S3" = true ]; then
        echo "Starting the S3 emulator..."
        gnome-terminal -- bash -c "cd \"$(pwd)\" && ./s3-emulator.sh; exec bash" || 
        xterm -e "cd \"$(pwd)\" && ./s3-emulator.sh" || 
        konsole -e "cd \"$(pwd)\" && ./s3-emulator.sh" || 
        { echo "Could not open a new terminal window. Please start the S3 emulator manually."; }
    fi
else
    # Windows or other OS
    echo "Unsupported OS for automatic terminal launching."
    echo "Please open terminal windows and run these commands manually:"
    echo "1. cd backend && npm run dev"
    echo "2. cd frontend && npm run dev"
    if [ "$START_WEBSOCKET" = true ]; then
        echo "3. cd backend && npm run websocket"
    fi
    if [ "$START_S3" = true ]; then
        echo "4. ./s3-emulator.sh"
    fi
    exit 1
fi

echo "Servers started! Wait a moment and then open http://localhost:3000 in your browser."
if [ "$START_WEBSOCKET" = true ]; then
    echo "WebSocket server running on port 4000."
fi
if [ "$START_S3" = true ]; then
    echo "S3 emulator running. Files will be stored locally."
fi