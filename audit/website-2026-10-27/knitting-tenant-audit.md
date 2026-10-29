# Knitting tenant audit (pass 2)

**Method:** Code inspection + isolated local runtime with **separate MongoDB database** (`knitting_inventory` on port 3003). No writes performed except server auto-init (empty inventory verified).

## How knitting differs from embroidery

| Dimension | Embroidery (default) | Knitting (`TENANT_ID=knitting`) | Evidence |
|-----------|-------------------|----------------------------------|----------|
| MongoDB database | `embroidery_inventory` (env default) | `knitting_inventory` | `server.js` `DB_NAME`, `IS_KNITTING_TENANT` |
| Multi-user | `multiUserEnabled: false` | `true` | `MULTI_USER_ENABLED = TENANT_ID === 'knitting'` |
| Partner login | N/A | DB user `PARTNER_USERNAME` (default `akeeler`) | `/api/users/*`, client partner modals |
| Sample seed on empty DB | Loads `data/*.json` | **No sample seed**; optional default shop customer only | `initializeCollections` / `initializeKnittingDefaults` |
| Enabled tabs (typical) | Includes `customers`, `data` | Doc: omits `customers`, `data` | `KNITTING_SETUP.md`; runtime config below |
| Price tags | Visible (`hideTags: false`) | Hidden (`HIDE_TAGS` or knitting tenant) | `getTenantConfig`, `applyTenantConfig`, CSS `[data-tags-field]` |
| Header cross-links | Knitting site link if `KNITTING_SITE_URL` | Embroidery link if `EMBROIDERY_SITE_URL` | `script.js` `applyTenantConfig` |
| Admin login | Env admin credentials | Same env admin + partner bcrypt user | `server.js` login branch |
| Admin password change in-app | Blocked (`isDbUser` false) | Partner can change; admin via env only | `/api/change-password` |

## Runtime verification (local, 2026-10-28)

**Environment:**  
`PORT=3003 DB_NAME=knitting_inventory TENANT_ID=knitting ENABLED_TABS=projects,inventory,wip,completed,sales,reports HIDE_TABS=true DEFAULT_SHOP_CUSTOMER="Flippin' Happy"`

| Check | Result |
|-------|--------|
| `GET /api/config` | `tenantId: knitting`, `multiUserEnabled: true`, `hideTags: true`, 6 tabs (no customers/data) |
| `GET /api/users/status` | `partnerExists: false` |
| `GET /api/inventory` | 200, body `[]` (2 bytes) — empty DB |
| `GET /api/inventory` without auth | **200** — same **WEB-001** exposure class on knitting deployment |

## Tenant isolation analysis

| Mechanism | Isolation quality | Notes |
|-----------|-------------------|-------|
| Separate `DB_NAME` | **Strong** when env correct | All collections (`inventory`, `sales`, `users`, `sessions`, …) are per-database. |
| Shared `MONGODB_URI` cluster | **Config-dependent** | Wrong `DB_NAME` on Vercel project → wrong tenant data. No row-level tenant id in documents. |
| Shared codebase | **Behavior parity** | Same `script.js` / `server.js`; differences only via `/api/config`. |
| Sessions | Per DB (`MongoStore` uses `dbName`) | Session from embroidery site must not authorize knitting DB unless cookie reused against same host — separate Vercel projects = separate origins/cookies. |
| Caches | Client `localStorage` keys **not tenant-prefixed** | **Risk:** same browser switching between localhost ports or paths could merge wrong offline data (`embroideryInventory` keys). |
| Keera email poller | Uses connected server’s `DB_NAME` | Knitting deployment must not share IMAP apply with embroidery DB unless intentional. |

## Ops note (2026-10-28)

Local knitting instance on `:3003` used the same `.env` **IMAP** settings as embroidery and still started **`startKeeraSalesPoller()`** (compares against `knitting_inventory`). Long run ended with **exit 1** on unhandled IMAP auth/connection failure — same class as embroidery `:3002` (see `verification.md` local server ops note).

## Not runtime-verified (knitting)

- Partner create / setup-token / set-password flows (requires authenticated POST — not executed to avoid creating users without authorization).  
- Production knitting Vercel URL (not probed; unknown hostname).  
- `ENABLED_TABS` hiding customers tab with existing customer-dependent workflows.  
- Partner permission boundaries (same POST APIs as admin once logged in — no role-based field restrictions in server).

## Knitting-specific findings

| ID | Title | Severity |
|----|-------|----------|
| WEB-K01 | **Same unauthenticated GET data exposure** on knitting config | Critical (inherits WEB-001) |
| WEB-K02 | **localStorage keys not tenant-scoped** — switching sites on one browser can corrupt offline sync | Medium (risk) |
| WEB-K03 | **Documentation says 30% commission**; code has date-aware 20% in reports/email only (`KNITTING_SETUP.md` vs `getAutoCommissionPercentForShopCustomer`) | Medium (contradiction, ties to BL-04) |

## BL-03 status

**Partially closed** for code + read-only runtime config. **Remains open** for partner auth E2E and production knitting URL verification.
