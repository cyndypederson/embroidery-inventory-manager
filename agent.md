# Agent / Project memory

Use this file to remember project context, gotchas, and how things work.

## Project
- **Name:** CyndyP StitchCraft Inventory (Embroidery Inventory Manager)
- **Stack:** Node/Express, MongoDB Atlas, static frontend (HTML/CSS/JS)
- **Repo:** https://github.com/cyndypederson/embroidery-inventory-manager
- **Local:** http://localhost:3002 (from `.env` PORT=3002)
- **Live:** Vercel (e.g. embroidery-inventory-manager.vercel.app)

## Run locally
```bash
cd /Users/cyndyp/Desktop/Projects/Embroidery
node server.js
```
- Requires `.env` with `MONGODB_URI` (and optional `PORT=3002`, `DB_NAME`).
- Open **http://localhost:3002** in the browser (not file://).

## Data & persistence
- **Primary store:** MongoDB Atlas. Collections: inventory, customers, sales, gallery, ideas, patterns.
- **data/*.json:** Used by server to **seed** when a collection is empty on connect; also used by **Restore from data files**.
- **POST /api/seed-from-files:** Restores DB from `data/inventory.json`, `data/customers.json`, etc. (replaces collections). Use when DB is empty or to reset from backup.
- **Same data on local + production:** Use the same `MONGODB_URI` (and `DB_NAME`) in Vercel env as in local `.env`, then redeploy.

## Backups
- **backups/pre-fix-YYYYMMDD_HHMMSS/:** Timestamped backups of script.js, index.html, server.js, styles.css, vercel.json, data/. May include `*_from_api.json` snapshots of current DB.
- **backups/auto_backup_*/:** Auto-backups (e.g. from Nov 2025) with inventory, customers, sales, ideas, patterns.
- To restore from a backup: copy files from the backup folder back to project root; if needed, copy `*_from_api.json` to `data/` as `inventory.json` etc. and run Restore from data files.

## Important code / behavior
- **Price tags:** Customer name on tag only when customer is a **vendor** (`requiresVendorNumber` checked). Print layout: 3 columns × 2.5in, 8in total width; cut lines are dashed border on each tag (`.price-tag::after` in print CSS).
- **loadSalesTable():** If `salesTableBody` doesn’t exist (page uses cards), it calls `loadSalesCards()` and returns to avoid null innerHTML error.
- **Form handlers:** Must exist before init: handleAddCustomer, handleEditCustomer, handleAddSale, handleEditSale, handleAddPhoto, handleAddIdea, populateCustomerSelect, setupPhotoPreviews, updateLocationFilters, updateCustomerFilters, showLoadingSpinner, hideLoadingSpinner.
- **saveData():** Global save to API; only runs after first successful load (`window.__dataLoadedOnce`).

## Gotchas
- Open app at http://localhost:3002; opening index.html as file:// will break API calls.
- After changing server.js or routes, restart the server for changes to apply.
- If “nothing shows”: ensure server is running, MongoDB connected, and do a hard refresh (Cmd+Shift+R); use Restore from data files if DB is empty.

## One-off scripts (project root)
- **add-kathy-pracht-invoice.js:** Added 10 invoice items as projects for Kathy Pracht; can be deleted or kept for reference.
