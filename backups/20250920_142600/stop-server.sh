#!/bin/bash

# Embroidery Inventory Manager - Server Stop Script

echo "🛑 Stopping Embroidery Inventory Manager Server..."

# Navigate to the project directory
cd "$(dirname "$0")"

# Stop the server
npx pm2 stop embroidery-inventory

echo "✅ Server stopped successfully!"
echo "📊 Current PM2 Status:"
npx pm2 status
