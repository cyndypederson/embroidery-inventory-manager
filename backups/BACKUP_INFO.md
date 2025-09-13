# Embroidery Inventory Manager - Backup Information

## Backup Created: September 13, 2025

### What's Included in This Backup:

#### 1. Complete Code Backup
- **File**: `embroidery-inventory-backup-*.tar.gz`
- **Contents**: All source code, configuration files, and documentation
- **Excludes**: node_modules, .git, backups folder

#### 2. Data Backup
- **Folder**: `data-backup-*`
- **Contents**: All JSON data files
  - `inventory.json` - 20 inventory items
  - `customers.json` - 6 customers
  - `sales.json` - Sales records
  - `gallery.json` - Gallery items
  - `auth.json` - Authentication data

### Current System Status:

#### ✅ **Deployed and Working**
- **Live URL**: https://embroidery-inventory-manager.vercel.app
- **Database**: MongoDB Atlas (connected)
- **Data**: All inventory and customer data loaded
- **Features**: Full functionality working

#### 🔧 **Technical Details**
- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js/Express server
- **Database**: MongoDB Atlas (free tier)
- **Deployment**: Vercel (automatic from GitHub)
- **Repository**: https://github.com/cyndypederson/embroidery-inventory-manager

#### 📊 **Data Summary**
- **Inventory Items**: 20 items (various statuses: completed, in-progress, pending)
- **Customers**: 6 customers (Joey, Flippin' Happy, First Avenue Market, Kathy Pratt, Nicole, Sierra)
- **Sales**: 0 records (empty)
- **Gallery**: 0 items (empty)

### How to Restore:

#### Option 1: From Code Backup
```bash
cd /Users/cyndyp/Desktop/Projects
tar -xzf Embroidery/backups/embroidery-inventory-backup-*.tar.gz
cd Embroidery
npm install
```

#### Option 2: From GitHub
```bash
git clone https://github.com/cyndypederson/embroidery-inventory-manager.git
cd embroidery-inventory-manager
npm install
```

#### Option 3: Restore Data Only
```bash
cp -r backups/data-backup-*/data ./
```

### Environment Variables Needed:
- `MONGODB_URI`: mongodb+srv://cyndypstitchcraft_db_user:4G2vcEQSjAvJoUxY@embroider-inventory.2x57teq.mongodb.net/?retryWrites=true&w=majority&appName=embroider-inventory

### Important Files:
- `index.html` - Main application
- `script.js` - Frontend JavaScript
- `styles.css` - Styling
- `server.js` - Backend server
- `vercel.json` - Deployment configuration
- `package.json` - Dependencies

### Backup Verification:
- ✅ Code backup created successfully
- ✅ Data backup created successfully
- ✅ All important files included
- ✅ Excluded unnecessary files (node_modules, .git)

---
**Backup created by**: AI Assistant
**Date**: September 13, 2025
**Status**: Complete and verified
