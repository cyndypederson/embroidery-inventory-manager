#!/bin/bash

echo "🌐 Starting Cloudflare Tunnel for External Access"
echo "================================================"
echo ""
echo "This will create a public URL that anyone can access."
echo "The URL will work for 24 hours."
echo "Press Ctrl+C to stop the external access."
echo ""

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "❌ cloudflared not found. Installing..."
    echo ""
    
    # Download cloudflared for macOS
    curl -L --output cloudflared.pkg https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.pkg
    
    echo "📦 Installing cloudflared..."
    sudo installer -pkg cloudflared.pkg -target /
    
    # Clean up
    rm cloudflared.pkg
    
    echo "✅ cloudflared installed successfully!"
    echo ""
fi

echo "🚀 Starting tunnel..."
echo ""

# Start Cloudflare tunnel
cloudflared tunnel --url http://localhost:3000

echo ""
echo "External access stopped."
