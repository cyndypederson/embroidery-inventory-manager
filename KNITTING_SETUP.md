# Knitting Partner Site — Setup Guide

This guide walks through deploying the **separate linked knitting site** from the same codebase as your embroidery inventory manager.

---

## Overview

| Site | Database | Who logs in |
|------|----------|-------------|
| Embroidery (existing) | `embroidery_inventory` | You only |
| Knitting (new) | `knitting_inventory` | You (same admin password) + partner (`akeeler`) |

---

## Step 1 — MongoDB

In MongoDB Atlas (same cluster as embroidery):

1. No manual step required — the app creates `knitting_inventory` automatically on first connect when `DB_NAME=knitting_inventory` is set.
2. The knitting site starts **empty** (no embroidery sample data).
3. Default shop customer (`Flippin' Happy` by default) is seeded if `DEFAULT_SHOP_CUSTOMER` is set.

---

## Step 2 — Vercel knitting project

1. In [Vercel Dashboard](https://vercel.com), **Add New Project** → import the **same GitHub repo** as embroidery.
2. Name it e.g. `knitting-inventory-manager`.
3. Add these **Environment Variables**:

| Variable | Value |
|----------|-------|
| `MONGODB_URI` | Same as embroidery project |
| `DB_NAME` | `knitting_inventory` |
| `SESSION_SECRET` | New random string (different from embroidery) |
| `ADMIN_USERNAME` | **Same as embroidery** |
| `ADMIN_PASSWORD` | **Same as embroidery** |
| `TENANT_ID` | `knitting` |
| `APP_TITLE` | `Knitting Inventory` |
| `ENABLED_TABS` | `projects,inventory,wip,completed,sales,reports` |
| `DEFAULT_SHOP_CUSTOMER` | `Flippin' Happy` |
| `HIDE_TAGS` | `true` |
| `PARTNER_USERNAME` | `akeeler` |

4. Deploy.

---

## Step 3 — Embroidery site link (optional)

On your **embroidery** Vercel project, add:

| Variable | Value |
|----------|-------|
| `KNITTING_SITE_URL` | `https://your-knitting-app.vercel.app` |

Redeploy embroidery. A “Knitting inventory” link appears in the header.

On the **knitting** project, `EMBROIDERY_SITE_URL` is already defaulted to your embroidery URL for the reverse link.

---

## Step 4 — Create partner account (`akeeler`)

1. Open the knitting site URL.
2. Log in with your **usual admin** credentials.
3. Click **Setup partner** in the header.
4. Enter the password she wants (or a temporary one she can change later).
5. Share with her:
   - **URL:** knitting site link
   - **Username:** `akeeler`
   - **Password:** what you set

### Alternative: she picks her own password

1. While logged in as admin, call the setup-token API (or use browser dev tools):

```bash
curl -X POST https://YOUR-KNITTING-SITE.vercel.app/api/users/setup-token \
  -H "Content-Type: application/json" \
  -b "connect.sid=YOUR_SESSION_COOKIE"
```

2. Send her the link: `https://YOUR-KNITTING-SITE.vercel.app/?setup=TOKEN`
3. She sets her password and logs in as `akeeler`.

---

## Step 5 — Partner changes password

After logging in as `akeeler`, she can click the **key icon** in the header → Change Password.

Admin password changes remain via Vercel env vars (not in-app).

---

## Local testing (knitting mode)

Create `.env` in the project root (never commit):

```
MONGODB_URI=your-uri
DB_NAME=knitting_inventory
TENANT_ID=knitting
APP_TITLE=Knitting Inventory
ENABLED_TABS=projects,inventory,wip,completed,sales,reports
DEFAULT_SHOP_CUSTOMER=Flippin' Happy
HIDE_TAGS=true
PARTNER_USERNAME=akeeler
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-password
SESSION_SECRET=local-dev-secret
```

Run `npm start` and open http://localhost:3000

---

## Workflow reminder

- Partner adds items → marks completed → prints invoice for the box → mails to you.
- Sold items default to your shop (`Flippin' Happy`); commission auto-calculates at 30%.
- You log into the knitting site anytime with your admin password to mark sold and track inventory.

---

## Security notes

- POST API routes require login on production (both sites).
- Partner cannot access embroidery data (separate database + URL).
- Keep `.env` and credentials out of git.
