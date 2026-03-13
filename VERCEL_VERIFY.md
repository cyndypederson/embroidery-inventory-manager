# Vercel connection checklist

Use this to verify and fix “Vercel isn’t connecting.”

## 1. GitHub connection

- Go to [vercel.com/dashboard](https://vercel.com/dashboard) and open your project (e.g. **embroidery-inventory-manager**).
- **Settings → Git**:
  - **Connected Git Repository** should be `cyndypederson/embroidery-inventory-manager`.
  - If it says “No Git Repository” or the repo is wrong, click **Connect Git Repository**, choose GitHub, and select `cyndypederson/embroidery-inventory-manager`.
- **Production Branch** is usually `main`. Confirm it matches your default branch.

## 2. Environment variables (required for API/DB)

The app will deploy without these, but all `/api/*` and data will fail until they’re set:

- **Settings → Environment Variables**
- Add (for **Production**, and optionally Preview/Development):

| Name            | Value                    | Notes                          |
|-----------------|--------------------------|--------------------------------|
| `MONGODB_URI`   | your MongoDB Atlas URI   | Required for inventory/sales   |
| `DB_NAME`       | `embroidery_inventory`   | Optional; this is the default |
| `SESSION_SECRET`| long random string       | Recommended for auth          |
| `ADMIN_USERNAME`| your admin username      | Optional; default `admin`     |
| `ADMIN_PASSWORD`| your admin password      | Optional; set in production   |

- **Redeploy** after changing env vars: **Deployments** → … on latest → **Redeploy**.

## 3. Confirm deployment

- **Deployments**: Latest deployment should be “Ready” and from the correct branch/commit.
- Open your live URL (e.g. `https://cyndypembroidery-inventory.vercel.app`).
- **Quick checks:**
  - **Page loads:** `https://<your-domain>.vercel.app/`
  - **Version (no DB needed):** `https://<your-domain>.vercel.app/version.json` → should return JSON with `version: "1.0.105"`.
  - **Health (needs MONGODB_URI):** `https://<your-domain>.vercel.app/health` → should return `{"status":"OK",...}`.

If the page loads but `/version.json` or `/health` fails, the GitHub connection is fine and the issue is likely env vars or the serverless function (see below).

## 4. If the site still doesn’t connect

- **Redeploy:** Deployments → … → **Redeploy** (no cache).
- **Build logs:** Open the latest deployment → **Building** / **Logs** and check for errors (e.g. missing env, build failure).
- **Runtime logs:** **Functions** tab or deployment **Logs** for errors when opening the site or calling `/version.json` or `/api/*`.

## 5. What was changed in the project

- **server.js:** If `MONGODB_URI` is not set on Vercel, the server no longer exits at startup. The app and `/version.json` (and `/health`) can work; `/api/*` will return 503 until `MONGODB_URI` is set.
- **vercel.json:** Routes for `/version.json` and `/health` go to `server.js` so the live site can check version and connectivity.

After reconnecting Git and setting env vars, push a commit or redeploy to trigger a new build.
