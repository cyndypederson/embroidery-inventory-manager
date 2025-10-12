#!/bin/bash

# Deployment Script for Embroidery Inventory Manager
# This script handles version bumping, committing, and pushing changes

echo "🚀 Starting deployment process..."

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  Warning: You have uncommitted changes"
    echo "   Please commit or stash them before deploying"
    exit 1
fi

# Run version manager
echo "📝 Updating version numbers..."
node version-manager.js

# Add all changes
echo "📦 Staging changes..."
git add .

# Get the new version from package.json
NEW_VERSION=$(node -p "require('./package.json').version")

# Commit with version bump
echo "💾 Committing changes..."
git commit -m "Release v${NEW_VERSION} - Auto version bump and cache refresh"

# Push to main branch
echo "🚀 Pushing to remote repository..."
git push origin main

echo "✅ Deployment complete!"
echo "📊 New version: ${NEW_VERSION}"
echo "🌐 Your app should be updated on Vercel in a few minutes"
echo ""
echo "💡 To force a cache refresh, users can:"
echo "   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)"
echo "   - Clear browser cache"
echo "   - Wait for automatic refresh"
