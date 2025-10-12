#!/bin/bash

echo "💾 Creating manual backup..."
node auto-backup.js
echo "✅ Backup complete!"
echo ""
echo "To view your backups:"
echo "  ls -lt backups/ | head -20"
