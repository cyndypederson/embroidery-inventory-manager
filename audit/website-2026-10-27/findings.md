# Findings and recommendations

Severity: **Critical** | **High** | **Medium** | **Low**  
Classification: **defect** | **contradiction** | **ambiguity** | **risk** | **improvement**

---

## WEB-001 — Unauthenticated read exposes full operational database

| Field | Detail |
|-------|--------|
| Classification | **defect** (security / privacy) |
| Severity | **Critical** |
| Affected | All roles; production deployment |
| Location | `server.js` lines 567–744 (GET handlers without `requireSessionAuth`) |
| Expected | Sensitive business data readable only after authentication (implied by login-gated writes and UX copy). |
| Observed | `GET /api/inventory`, `/api/customers`, `/api/sales`, `/api/invoices`, `/api/gallery`, `/api/ideas` return **200 without session**. Production probe: inventory response ~59 KB (see `verification.md`). |
| Reproduction | `curl -s -o /dev/null -w '%{http_code}' https://embroidery-inventory-manager.vercel.app/api/inventory` → 200. |
| Business impact | Anyone with the public URL can harvest customer names, project descriptions, prices, sales history, and invoice metadata. |
| Root cause | Read endpoints intentionally open; auth only on POST. |
| Fix (minimal) | Apply `requireSessionAuth` (or shared `requireSessionOrReadToken`) to all data GET routes; keep `/health` and `/api/config` public if needed. |
| Acceptance | Unauthenticated GET on data routes returns 401; authenticated session returns data; existing tests updated. |
| Effort | Small–medium (1–2 days including client load path and tests). |

---

## WEB-002 — Hardcoded default admin password in source

| Field | Detail |
|-------|--------|
| Classification | **defect** (security) |
| Severity | **Critical** if env not set in production |
| Location | `server.js` `isAdminCredential` lines 51–54 |
| Evidence | Fallback `ADMIN_PASSWORD || 'Kobedavis#1'` (redacted in ops docs; **present in repo**). |
| Expected | No default production credentials in code (`server.js` comments say credentials in env only). |
| Observed | Login succeeds with env defaults when variables unset. |
| Fix | Remove fallback password/username; refuse to start or refuse admin login unless env set. |
| Acceptance | Grep CI fails on password literals; startup error without `ADMIN_PASSWORD`. |

---

## WEB-003 — Default session secret fallback

| Field | Detail |
|-------|--------|
| Classification | **risk** |
| Severity | **High** on public deployment |
| Location | `server.js` line 228 |
| Evidence | `SESSION_SECRET || 'embroidery-secret-key-change-in-production'` |
| Impact | Predictable secret enables session forgery if attacker can obtain cookie signing material knowledge. |
| Fix | Require `SESSION_SECRET` in production (`IS_PRODUCTION`). |

---

## WEB-004 — Non-transactional full-collection replace saves

| Field | Detail |
|-------|--------|
| Classification | **defect** (data integrity) |
| Severity | **High** |
| Location | `server.js` POST handlers (e.g. 587–590); `script.js` `saveDataToAPI` 8115–8136 |
| Expected | Inventory, customers, sales, invoices remain mutually consistent after save. |
| Observed | Each POST `deleteMany({})` then `insertMany`; client fires **parallel** POSTs via `Promise.allSettled`. One collection can succeed while another fails. |
| Impact | Orphaned sales without items, or inventory without matching sales; silent partial state. |
| Fix | Single `/api/snapshot` transaction (Mongo session) or sequential save with rollback; server-side schema validation. |
| Acceptance | Simulated failure mid-save leaves DB unchanged; integration test. |

---

## WEB-005 — Gallery and ideas APIs disconnected from UI

| Field | Detail |
|-------|--------|
| Classification | **defect** |
| Severity | **Medium** |
| Location | `script.js` 7585–7586, 7674–7675; `saveDataToAPI` omits gallery/ideas |
| Expected | Comments reference gallery/ideas tracking (`index.html` ~1432). |
| Observed | On API load, `gallery = []; ideas = [];` — no fetch to `/api/gallery` or `/api/ideas`. Seed data may exist in Mongo from `initializeCollections`. |
| Impact | Stale or misleading server data; future feature confusion; wasted storage. |
| Fix | Either wire load/save in client or remove API/seed and document as deprecated. |

---

## WEB-006 — Shop commission rules disagree (mark-sold vs report/email)

