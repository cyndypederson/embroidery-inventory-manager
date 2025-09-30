#!/bin/bash

# Embroidery Inventory Manager - Server Status Script

echo "📊 Embroidery Inventory Manager Server Status"
echo "============================================="

# Navigate to the project directory
cd "$(dirname "$0")"

# Show PM2 status
npx pm2 status

echo ""
echo "📝 Recent logs:"
echo "==============="
npx pm2 logs embroidery-inventory --lines 10

echo ""
echo "🔧 Available commands:"
echo "   Start server:   ./start-server.sh"
echo "   Stop server:    ./stop-server.sh"
echo "   Restart server: ./restart-server.sh"
echo "   View all logs:  npx pm2 logs embroidery-inventory"
echo "   Monitor:        npx pm2 monit"
