# 🚀 Railway Deployment Guide

Follow these steps to deploy your Embroidery Inventory Manager to Railway for external access.

## Step 1: Create GitHub Repository

### Option A: Using GitHub Website (Easiest)
1. Go to [github.com](https://github.com) and sign in
2. Click the **"+"** button in the top right
3. Select **"New repository"**
4. Repository name: `embroidery-inventory-manager`
5. Description: `Professional embroidery inventory management system`
6. Make it **Public** (required for free Railway)
7. **Don't** initialize with README (we already have files)
8. Click **"Create repository"**

### Option B: Using Command Line
```bash
# Create repository on GitHub (you'll need GitHub CLI installed)
gh repo create embroidery-inventory-manager --public --description "Professional embroidery inventory management system"

# Push your code
git remote add origin https://github.com/YOUR_USERNAME/embroidery-inventory-manager.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy to Railway

1. Go to [railway.app](https://railway.app)
2. Click **"Start a New Project"**
3. Click **"Deploy from GitHub repo"**
4. Sign in with GitHub if prompted
5. Find and select your `embroidery-inventory-manager` repository
6. Click **"Deploy Now"**

## Step 3: Configure Your App

Railway will automatically:
- ✅ Detect it's a Node.js app
- ✅ Install dependencies
- ✅ Start your server
- ✅ Give you a public URL

## Step 4: Get Your Public URL

1. Once deployed, click on your project
2. Go to the **"Deployments"** tab
3. Click on the **"View Logs"** button
4. Look for a message like: `Your app is live at: https://your-app.railway.app`
5. **Copy this URL** - this is your public access point!

## Step 5: Test External Access

1. Open the Railway URL in a new browser tab
2. Test all features:
   - Add customers
   - Add inventory items
   - Upload photos to gallery
   - Generate reports
3. Share the URL with others!

## 🔧 Troubleshooting

### If deployment fails:
1. Check the **"Logs"** tab in Railway
2. Look for error messages
3. Common issues:
   - Missing dependencies
   - Port configuration
   - File permissions

### If the app doesn't load:
1. Wait 2-3 minutes for full deployment
2. Check the **"Deployments"** tab for status
3. Look for the correct URL in logs

## 🔒 Security (Important!)

Before sharing publicly:

1. **Enable Authentication:**
   ```bash
   # Edit data/auth.json
   {
     "username": "your-username",
     "password": "your-secure-password",
     "enabled": true
   }
   ```

2. **Restart the app** in Railway

## 📱 Mobile Access

Once deployed:
- **Works on any device** with internet
- **Add to phone home screen** for app-like experience
- **Share with customers** to show your work

## 🎯 What You'll Get

- ✅ **Permanent URL** that never changes
- ✅ **HTTPS security** automatically
- ✅ **Professional hosting**
- ✅ **Easy updates** (just push to GitHub)
- ✅ **Free tier** with generous limits

## 🆘 Need Help?

If you get stuck:
1. Check Railway's **"Logs"** tab
2. Look for error messages
3. Try redeploying
4. Contact Railway support

---

**Ready to start? Follow Step 1 above!**
