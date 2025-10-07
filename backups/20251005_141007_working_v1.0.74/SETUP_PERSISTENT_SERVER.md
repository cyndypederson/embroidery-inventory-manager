# 🎨 Embroidery Inventory Manager - Persistent Server Setup

## ✅ Server is Currently Running!

Your server is now running at **http://localhost:3000** and will stay running even when you close Cursor!

## 🚀 Quick Start Commands

I've created several convenient scripts for you:

### Start the Server
```bash
./start-server.sh
```

### Stop the Server
```bash
./stop-server.sh
```

### Restart the Server
```bash
./restart-server.sh
```

### Check Server Status
```bash
./server-status.sh
```

### Desktop Launcher
Double-click: `Start Embroidery Server.command`

## 🔄 Make Server Start Automatically on Boot

To make your server start automatically when your computer boots up, run this command in Terminal:

```bash
sudo env PATH=$PATH:/usr/local/bin /Users/cyndyp/Desktop/Projects/Embroidery/node_modules/pm2/bin/pm2 startup launchd -u cyndyp --hp /Users/cyndyp
```

**Note:** You'll need to enter your Mac password when prompted.

## 📊 Server Management

### View Server Logs
```bash
npx pm2 logs embroidery-inventory
```

### Monitor Server in Real-time
```bash
npx pm2 monit
```

### Check Server Status
```bash
npx pm2 status
```

## 🛠️ Troubleshooting

### If the server stops unexpectedly:
1. Check the logs: `npx pm2 logs embroidery-inventory`
2. Restart the server: `./restart-server.sh`
3. Check status: `npx pm2 status`

### If you need to completely reset:
1. Stop the server: `npx pm2 stop embroidery-inventory`
2. Delete the process: `npx pm2 delete embroidery-inventory`
3. Start fresh: `./start-server.sh`

## 🌐 Access Your Application

- **Local Access:** http://localhost:3000
- **Network Access:** http://[your-ip-address]:3000

## ✨ What This Setup Gives You

- ✅ **Persistent Server:** Runs even when Cursor is closed
- ✅ **Auto-Restart:** Server restarts automatically if it crashes
- ✅ **Boot Startup:** Server starts automatically when your Mac boots up
- ✅ **Easy Management:** Simple scripts to start/stop/restart
- ✅ **Logging:** All server activity is logged for troubleshooting
- ✅ **Monitoring:** Real-time server monitoring available

## 📱 Mobile Access

Once the server is running, you can access your embroidery inventory from any device on your network by visiting:
`http://[your-computer's-ip-address]:3000`

To find your computer's IP address, run:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

---

**Your embroidery inventory management system is now running persistently! 🎉**
