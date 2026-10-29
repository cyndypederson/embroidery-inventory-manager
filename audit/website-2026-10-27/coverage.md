# Coverage ledger

**Legend — status:** `discovered` | `inspected` | `tested` | `blocked` | `n/a`  
Code inspection alone is **not** runtime verification.

| Component / workflow | Location | Purpose | Roles | Dependencies | Inspection | Verification | Status | Remaining gaps |
|----------------------|----------|---------|-------|--------------|------------|--------------|--------|----------------|
| SPA shell + nav tabs | `index.html`, `script.js` | Projects, inventory, customers, WIP, completed, sales, reports, data | Operator (single admin); partner when `TENANT_ID=knitting` | `/api/config`, MongoDB | HTML nav + tab panels read | Smoke 5/6; browser projects tab; **Data tab hidden mobile** (WEB-020) | tested (partial) | Desktop-width all tabs; sales/completed flows |
| Tenant config | `server.js` `getTenantConfig`, `GET /api/config` | Title, enabled tabs, shop customer, multi-user flags | Public read | env vars | Full | GET production `/api/config` 200 | tested | Knitting tenant env combo |
| Login / logout | `server.js` `/api/login`, `/api/logout`; auth modals | Session auth | Admin env creds; DB users if knitting | `express-session`, Mongo `sessions` | Full | Local POST without creds → 401; prod POST inventory unauth → 401 | tested | Brute-force / lockout behavior |
| Change password | `/api/change-password` | Partner password change | DB user session | bcrypt | Full | n/a embroidery tenant | inspected | — |
| Partner setup | `/api/users/*` | Create partner, setup token | Admin session; `MULTI_USER_ENABLED` | Mongo `users` | Full | n/a on embroidery prod config | n/a | Enable knitting tenant test |
| Projects CRUD | `script.js`, modals `addProjectModal`, `editProjectModal` | Custom embroidery orders | Authenticated write | `inventory` collection (type `project`) | Grep + modal inventory | — | inspected | Edit/delete edge cases |
| Supply inventory CRUD | `addInventoryModal`, `editInventoryModal` | Kits, hoops, thread qty | Auth write | same `inventory` collection (type `inventory`) | Full | — | inspected | Qty decrement on sale not implemented |
| Customers CRUD | customers tab, modals | Customer/vendor records | Auth write | `customers` collection | Modals read | — | inspected | — |
| WIP view | `#wip` tab | In-progress filter | Read | inventory status | Code | — | inspected | — |
| Completed + invoice selection | `#completed` tab | Batch invoice from completed | Auth for invoice | inventory + invoices | Code | — | inspected | — |
| Mark as sold | `markAsSoldModal`, `createOrUpdateSaleFromProject` | Sold status + sale row | Auth save | inventory + sales | Full trace | Keera parser unit tests (related path) | inspected | Duplicate sale if email+manual |
| Sales tab / edit sale | sales cards, `editSaleModal` | Commission, net, listed price | Auth | `sales` collection | Code | — | inspected | — |
| Manual add sale | `addSaleModal` | Ad-hoc sale rows | Auth | sales | Code | — | inspected | — |
| Invoices (past) | `invoicesListModal`, `persistInvoices` | History + reprint | Auth | `invoices` + localStorage merge | Full | `test-invoice-persist.js` exists, not run | inspected | Run isolated invoice test locally |
| Reports dashboard | `#reports`, `AnalyticsManager` | Charts, PDF export | Read (export may save) | sales, inventory | Code | — | inspected | Revenue formula cross-check with sample export |
| Data backup/import | `#data`, `dataManager` | Export/import JSON, auto-backup | Auth for cloud push | localStorage + API | Code | — | inspected | Import malformed file paths |
| Push local-only to cloud | `syncLocalOnlyInventoryToCloud` | Heal split-brain | Auth | inventory POST | Full | — | inspected | Sales/customers not synced |
| Price tags / logo tags | print modals, CSS | Print layouts | Local print | inventory, logos | Code + CSS refs | — | inspected | Print preview only |
| Photo / camera modals | `cameraModal`, OCR hooks | Item photos | Client | localStorage size | Partial | — | inspected | OCR accuracy |
| Advanced search | `advancedSearchModal` | Saved searches | Client | localStorage | Grep | — | inspected | — |
| Keera email sales | `lib/email-sales/*`, `server.js` poll | IMAP parse, match, optional apply | Server session for manual poll | IMAP, inventory, sales | Full module read | `npm run test:keera-parser` pass | tested | No UI; live IMAP not polled |
| Background Keera poller | `startKeeraSalesPoller` | Scheduled poll | Server | IMAP | Code | Local log: dry-run=true | tested | Apply path when dry-run false |
| Gallery API | `GET/POST /api/gallery` | Photo gallery store | Auth POST | Mongo `gallery` | Server only | GET prod without auth (if enabled) | inspected | **Client never loads/saves** |
| Ideas API | `GET/POST /api/ideas` | Ideas store | Auth POST | Mongo `ideas` | Server only | — | inspected | **Client never loads/saves** |
| Health / version | `/health`, `/version.json` | Ops | Public | Mongo connect | Code | Local + prod GET | tested | — |
| Static seed data | `vercel.json` `/data/*`, `data/*.json` | Seed + restore source | Public static | — | vercel routes | GET reachable on prod host | inspected | Compare to live DB leakage |
| Pattern library tooling | `scripts/pattern-library/*` | Drive PDF organization | CLI operator | Google Drive | README | Not part of web app | n/a | Out of website scope |
| Tests | `test-smoke.js`, `test-comprehensive.js`, etc. | QA automation | Dev | localhost:3002, Puppeteer | Executed 2026-10-28 | Smoke partial; modals/comprehensive setup fail (WEB-019) | tested (partial) | Auth-aware test rewrite |
| Knitting tenant | Same codebase, `TENANT_ID=knitting` | Partner + reduced tabs | Admin + partner | `knitting_inventory` DB | Code + `:3003` GET config | Read-only runtime | tested (partial) | Partner POST flows |
| Deploy | `vercel.json`, `deploy.sh`, pm2 | Vercel serverless + static | Ops | env on Vercel | Full vercel.json | — | inspected | — |

