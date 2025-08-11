#!/bin/bash
# Environment setup script for route backend

echo "Setting up Python environment for route backend..."

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed. Please install Python 3 first."
    exit 1
fi

# Check if pip3 is installed
if ! command -v pip3 &> /dev/null; then
    echo "Error: pip3 is not installed. Please install pip3 first."
    exit 1
fi

# Install Python dependencies
echo "Installing Python dependencies..."
if [ -f "requirements.txt" ]; then
    pip3 install -r requirements.txt
    echo "Python dependencies installed successfully."
else
    echo "Error: requirements.txt not found in server directory."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f "../.env" ]; then
    echo "Creating .env file..."
    cat > ../.env << EOL
# GraphHopper API Key (get from https://www.graphhopper.com/)
GRAPHHOPPER_API_KEY=your_graphhopper_api_key_here

# Add other environment variables as needed
EOL
    echo ".env file created. Please update it with your actual API keys."
else
    echo ".env file already exists."
fi

echo "Setup complete!"



