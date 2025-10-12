#!/bin/bash

# Embroidery Inventory Manager - Server Startup Script
# This script starts the server using PM2 for persistent operation

echo "🎨 Starting Embroidery Inventory Manager Server..."

# Navigate to the project directory
cd "$(dirname "$0")"

# Check if PM2 is installed
if ! command -v npx pm2 &> /dev/null; then
    echo "❌ PM2 not found. Installing PM2..."
    npm install pm2
fi

# Start the server with PM2
echo "🚀 Starting server with PM2..."
npx pm2 start ecosystem.config.js

# Save PM2 configuration so it persists across reboots
npx pm2 save

# Set up PM2 to start on system boot
npx pm2 startup

echo "✅ Server started successfully!"
echo "📊 Server Status:"
npx pm2 status

echo ""
echo "🌐 Your server is now running at:"
echo "   http://localhost:3002"
echo ""
echo "📝 Useful commands:"
echo "   View logs:     npx pm2 logs embroidery-inventory"
echo "   Stop server:   npx pm2 stop embroidery-inventory"
echo "   Restart:       npx pm2 restart embroidery-inventory"
echo "   View status:   npx pm2 status"
echo ""
echo "🔄 The server will automatically restart if it crashes"
echo "🔄 The server will start automatically when your computer boots up"
