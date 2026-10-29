# Website forensic audit — CyndyP StitchCraft Inventory Manager

**Audit date:** 2026-10-27 (America/Chicago)  
**Repository:** `/Users/cyndyp/Desktop/Projects/Embroidery`  
**Application:** `embroidery-inventory-manager` v1.0.128 (`package.json`)  
**Stack:** Express + MongoDB Atlas + static SPA (`index.html`, `script.js`, `styles.css`)  
**Production URL (evidence):** `https://embroidery-inventory-manager.vercel.app/`  
**Local URL (documented):** `http://localhost:3002` (`agent.md`, `.env` PORT)

## Scope completed

| Pass | Focus | Status |
|------|--------|--------|
| A | Inventory, architecture, tenant config, API surface | Complete (code + config) |
| B | Pages, tabs, modals, client workflows | Complete (HTML + `script.js` sampling) |
| C | Inventory/sales math, Keera email-sales, persistence | Complete (code trace + unit tests) |
| D | Security, failure paths, ops | Partial (safe probes; no destructive tests) |
| E | Findings reconciliation + coverage ledger | Complete |
| F | Verification pass 2 (BL-01, UI, knitting, IMAP safe checks) | Partial — see pass-2 docs below |

## Executive health assessment

The site is a **mature single-tenant embroidery shop operations tool** (projects, WIP, completed work, supply inventory, customers, sales, invoices, reports, backup/import). Core happy paths are implemented with substantial client-side logic (~17k lines in `script.js`) and a **small server** (`server.js`) that persists six MongoDB collections via **authenticated full-replace POST** endpoints.

**Health is mixed:** day-to-day shop workflows appear thoughtfully built (commission-aware sales, invoices, price tags, local/cloud save split), but **data confidentiality and write integrity** are weaker than the login-gated UX implies. The largest business risks are **unauthenticated read access to all operational data on production**, **non-transactional multi-collection saves**, and **commission/date rule divergence** between manual UI sales and Keera email automation.

## Artifacts in this folder

| File | Purpose |
|------|---------|
| [coverage.md](./coverage.md) | Component/workflow ledger |
| [workflows.md](./workflows.md) | End-to-end maps and sources of truth |
| [findings.md](./findings.md) | WEB-xxx findings with evidence |
| [verification.md](./verification.md) | Checks run, results, limits |
| [blockers.md](./blockers.md) | Gaps and next actions |
| [ui-verification-pass2.md](./ui-verification-pass2.md) | Browser + Puppeteer pass 2 |
| [knitting-tenant-audit.md](./knitting-tenant-audit.md) | Knitting vs embroidery |
| [imap-live-verification-procedure.md](./imap-live-verification-procedure.md) | Live IMAP/apply procedure |
| [bl04-decision-brief.md](./bl04-decision-brief.md) | Commission + quantity decisions |
| [test-all-output-2026-10-28.txt](./test-all-output-2026-10-28.txt) | Puppeteer run log |

## Isolated test artifact

- `../tests/api-readonly-probe-2026-10-27.js` — read-only HTTP probes (no writes to production except intentional unauthenticated POST expected to fail with 401).

## Remaining gaps (not claimed as fully verified)

- Puppeteer `test:all` green (BL-01 partial: smoke 5/6; modals/comprehensive setup failures — WEB-019).
- Full UI at desktop width including Data tab; most modals/workflows untested in browser.
- Per-modal keyboard/a11y audit.
- Live IMAP Keera poll/apply (BL-02 — procedure written; not executed).
- Multi-browser concurrent edit race on production.
- Knitting partner auth E2E and production knitting URL (BL-03 partial).
- BL-04 business decisions before commission/supply fix acceptance.

## Recommended first fix batch (see findings.md)

1. **WEB-001** — Require session (or separate read token) on all GET `/api/*` data routes, or move sensitive reads behind auth middleware.
2. **WEB-002 / WEB-003** — Remove hardcoded credential/session defaults; fail fast if env vars missing in production.
3. **WEB-004** — Replace per-collection delete-all + insert-all with versioned upsert or single transactional write pattern.
4. **WEB-006** — Unify shop commission rules (date-aware) between `script.js` and `lib/email-sales/config.js`.
