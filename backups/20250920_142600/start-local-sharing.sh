#!/bin/bash

echo "🏠 Starting Local Network Sharing"
echo "================================="
echo ""
echo "This will make your app accessible to anyone on your WiFi network."
echo "No internet required - works completely offline!"
echo ""

# Get the local IP address
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')

if [ -z "$LOCAL_IP" ]; then
    echo "❌ Could not find local IP address"
    echo "Please check your network connection"
    exit 1
fi

echo "🌐 Your app will be accessible at:"
echo "   http://$LOCAL_IP:3000"
echo ""
echo "📱 Share this URL with anyone on your WiFi network:"
echo "   - Family members"
echo "   - Friends visiting"
echo "   - Customers in your shop"
echo "   - Anyone on the same WiFi"
echo ""
echo "🔒 Security: Only people on your WiFi can access this"
echo ""
echo "Press Ctrl+C to stop sharing"
echo ""

# Start the server
npm start
