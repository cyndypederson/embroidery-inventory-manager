#!/bin/bash

echo "🌐 Starting External Access for Embroidery Inventory Manager"
echo "=========================================================="
echo ""
echo "This will create a public URL that anyone can access."
echo "Press Ctrl+C to stop the external access."
echo ""

# Start ngrok tunnel
./ngrok http 3000

echo ""
echo "External access stopped."
