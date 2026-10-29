# Live IMAP / Keera apply — verification procedure

**Status:** Live apply **not executed** in this audit (no authorization for state-changing mailbox/DB writes).

## What “apply” changes (code evidence)

When `EMAIL_SALES_DRY_RUN` is false **and** `applyUniqueMatches` receives `dryRun: false`:

| Step | Store | Mutation |
|------|-------|----------|
| Match row `outcome === 'unique_match'` | `inventory` | `updateOne`: `status: sold`, `dateSold`, `saleId` |
| Same row | `sales` | `insertOne` new sale (`saleSource: keera-email'`, commission from email month) |
| After poll with messages | `emailSaleJobs` | `insertOne` audit log (subjects, summary, dryRun flag) |

**Does not:** delete sales, mark email read/unread (verify in `lib/email-sales/imap.js` before live test), or touch customers except trial script side effect.

**Safe default:** `isDryRun()` true when env unset (`lib/email-sales/config.js`).

**Dry-run poll:** Still connects IMAP, reads messages, runs comparison; **no** inventory/sales apply when dry-run.

## Completed safe verification (this pass)

| Check | Proves | Evidence |
|-------|--------|----------|
| `npm run test:keera-parser` | Parse/match classification on fixtures | Pass (2026-10-27) |
| `audit/tests/apply-unique-matches-isolated-2026-10-28.js` | Apply path writes sold + sale with email commission/date when dry-run false | Pass (mock DB) |
| Code review `applyUniqueMatches` | Skips sold/gift; uses candidate `_id` | `lib/email-sales/poll.js` |
| Local server log | Poller scheduled with `dry-run=true` | Server startup log |

## What dry-run / mocks do **not** prove

- IMAP connectivity, credential rotation, mailbox folder selection on Midco.  
- Real email body quirks not in fixtures.  
- Duplicate poll applying twice (idempotency relies on `already_sold` / sold status).  
- Interaction with concurrent manual mark-sold.  
- `scripts/trial-keera-sales.js` side effect: **`customers.updateOne` for Flippin vendor #73** — not pure read-only; **do not run against production without approval**.

## Live verification procedure (requires explicit authorization)

### Preconditions

- [ ] Written approval to mutate **specific database** (`embroidery_inventory` vs `knitting_inventory`).  
- [ ] `EMAIL_SALES_DRY_RUN=true` for first live IMAP pass; then optional apply pass.  
- [ ] Staging clone of inventory/sales **or** backup snapshot documented.  
- [ ] Identify 1–2 **already sold** and 1–2 **unique_match** candidates from dry-run table.

### Steps

1. **Dry-run IMAP + compare**  
   - Env: `EMAIL_SALES_DRY_RUN=true`, valid `IMAP_*`, `MONGODB_URI`, `DB_NAME`.  
   - Authenticated `POST /api/email-sales/poll` **or** `node scripts/trial-keera-sales.js` (note customer update side effect in trial script).  
   - Capture: `comparison.summary`, rows with `wouldMarkSold`, ambiguous list.

2. **Idempotency check**  
   - Repeat dry-run poll immediately; expect `already_sold` / same summary counts for same messages.

3. **Apply pass (authorized only)**  
   - Set `EMAIL_SALES_DRY_RUN=false` on **non-production** or during approved maintenance window.  
   - Poll once; capture `applyResult.applied`.  
   - Verify Mongo: item `status`, new sale row, `emailSaleJobs` entry with `dryRun: false`.

4. **Duplicate apply**  
   - Poll again; expect `applied: 0` and `already_sold` for same lines.

5. **Reconciliation**  
   - Compare sale `commission` / `netAmount` to **BL-04** decision (20% vs 30% for June 2026).

### Recovery / cleanup

- Manual: revert inventory item to prior status; delete erroneous `sales` insert; document in change log.  
- No automated rollback in app.

### Evidence to close BL-02

- Dry-run log + JSON report with summary counts.  
- Apply pass: before/after inventory doc ids (redacted), sale ids, `emailSaleJobs` record.  
- Idempotent second apply output.

### Authorization still required

- Permission to set `EMAIL_SALES_DRY_RUN=false` on running deployment.  
- IMAP credentials access (ops `.env`, not chat).  
- If using `trial-keera-sales.js`: approval for **customer collection update** step.
