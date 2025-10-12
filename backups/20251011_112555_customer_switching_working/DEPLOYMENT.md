# 🚀 Deployment Guide

This guide explains how to deploy updates to the Embroidery Inventory Manager and prevent caching issues.

## 📋 Quick Deployment

### Option 1: Full Deployment (Recommended)
```bash
npm run deploy
```
This will:
- ✅ Automatically bump the version number
- ✅ Update all cache-busting parameters
- ✅ Commit changes with version info
- ✅ Push to remote repository
- ✅ Trigger Vercel deployment

### Option 2: Version Bump Only
```bash
npm run version:bump
```
This will:
- ✅ Update version numbers only
- ⚠️ You need to manually commit and push

## 🔧 Manual Deployment Steps

If you prefer to deploy manually:

1. **Update version numbers:**
   ```bash
   node version-manager.js
   ```

2. **Commit changes:**
   ```bash
   git add .
   git commit -m "Release vX.X.X - Your changes here"
   ```

3. **Push to remote:**
   ```bash
   git push origin main
   ```

## 🛡️ Cache Prevention Strategies

### 1. **Automatic Version Management**
- Version numbers are automatically incremented
- Cache-busting parameters (`?v=X.X.X`) are updated
- All files stay in sync

### 2. **Server Cache Headers**
- HTML files: No cache (always fresh)
- Static assets: 1-hour cache (good balance)
- API routes: No cache (always fresh)

### 3. **Browser Cache Busting**
- CSS: `styles.css?v=X.X.X`
- JS: `script.js?v=X.X.X`
- Version numbers in JavaScript code

## 🔍 Troubleshooting Cache Issues

### If users still see old version:

1. **Hard Refresh:**
   - Windows: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

2. **Clear Browser Cache:**
   - Open DevTools (F12)
   - Right-click refresh button
   - Select "Empty Cache and Hard Reload"

3. **Wait for Auto-Refresh:**
   - New version loads automatically within 5-10 minutes

### If deployment seems stuck:

1. **Check Vercel Dashboard:**
   - Look for deployment status
   - Check for build errors

2. **Verify Git Push:**
   ```bash
   git log --oneline -5
   git status
   ```

3. **Force Vercel Redeploy:**
   - Go to Vercel dashboard
   - Click "Redeploy" on latest deployment

## 📊 Version History

- **v2.7.0** - Cache busting improvements, desktop filter layout fixes
- **v2.6.0** - Touch event optimizations, form validation fixes
- **v2.5.0** - Mobile OCR improvements, deployment fixes

## 💡 Best Practices

1. **Always use `npm run deploy`** for releases
2. **Test locally first** before deploying
3. **Check Vercel dashboard** after deployment
4. **Inform users** about major updates
5. **Keep version numbers meaningful** (patch for fixes, minor for features)

## 🆘 Need Help?

If you encounter issues:
1. Check the console for errors
2. Verify all files are committed
3. Check Vercel deployment logs
4. Try a hard refresh after 5 minutes
