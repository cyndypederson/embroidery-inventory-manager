# Verification log

Format: **Scenario | Expected (source) | Actual | Result | Evidence | Limitations**

## Automated / isolated tests

| Scenario | Expected | Actual | Result | Evidence |
|----------|----------|--------|--------|----------|
| Keera parser + matcher fixtures | All tests pass (`scripts/test-keera-parser.js`) | All passed | Pass | Terminal run 2026-10-27 |
| Local server health | DB connected when `.env` present | `{"status":"OK","database":"Connected"}` | Pass | curl localhost:3002 after `node server.js` |
| POST /api/inventory without cookie | 401 (`requireSessionAuth`) | 401 local + production | Pass | curl |
| GET /api/inventory without cookie | Not defined in code as public | 200 local + production (~59KB prod) | **Fail security expectation** | curl size probe |
| npm run test:smoke | App loads on :3002 | 5/6 pass; project edit timeout | Partial | 2026-10-28; see `test-all-output-2026-10-28.txt` |
| npm run test:modals | Modal separation | Setup ProtocolError | Fail (env) | After smoke; WEB-019 |
| npm run test:comprehensive | Full UI | Navigation timeout 60s | Fail (env) | networkidle0; WEB-019 |
| applyUniqueMatches isolated | Mock DB apply | All checks pass | Pass | `audit/tests/apply-unique-matches-isolated-2026-10-28.js` |
| Knitting tenant :3003 | Config + empty GET inventory | Pass | Pass | `knitting-tenant-audit.md` |
| Browser UI pass 2 | Tabs, auth overlay, mobile Data tab | Partial | Pass/Partial | `ui-verification-pass2.md` |
| Pattern library routing | — | Not run | n/a | Out of website scope |

## Manual code verification (selected)

| Scenario | Expected | Actual | Result |
|----------|----------|--------|--------|
| `saveDataToAPI` includes gallery/ideas | If APIs exist, persisted | Only 4 collections | Fail feature parity |
| `loadDataFromAPI` loads gallery | Fetch `/api/gallery` | Sets `gallery=[]` | Fail |
| Email poller dry-run default | Safe default | `EMAIL_SALES_DRY_RUN` unset → dry-run true; log "dry-run=true" | Pass |
| `applyUniqueMatches` when `dryRun: false` | Writes sold + sale | Code path updates inventory + insertOne sale | Inspected not runtime |

## Production read-only probe (2026-10-27)

Commands executed without auth (no session cookie):

```
GET https://embroidery-inventory-manager.vercel.app/api/inventory → 200, ~59012 bytes
POST https://embroidery-inventory-manager.vercel.app/api/inventory [] → 401
GET https://embroidery-inventory-manager.vercel.app/api/config → 200 JSON tenant embroidery
```

**Limitation:** Response bodies not archived in repo (contain PII). Status codes and sizes recorded only.

## Local auth probe (2026-10-27)

```
GET http://localhost:3002/health → 200 Connected
GET http://localhost:3002/api/inventory → 200
POST http://localhost:3002/api/inventory → 401
```

## Verified working (with evidence type)

| Behavior | How verified |
|----------|----------------|
| Write operations require session | Code inspection + POST 401 probe |
| Mongo session store configured | `connect-mongo` in `server.js` |
| Client offline save path | Code path `saveData` → localStorage when unauthenticated |
| Keera parsing/classification | Unit tests pass |
| Tenant config public endpoint | Production GET `/api/config` |
| Invoice merge local/server | Code inspection `mergeInvoiceLists` |
| Price tag print structure | Code inspection `generatePriceTagsHTML` |

## Not verified / sampled only

- Full UI modal workflows (30+ modals) — pass 2: projects + auth only
- Concurrent two-tab save race
- IMAP live poll and non-dry-run apply
- Import CSV edge cases and formula injection
- Mobile layout on real devices
- Vercel cold-start session behavior
- Complete npm `test:comprehensive` / axe accessibility suite

## Local server ops note (2026-10-28)

Long-running `node server.js` on :3002 terminated with **exit 1** after repeated Keera polls (`IMAP mailbox "Sales" not found; falling back to INBOX`, then unhandled `ImapFlow` `authenticationFailed`). **Implication:** scheduled IMAP can crash the whole Node process if credentials fail or connection drops; unrelated to HTTP serving until poll runs. For local dev, disable IMAP env vars or fix `IMAP_*` / mailbox name.

## Re-run probe

```bash
node audit/tests/api-readonly-probe-2026-10-27.js
```