## Route / API inventory

| Method | Path | Auth (server) | Client caller |
|--------|------|---------------|---------------|
| GET | `/`, `/index.html` | No | Browser |
| GET | `/script.js`, `/styles.css` | No | Browser |
| GET | `/version.json`, `/health` | No | Ops |
| GET | `/api/config` | No | `loadTenantConfig` |
| GET | `/api/auth/status` | No | `checkAuthStatus` |
| POST | `/api/login`, `/api/logout` | No | Auth modal |
| POST | `/api/change-password` | Session | Change password modal |
| GET/POST | `/api/users/*` | Mixed | Partner setup (knitting) |
| GET | `/api/inventory`, `/api/customers`, `/api/sales`, `/api/invoices`, `/api/gallery`, `/api/ideas` | **No** | `loadDataFromAPI`, probes |
| POST | `/api/inventory`, `/api/customers`, `/api/sales`, `/api/invoices`, `/api/gallery`, `/api/ideas` | Session | `saveDataToAPI`, `persistInvoices` |
| GET/POST | `/api/email-sales/status`, `/api/email-sales/poll` | Session | **No client UI** |

## Dead / obsolete references

| Claim | Evidence | Actual |
|-------|----------|--------|
| `POST /api/seed-from-files` | `agent.md` | **Not present** in `server.js` |
| Mongo `patterns` collection | `agent.md` | **Not used** by current server routes |
| Gallery/ideas in UI | Comments in HTML | Arrays **zeroed** on every API load (`script.js` ~7585) |
