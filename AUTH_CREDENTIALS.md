# 🔑 Authentication Credentials

**IMPORTANT:** Keep this file secure and do not share publicly!

---

## 🔐 Default Login Credentials

### **Username:**
```
admin
```

### **Password:**
```
embroidery2024
```

---

## 🌐 Where to Use

### **Live Site:**
https://embroidery-inventory-manager.vercel.app/

### **Localhost:**
http://localhost:3002

---

## 📝 How to Login

1. Visit the site
2. Try to perform a protected action (e.g., "Add Project" or click "Completed Items" tab)
3. Login modal will appear
4. Enter username: `admin`
5. Enter password: `embroidery2024`
6. Click "Login"
7. You now have full access

---

## 🔄 Changing Credentials

To change the username/password:

### **Option 1: Environment Variables (Recommended for Production)**
Set these in Vercel dashboard or your `.env` file:
```
ADMIN_USERNAME=your_username
ADMIN_PASSWORD=your_password
```

### **Option 2: Edit server.js (Quick but not recommended)**
Find lines 179-180 in `server.js`:
```javascript
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'embroidery2024';
```

Change the default values after `||`

---

## ⚠️ Security Notes

1. **Change the default password** before sharing the site publicly
2. **Use environment variables** in production (not hardcoded values)
3. **Session lasts 24 hours** - you'll need to re-login after that
4. **Cookies required** - make sure browser accepts cookies
5. **HTTPS recommended** - Vercel automatically provides this

---

## 🧪 Testing Authentication

### **Test 1: Check Auth Status**
```bash
curl https://embroidery-inventory-manager.vercel.app/api/auth/status
```
Should return: `{"authenticated": false, "authEnabled": true}`

### **Test 2: Login**
```bash
curl -X POST https://embroidery-inventory-manager.vercel.app/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"embroidery2024"}'
```
Should return: `{"success": true, "message": "Login successful", "username": "admin"}`

### **Test 3: Try Protected Action Without Login**
- Open site in incognito/private window
- Try to click "Add Project"
- Should see error message and login prompt

---

## 🔒 What's Protected

**Requires Login:**
- Add/Edit/Delete: Projects, Inventory, Customers, Sales, Gallery, Completed Items
- Edit/Delete: Ideas
- View: Completed Items, Sales, Reports, Data Management tabs
- Generate: Invoices
- Export/Import: Data

**Public (No Login):**
- View: Projects, Inventory, Customers, Gallery, Ideas, WIP tabs
- Add: Ideas only
- Search & Filter: All public content

---

## 💡 Troubleshooting

### **"Can't login / Authentication not working"**
1. Clear browser cookies
2. Try incognito/private mode
3. Check that username/password are exact (case-sensitive)
4. Make sure cookies are enabled in browser
5. Check server logs for errors

### **"Session expired"**
Sessions last 24 hours. Just login again.

### **"Authentication missing on live site"**
Make sure the server has been deployed with the authentication endpoints.
Check: `https://embroidery-inventory-manager.vercel.app/api/auth/status`

---

## 🎯 Default Credentials Summary

| Field | Value |
|-------|-------|
| **Username** | `admin` |
| **Password** | `embroidery2024` |
| **Session Duration** | 24 hours |
| **Change Password** | Via environment variables |

**Remember to change these credentials before sharing your site publicly!**

