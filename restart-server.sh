#!/bin/bash

# Embroidery Inventory Manager - Server Restart Script

echo "🔄 Restarting Embroidery Inventory Manager Server..."

# Navigate to the project directory
cd "$(dirname "$0")"

# Restart the server
npx pm2 restart embroidery-inventory

echo "✅ Server restarted successfully!"
echo "📊 Server Status:"
npx pm2 status

echo ""
echo "🌐 Your server is running at:"
echo "   http://localhost:3000"
