#!/bin/bash

# Embroidery Inventory Manager - Desktop Launcher
# Double-click this file to start the server

# Get the directory where this script is located
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Change to the project directory
cd "$DIR"

# Run the start script
./start-server.sh

# Keep the terminal window open so you can see the status
echo ""
echo "Press any key to close this window..."
read -n 1 -s
