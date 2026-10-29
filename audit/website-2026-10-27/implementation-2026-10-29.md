# Implementation log (user-approved batches)

**Date:** 2026-10-29

## Batch 1
- GET data routes require session; `/api/snapshot` GET/POST added with transactional save (fallback sequential).
- Production requires `SESSION_SECRET` and `ADMIN_PASSWORD`; no default admin password in code.
- Client loads/saves via `/api/snapshot`; login gate hides nav/main until authenticated; no save without login.

## Batch 2
- Shop commission 10% for Flippin' Happy / First Avenue (`SHOP_VENDOR_AUTO_COMMISSION_PERCENT`).
- Monthly report default commission 10%; invoice PDF uses listed/net/commissionAmount fields; dashboard revenue uses netAmount.

## Batch 3
- Gallery/ideas API and seed removed from server; Keera email integration removed (`lib/email-sales`, scripts, npm deps).
- Data tab mobile hidden unchanged (decision B).
- Force login for app interaction.

## Batch 4
- No code changes (deferred).

## Deploy note
Ensure Vercel has `ADMIN_PASSWORD` and `SESSION_SECRET` set before deploy.
