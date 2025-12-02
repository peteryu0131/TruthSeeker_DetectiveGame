#!/bin/bash

echo "Starting Truth Seeker backend server..."
echo ""

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
    echo "Dependencies not found, installing dependencies..."
    echo ""
    npm install
    echo ""
    echo "Dependencies installed successfully!"
    echo ""
fi

# Start backend server (in new terminal window)
osascript -e 'tell application "Terminal" to do script "cd \"'"$(pwd)"'\" && npm run server"'

echo ""
echo "Backend server started!"
echo "Backend server: http://localhost:3000"
echo ""
echo "Press any key to close this window (server will continue running)..."
read -n 1 -s

