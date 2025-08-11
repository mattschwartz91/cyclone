#!/bin/bash
# Development server startup script

echo "Setting up development environment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: No package.json found. Please run this script from the project root directory."
    exit 1
fi

# Install Node.js dependencies if node_modules doesn't exist
if [ ! -d "client/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd client && npm install && cd ..
fi

# Install server Node.js dependencies if node_modules doesn't exist
if [ ! -d "server/node_modules" ]; then
    echo "Installing backend dependencies..."
    cd server && npm install && cd ..
fi

# Install Python dependencies for OSM routing if requirements.txt exists
if [ -f "server/requirements.txt" ]; then
    echo "Setting up Python environment..."
    cd server && ./setup_env.sh && cd ..
else
    echo "No Python requirements.txt found, skipping Python setup"
fi

# Run setup script to validate environment and prepare OSM graphs
echo "Running setup validation..."
cd server && node setup.js && cd ..

# Start the frontend development server
echo "Starting frontend development server..."
cd client && npm run dev
