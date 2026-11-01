# Implementation log — audit completion batch

**Date:** 2026-11-01

## Already on production (prior batches)

- WEB-001 authenticated data reads
- WEB-002 / WEB-003 env-based admin + session handling
- WEB-004 snapshot transactional save (client primary path)
- WEB-005 / WEB-011 gallery, ideas, Keera email removed
- Monthly shop commission model (business rule; supersedes audit WEB-006 date-aware 20%/30% spec)

## This batch

| ID | Change |
|----|--------|
| WEB-006 | Monthly + vendor-discount model (continued); `getSaleRevenueAmount` for analytics |
| WEB-007 | Analytics/reports use `getSaleRevenueAmount` |
| WEB-008 | Invoice PDF skips per-line shop commission; note for monthly statement |
| WEB-009 | Sales store `inventoryItemId`; stable `_id` on items; lookup by id |
| WEB-010 | CORS allowlist (Vercel URL, localhost, configured site URLs) |
| WEB-012 | Push local-only sync merges inventory, customers, and sales via snapshot |
| WEB-013 | `agent.md` updated |
| WEB-014 | Removed public `/data/*` static routes from `vercel.json` |
| WEB-015 | Partner password minimum 8 characters (server) |
| WEB-016 | `updateExistingSalesWithCommission` requires login before save |
| WEB-017 | Supply quantity decrements on mark-sold; UI labels quantity on hand |
| WEB-018 | `SECURITY_ISSUES_EXPLAINED.md` updated for authenticated reads |
| WEB-019 | Puppeteer smoke tests log in via `test-utils/auth-login.js` |
| WEB-020 | Data tab visible on mobile (removed CSS hide) |
| WEB-K02 | Tenant-prefixed localStorage with legacy key migration |
| WEB-IMP-01 | Login rate limit (30 attempts / 15 min per IP) |
| Ops | Removed hardcoded Mongo URI fallbacks from `auto-backup.js`, `data-integrity-test.js` |

## Still open / out of scope

- **WEB-019 full suite:** modals/comprehensive tests not fully re-run green
- **WEB-IMP-02** client snapshot ETag conflict detection
- **WEB-IMP-04** modal focus-trap a11y pass
- **BL-02** Keera live IMAP (integration removed)
- **BL-03** knitting production E2E
- **BL-04 supply** formal business sign-off (implemented decrement-on-sold as default behavior)

## Deploy

Set `ADMIN_PASSWORD`, `MONGODB_URI`, and optionally `SESSION_SECRET` on Vercel. Redeploy after env changes.
