#!/bin/bash

# Start the server with automatic backups every hour

echo "🚀 Starting Embroidery Server with Auto-Backup..."

# Create initial backup
echo "📦 Creating initial backup..."
node auto-backup.js

# Start the server in the background
echo "🚀 Starting server..."
node server.js &
SERVER_PID=$!

echo "✅ Server started (PID: $SERVER_PID)"
echo "🔄 Auto-backup will run every hour"
echo ""
echo "Press Ctrl+C to stop the server and backups"

# Function to run backup
run_backup() {
    echo ""
    echo "⏰ $(date '+%Y-%m-%d %H:%M:%S') - Running scheduled backup..."
    node auto-backup.js
}

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping server and backups..."
    kill $SERVER_PID 2>/dev/null
    echo "✅ Server stopped"
    exit 0
}

# Trap Ctrl+C
trap cleanup SIGINT SIGTERM

# Run backup every hour
while true; do
    sleep 3600  # 1 hour
    run_backup
done
