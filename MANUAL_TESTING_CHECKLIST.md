# 📋 Manual Testing Checklist

## 🔐 Authentication (Required First!)
- [ ] Open http://localhost:3002
- [ ] Login with username: `admin`, password: `Kobe#1`
- [ ] Verify "admin" appears in top right with Logout button

---

## 📁 Projects Tab

### Add Project
- [ ] Click "Add New Project" button
- [ ] Fill in all fields:
  - Description: "Test Project"
  - Quantity: 2
  - Category: "Test"
  - Status: "pending"
  - Customer: Select one from dropdown
  - Due Date: Pick a date
  - Price: 25.00
  - Priority: "high"
  - Notes: "Test notes"
  - Location: "Workshop"
  - Tags: "test"
  - Pattern Link: "http://example.com"
- [ ] Click "Add Project"
- [ ] Verify project appears in table
- [ ] Verify success notification appears

### Edit Project
- [ ] Find a project in the table
- [ ] Click Edit button (pencil icon)
- [ ] Modal opens with pre-filled data
- [ ] Change description to "Edited Project"
- [ ] Click "Save Changes"
- [ ] Verify changes appear in table
- [ ] Verify success notification

### Copy Project
- [ ] Find a project in the table
- [ ] Click Copy button (copy icon)
- [ ] Modal opens with all data pre-filled
- [ ] Notice customer field is cleared
- [ ] Select a DIFFERENT customer
- [ ] Click "Add Project"
- [ ] Verify original customer group closes
- [ ] Verify new customer group opens
- [ ] Verify copied project appears under new customer

### Delete Project
- [ ] Find a project in the table
- [ ] Click Delete button (trash icon)
- [ ] Confirm deletion
- [ ] Verify project is removed from table

### Search
- [ ] Type in search box
- [ ] Verify results filter in real-time
- [ ] Clear search
- [ ] Verify all projects reappear

### Filters
- [ ] Use status filter dropdown
- [ ] Verify only matching items show
- [ ] Use customer filter
- [ ] Verify only matching items show
- [ ] Clear filters

---

## 📦 Inventory Tab

### Add Inventory Item
- [ ] Click "Inventory" tab
- [ ] Click "Add New Item" button
- [ ] Fill in fields:
  - Name: "Test Item"
  - Quantity: 5
  - Category: "Materials"
  - Location: "Storage"
  - Reorder Point: 2
  - Price: 10.00
- [ ] Click "Add Item"
- [ ] Verify item appears in inventory table
- [ ] Verify success notification

### Edit Inventory
- [ ] Find an inventory item
- [ ] Click Edit button
- [ ] Modify quantity
- [ ] Click "Save Changes"
- [ ] Verify changes appear

### Delete Inventory
- [ ] Find an inventory item
- [ ] Click Delete button
- [ ] Confirm deletion
- [ ] Verify item is removed

---

## 👥 Customers Tab

### Add Customer
- [ ] Click "Customers" tab
- [ ] Click "Add New Customer" button
- [ ] Fill in:
  - Name: "Test Customer"
  - Contact: "test@example.com"
  - Location: "Test City, State"
- [ ] Click "Add Customer"
- [ ] Verify customer appears in list

### Edit Customer
- [ ] Find a customer
- [ ] Click Edit button
- [ ] Modify contact info
- [ ] Click "Save Changes"
- [ ] Verify changes appear

### Delete Customer
- [ ] Find a customer (without projects)
- [ ] Click Delete button
- [ ] Confirm deletion
- [ ] Verify customer is removed

---

## 💰 Sales Tab

### Add Sale
- [ ] Click "Sales" tab
- [ ] Click "Add New Sale" button
- [ ] Fill in:
  - Item Name: "Test Sale Item"
  - Customer: Select from dropdown
  - Price: 50.00
  - Sale Channel: "individual"
  - Commission %: 10
  - Date: Today's date
- [ ] Click "Add Sale"
- [ ] Verify sale appears in table
- [ ] Verify totals update

### Edit Sale
- [ ] Find a sale
- [ ] Click Edit button
- [ ] Modify price
- [ ] Click "Save Changes"
- [ ] Verify changes and totals update

### Delete Sale
- [ ] Find a sale
- [ ] Click Delete button
- [ ] Confirm deletion
- [ ] Verify sale is removed and totals update

---

## 📸 Gallery Tab

### Add Photo
- [ ] Click "Gallery" tab
- [ ] Click "Add Photo" button
- [ ] Fill in:
  - Title: "Test Photo"
  - Category: "Projects"
  - Notes: "Test photo notes"
- [ ] Select an image file
- [ ] Click "Add Photo"
- [ ] Verify photo appears in gallery

### View Photo
- [ ] Click on a photo
- [ ] Verify full-size modal opens
- [ ] Close modal

### Delete Photo
- [ ] Find a photo
- [ ] Click Delete button
- [ ] Confirm deletion
- [ ] Verify photo is removed

---

## 💡 Ideas Tab

### Add Idea (No Auth Required!)
- [ ] Click "Ideas" tab
- [ ] Click "Add New Idea" button
- [ ] Fill in:
  - Title: "Test Idea"
  - Description: "Test idea description"
  - Category: "Projects"
  - Priority: "high"
- [ ] Optionally add image
- [ ] Click "Add Idea"
- [ ] Verify idea appears as card

### Edit Idea (Auth Required!)
- [ ] Find an idea card
- [ ] Click Edit button
- [ ] Modify title
- [ ] Click "Save Changes"
- [ ] Verify changes appear

### Delete Idea (Auth Required!)
- [ ] Find an idea card
- [ ] Click Delete button
- [ ] Confirm deletion
- [ ] Verify idea is removed

---

## 📊 Reports Tab

### View Reports
- [ ] Click "Reports" tab
- [ ] Verify statistics display:
  - Total projects
  - Completed projects
  - Pending projects
  - Total sales
  - Total revenue
- [ ] Verify charts render

---

## 📱 Mobile Responsiveness

### Test on Mobile (or resize browser)
- [ ] Resize browser to mobile width (< 768px)
- [ ] Verify navigation is mobile-friendly
- [ ] Test all tabs
- [ ] Test add/edit/delete operations
- [ ] Verify modals are responsive
- [ ] Test photo upload on mobile

---

## 🎯 Special Features

### Customer Grouping
- [ ] In Projects tab, verify projects are grouped by customer
- [ ] Click customer header to expand/collapse
- [ ] Verify expanded state persists on page reload

### Copy with Customer Switch
- [ ] Copy a project from Customer A
- [ ] Assign it to Customer B
- [ ] Click "Add Project"
- [ ] Verify Customer A group closes
- [ ] Verify Customer B group opens and shows copied project

---

## ✅ Console Check

### Check for Errors
- [ ] Open browser DevTools (F12 or Cmd+Opt+I)
- [ ] Click "Console" tab
- [ ] Go through all the above tests
- [ ] Verify NO red errors appear
- [ ] Verify only info/debug logs appear

---

## 🎉 Final Verification

- [ ] All add operations work
- [ ] All edit operations work
- [ ] All delete operations work
- [ ] All fields populate correctly
- [ ] No console errors
- [ ] Authentication works correctly
- [ ] Logout works
- [ ] Data persists after page reload

---

**If all checkboxes are checked with NO issues, the application is fully functional!** ✅
