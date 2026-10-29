# Blockers and limitations (reconciled 2026-10-28)

| ID | Item | Status | What it prevents | Action / evidence this pass | Next action | Owner |
|----|------|--------|------------------|------------------------------|-------------|-------|
| BL-01 | Full Puppeteer `test:all` green | **Partially closed** | Automated UI regression sign-off | Server on :3002; smoke **5/6** pass; modals/comprehensive failed setup; log in `test-all-output-2026-10-28.txt`; browser UI pass in `ui-verification-pass2.md` | Fix test auth/login + navigation; re-run suites isolated | Dev/QA |
| BL-02 | Live Keera IMAP apply | **Open** | Closing WEB-011 live behavior | Dry-run default verified; isolated `applyUniqueMatches` mock pass; procedure in `imap-live-verification-procedure.md` | Authorized dry-run IMAP poll, then staged apply | Ops |
| BL-03 | Knitting tenant | **Partially closed** | Production knitting sign-off | Code diff + `:3003` config/inventory probe; `knitting-tenant-audit.md` | Partner E2E on staging; prod URL probe | Dev |
| BL-04 | Commission + supply qty decisions | **Decision-ready** | Closing WEB-006, WEB-017 acceptance | `bl04-decision-brief.md` with options A/B/C | Business owner picks options | Business |
| BL-05 | Post-fix WEB-001 verification | **Open** | Production privacy closure | Baseline GET 200 documented | After fix: probe returns 401 | Dev |

## BL-01 closure criteria vs result

| Criterion | Met? |
|-----------|------|
| Server starts and tests connect | Yes |
| `test:all` completes all three suites | **No** (chain stops; modals/comprehensive errored) |
| Failures triaged app vs test | Yes → primarily **test timing/auth** + **navigation strategy** (WEB-019) |
| Independent browser verification | Partial (pass 2 doc) |

**Conclusion:** BL-01 **not fully closed**; automated suite still blocked, manual/browser partial coverage added.

## BL-03 closure criteria vs result

| Criterion | Met? |
|-----------|------|
| Config/feature differences documented | Yes |
| Separate DB isolation understood | Yes (config-level) |
| Runtime knitting behavior | Partial (read-only local) |
| Partner flows tested | No (no auth POST) |

## BL-02 closure criteria

See `imap-live-verification-procedure.md` — requires authorized IMAP + optional apply.

## BL-04 — decision questions (unchanged IDs)

1. **Commission:** Authoritative schedule for Flippin' Happy — see `bl04-decision-brief.md` §A (recommend Option A).  
2. **Supply quantity:** Stock vs tag count — see §B (recommend explicit choice).  
3. **Gallery/ideas:** Roadmap vs remove API (**WEB-005**) — still open, not blocking BL-04.

## Remediation planning readiness

| Workstream | Ready? | Blocked by |
|------------|--------|------------|
| WEB-001–004 security/integrity | **Yes** | — |
| WEB-006 commission fix | **Design only** | BL-04 Option A/B/C |
| WEB-017 supply behavior | **Design only** | BL-04 quantity decision |
| WEB-011 Keera UI + live apply | **No** | BL-02 |