| Field | Detail |
|-------|--------|
| Classification | **contradiction** |
| Severity | **High** (financial reporting) |
| Location | Mark-sold: `getAutoCommissionPercentForShopCustomer` (~12790). Reports: `getDefaultShopCommissionPercent` (~14193). Email: `lib/email-sales/config.js`. |
| Expected | Same commission for same shop customer and sale month (parser tests + monthly report: **20%** May–Jul 2026). |
| Observed | **Mark-sold** uses **30%** (name-only). **Monthly Shop Statement** and **Keera email** use **20%** for May–Jul 2026. |
| Impact | Sales rows from mark-sold disagree with shop statement and Keera automation for mid-2026. |
| Fix | Single date-aware commission helper used by `createOrUpdateSaleFromProject` and reports/email. |
| Verification | See `bl04-decision-brief.md`; unit test mark-sold vs `buildSaleFromItem` on 2026-06-15. |
| Pass 2 | Confirmed third code path in reports; see BL-04 decision brief. |

---

## WEB-007 — Reports total revenue uses `salePrice` only

| Field | Detail |
|-------|--------|
| Classification | **defect** |
| Severity | **Medium** |
| Location | `script.js` `calculateTotalRevenue` ~3402–3403 |
| Observed | Sums `sale.salePrice` without preferring `netAmount` or multiplying quantity for legacy rows. |
| Impact | Dashboard under/over states revenue vs sales tab cards (which use net/commission fields). |
| Fix | Centralize `getSaleRevenue(sale)` used by reports, exports, and cards. |

---

## WEB-008 — Single-sale invoice PDF uses wrong monetary fields

| Field | Detail |
|-------|--------|
| Classification | **defect** |
| Severity | **Medium** |
| Location | `script.js` `exportInvoicePDF` ~2596–2634 |
| Observed | Uses `sale.price` / `sale.salePrice` as unit price; prints `commission` **percent** as dollar line (`$${commission.toFixed(2)}`). Shop sales store amounts in `listedPrice`, `netAmount`, `commissionAmount`. |
| Impact | Printed invoice PDFs incorrect for typical auto-generated shop sales. |
| Fix | Use same normalization as `normalizeInvoiceLineItems` / sales card display. |

---

## WEB-009 — Sales linked by fragile `itemIndex`

| Field | Detail |
|-------|--------|
| Classification | **risk** |
| Severity | **Medium** |
| Location | `createOrUpdateSaleFromProject` sets `itemIndex: index` |
| Impact | Re-sort, delete, or import reorder breaks index linkage; duplicate or wrong sale updates. |
| Fix | Prefer stable `itemId` / Mongo `_id` on sale records (email path already sets `itemId`). |

---

## WEB-010 — Permissive CORS with credentials

| Field | Detail |
|-------|--------|
| Classification | **risk** |
| Severity | **Medium** on public site |
| Location | `server.js` 218–221 `cors({ origin: true, credentials: true })` |
| Impact | With WEB-001, any origin can read data in browser contexts; with session cookie, CSRF-style POST risk increases. |
| Fix | Restrict `origin` to known app URLs; add CSRF token for cookie POSTs. |

---

## WEB-011 — Keera email integration has no operator UI

| Field | Detail |
|-------|--------|
| Classification | **ambiguity** / **improvement** |
| Severity | **Low**–**Medium** |
| Location | `server.js` 749–784; no matches in `script.js` |
| Observed | Polling runs server-side; manual trigger only via API. Status returns partial IMAP config (`user`, not password). |
| Impact | Operators cannot review match table or dry-run from app; reliance on logs / scripts (`trial:keera-sales`). |
| Fix | Data-tab panel: show last `emailSaleJobs` entry, button “Preview mailbox” calling poll with dry-run. |

---

## WEB-012 — “Push local-only” sync ignores customers and sales

| Field | Detail |
|-------|--------|
| Classification | **defect** |
| Severity | **Medium** |
| Location | `syncLocalOnlyInventoryToCloud` ~8336 |
| Impact | User follows UX for cloud sync but sales/customers remain local-only. |
| Fix | Extend merge pattern or document scope on button; mirror `saveDataToAPI` collections. |

---

## WEB-013 — Documentation drift (`agent.md`)

| Field | Detail |
|-------|--------|
| Classification | **contradiction** |
| Severity | **Low** |
| Evidence | `agent.md` documents `POST /api/seed-from-files` and `patterns` collection — absent from `server.js`. |
| Fix | Update agent/docs to match server or restore endpoint. |

---

## WEB-014 — Static `/data/*` on Vercel

| Field | Detail |
|-------|--------|
| Classification | **risk** |
| Severity | **Low**–**Medium** |
| Location | `vercel.json` routes 68–69, 22–24 |
| Impact | Sample/backup JSON structures publicly downloadable (may aid reconnaissance). |
| Fix | Remove static data from production build or gate behind auth. |

---

## WEB-015 — Weak partner password policy

