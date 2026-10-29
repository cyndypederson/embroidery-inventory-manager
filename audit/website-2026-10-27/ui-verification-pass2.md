# UI verification — pass 2 (2026-10-28)

**Environment:** Local `http://localhost:3002/`, server connected to MongoDB (embroidery tenant).  
**Method:** Cursor IDE browser automation (narrow viewport ~428px width) + Puppeteer suites.

## Browser checks performed

| Scenario | Expected (source) | Actual | Result |
|----------|-------------------|--------|--------|
| App load | Title + nav tabs | StitchCraft title; Projects–Reports nav visible | Pass |
| Projects tab | Card grid with actions | Many Edit/Copy/Delete buttons | Pass |
| Edit project (logged out) | `requireAuthentication('edit this item')` blocks edit | First snapshot included "Edit Project" in DOM; later clicks blocked by auth overlay (`Authentication Required`, username field intercepts) | **Partial** — auth gate confirmed on repeat; initial state ambiguous (modal markup always in DOM) |
| Log in control | Header button | "Log in" visible | Pass |
| Data Management tab | In `enabledTabs` on embroidery | **Not exposed** in nav at mobile width | Fail (see WEB-020) |
| Knitting cross-link | Hidden on embroidery tenant | Not shown | Pass |

## Puppeteer `npm run test:all` (2026-10-28)

**Server:** `node server.js` on :3002, Mongo connected.  
**Note:** Tests use same `.env` MongoDB as local dev (read-heavy; comprehensive/modal tests do not submit forms per code review).

| Suite | Outcome | Notes |
|-------|---------|-------|
| `test:smoke` | **5 pass, 1 fail** (83.3%) | Fail: "Project Edit Modal Opens" — timeout waiting for `#projectsCards .project-card button[onclick^="editItem"]` |
| `test:modals` | **Setup error** | `waitForSelector(button[data-tab="projects"])` ProtocolError after smoke run (browser/session instability) |
| `test:comprehensive` | **Setup error** | Navigation timeout 60s on `networkidle0` (likely parallel/hung browser or load strategy) |

### Smoke failure analysis

- **Not proven application bug:** Local browser pass showed edit buttons after load; failure consistent with **API load race** (10s wait) or **auth change** (`editItem` requires login — smoke does not authenticate, so even if click runs, modal should not open).
- **Test harness gap:** Smoke expects edit modal without login; contradicts `editItem` auth requirement (~6837–6840).

## Coverage ledger updates

| Area | Pass 2 status |
|------|----------------|
| Tab navigation (desktop-width automation) | Partial (smoke pass for projects/inventory) |
| Modal open (add/edit) | Partial (comprehensive not completed) |
| Auth-gated edit | Verified in code + browser overlay |
| Mobile Data tab | Verified hidden via CSS |
| Sales/Reports/Completed flows | Not exercised in browser this pass |
| Invalid input / double submit | Not exercised |

## Remaining UI verification

- All tabs at **≥1200px** viewport including **Data** tab.  
- Login → add project → save (needs test DB or rollback — not run against shared DB).  
- Invoice, price tag, import/export modals.  
- Fix/re-run Puppeteer with login helper and `domcontentloaded` instead of `networkidle0`.
