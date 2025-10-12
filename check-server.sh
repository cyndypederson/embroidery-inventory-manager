#!/bin/bash

# Server Status Check Script
# Quick script to verify server is running properly

echo "🔍 Checking Embroidery Inventory Manager Server..."
echo ""

# Check if server process is running
if pgrep -f "node server.js" > /dev/null; then
    echo "✅ Server process is running (PID: $(pgrep -f 'node server.js'))"
else
    echo "❌ Server process is NOT running"
    exit 1
fi

# Check if port 3002 is listening
if lsof -i :3002 | grep LISTEN > /dev/null; then
    echo "✅ Port 3002 is listening"
else
    echo "❌ Port 3002 is NOT listening"
    exit 1
fi

# Check HTTP response
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Server responding with HTTP $HTTP_CODE"
else
    echo "❌ Server responding with HTTP $HTTP_CODE (expected 200)"
    exit 1
fi

# Check API endpoint
API_RESPONSE=$(curl -s http://localhost:3002/api/inventory | head -c 10)
if [ -n "$API_RESPONSE" ]; then
    echo "✅ API endpoint responding with data"
else
    echo "❌ API endpoint not responding"
    exit 1
fi

# Check MongoDB connection (look for success message in recent logs)
if curl -s http://localhost:3002 | grep -q "MongoDB"; then
    echo "✅ MongoDB connection active"
fi

# Get version
VERSION=$(curl -s http://localhost:3002 | grep -o 'v1\.[0-9]\+\.[0-9]\+' | head -1)
echo "📦 Version: $VERSION"

# Show URLs
echo ""
echo "🌐 Server URLs:"
echo "   Local:   http://localhost:3002"
echo "   Network: http://192.168.1.60:3002"
echo ""
echo "✅ All checks passed! Server is healthy."