| Field | Detail |
|-------|--------|
| Classification | **risk** |
| Severity | **Low** (knitting tenant) |
| Location | `server.js` 369, 428, 508 — minimum 4 characters |
| Fix | Align with admin policy; optional strength meter. |

---

## WEB-016 — `updateExistingSalesWithCommission` may POST without confirmed auth on load

| Field | Detail |
|-------|--------|
| Classification | **risk** |
| Severity | **Low** |
| Location | `script.js` ~11701–11703 calls `saveDataToAPI()` directly after data load |
| Impact | Unexpected 401 or partial migration noise on localhost/production load. |
| Fix | Gate on `checkAuthentication()` or fold into `saveData()`. |

---

## WEB-017 — Supply inventory quantity not reduced on sale

| Field | Detail |
|-------|--------|
| Classification | **ambiguity** |
| Severity | **Low** (if supplies tracked by qty) |
| Location | Supply items use `type: 'inventory'` with `quantity`; mark-sold flow targets project-style sold status |
| Impact | Stock counts may stay unchanged when consumables sold (if workflow used). |
| Fix | Clarify business rule; decrement qty or separate consumables workflow. |

---

## WEB-018 — `SECURITY_ISSUES_EXPLAINED.md` understates public read exposure

| Field | Detail |
|-------|--------|
| Classification | **contradiction** |
| Severity | **Medium** (process) |
| Evidence | Doc claims low risk for NoSQL injection because “authentication required for sensitive operations” — **reads are not protected**. |
| Fix | Update security doc after WEB-001 remediation. |

---

## WEB-019 — Puppeteer regression suite unstable / misaligned with auth

| Field | Detail |
|-------|--------|
| Classification | **risk** (QA signal reliability) |
| Severity | **Medium** |
| Location | `test-smoke.js`, `test-comprehensive.js`, `test-modal-separation.js` |
| Observed (2026-10-28) | Smoke: project edit timeout; modals: protocol error after smoke; comprehensive: `networkidle0` 60s timeout. |
| Hypothesis | Load race before cards render; sequential runs without browser restart; edit test expects modal without login while `editItem` requires auth. |
| Impact | CI/local "DO NOT DEPLOY" may reflect test/env issues, not regressions. |
| Fix (audit-only note) | Add login fixture, wait for data load, relax navigation strategy, serialize suites. |

---

## WEB-020 — Data Management tab hidden on mobile viewports

| Field | Detail |
|-------|--------|
| Classification | **defect** (UX / ops) |
| Severity | **Medium** |
| Location | `styles.css` ~4522–4526 |
| Observed | `@media` rule `display: none !important` on `.nav-btn[data-tab="data"]` and `#data`. Browser ~428px width: no Data tab in nav. |
| Expected | Embroidery `enabledTabs` includes `data` (`/api/config`). |
| Impact | Phone/tablet users cannot reach backup/import/export without desktop width. |
| Fix | Mobile-friendly Data entry or remove `!important` hide. |

---

## WEB-K01 — Knitting tenant inherits unauthenticated GET exposure

| Field | Detail |
|-------|--------|
| Classification | **defect** (same class as WEB-001) |
| Severity | **Critical** on knitting deployment |
| Evidence | Local knitting mode `GET :3003/api/inventory` → 200. See `knitting-tenant-audit.md`. |

---

## WEB-K02 — localStorage not tenant-scoped

| Field | Detail |
|-------|--------|
| Classification | **risk** |
| Severity | **Medium** |
| Location | `embroideryInventory`, `embroiderySales`, etc. |
| Impact | Same browser using embroidery + knitting localhost ports could merge wrong offline data. |

---

## Optional improvements (verified need)

| ID | Title | Benefit |
|----|-------|---------|
| WEB-IMP-01 | Rate limit `/api/login` | Reduce brute force on public URL |
| WEB-IMP-02 | ETag/version on client data snapshot | Detect overwrite conflicts before POST |
| WEB-IMP-03 | Email sales UI showing `comparison.rows` | Reduce wrong auto-sold items |
| WEB-IMP-04 | Accessibility pass on modals (focus trap) | Keyboard-only operation for shop use |

---

## Remediation order (initial)

1. WEB-001 + WEB-010 (confidentiality boundary)  
2. WEB-002 + WEB-003 (credential/session hardening)  
3. WEB-004 (integrity under save)  
4. WEB-006 (financial consistency)  
5. WEB-008, WEB-007 (reporting/invoice correctness)  
6. WEB-005, WEB-012, WEB-011 (feature completeness / ops UX)

**Recommended first fix batch scope:** Items 1–4 only — closes public data leak, hardens auth material, stops partial DB corruption class, aligns shop money rules.
