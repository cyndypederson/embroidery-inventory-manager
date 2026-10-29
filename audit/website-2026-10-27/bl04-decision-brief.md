# BL-04 decision brief — commission calendar and supply quantity

**Status:** Decision-ready (business choice required)  
**Does not block:** Remediation planning for WEB-001–004 (security/integrity)  
**Blocks:** Closing WEB-006, WEB-017, and financial acceptance criteria for mark-sold vs Keera vs Monthly Shop Statement

---

## A. Shop commission calendar

### Conflicting or divergent definitions (evidence)

| Source | Rule | Location |
|--------|------|----------|
| **Mark sold / auto sale from project** | **30%** if customer name contains `flippin` or `first avenue`; **ignores sale date** | `script.js` `getAutoCommissionPercentForShopCustomer` (~12790–12795), used in `createOrUpdateSaleFromProject` (~12901) |
| **Monthly Shop Statement (Reports)** | **20%** for calendar months **5–7 of 2026**; else **30%**; per-month override in `localStorage` | `script.js` `getDefaultShopCommissionPercent` (~14193–14198), `getShopReportCommissionPercent` |
| **Keera email automation** | Same date rule as report default: **20%** May–Jul 2026 | `lib/email-sales/config.js` `getDefaultShopCommissionPercent`; applied in `buildSaleFromItem` via parsed email month |
| **Knitting setup doc** | States partner sold items “auto-calculates at **30%**” | `KNITTING_SETUP.md` ~123 |
| **Keera plan doc** | Documents June 2026 **20%** and warns poller vs `createOrUpdateSaleFromProject` mismatch | `KEERA_SALES_EMAIL_PLAN.md` ~219–231 |
| **Parser tests** | June 2026 monthly fixture expects **20%** commission | `scripts/test-keera-parser.js` |

### Practical consequences

1. Item marked sold in **June 2026** via UI → sale row likely stored at **30%** commission.  
2. Same item sold via **Keera apply** (when enabled) → **20%** on `sales` row.  
3. **Monthly Shop Statement** for June 2026 → displays/calculates using **20%** (unless operator overrides in report UI).  
4. **Sales tab** and **reports** can disagree with **mark-sold** source data for the same month.  
5. Historical months outside May–Jul 2026 align at 30% on all paths **unless** report localStorage overrides exist.

### Decision required

**For Flippin' Happy / First Avenue shop sales, which commission schedule is authoritative?**

- **Option A (recommended): Date-aware unified schedule** — Adopt the existing **May–Jul 2026 → 20%, otherwise 30%** rule everywhere (`createOrUpdateSaleFromProject`, add-sale defaults, knitting doc, Keera). Single shared module; report overrides remain optional.  
  - *Why:* Matches Keera emails, parser tests, monthly report code, and documented 2026 shop agreement. Minimizes reconciliation work.  
- **Option B: Flat 30% always** — Change email + report defaults to 30%; update parser tests and Keera plan.  
  - *Why only if:* Business confirms 20% was report-only and never applied to consignment payouts.  
- **Option C: Report-only 20%** — Keep mark-sold at 30%; email/report use 20% for statements only (sales rows stay 30%).  
  - *Why not recommended:* Permanent mismatch between operational sales ledger and shop statements.

### Acceptance criteria (after decision)

- For fixture: shop customer, `dateSold = 2026-06-15`, listed price $100 → identical `commission`, `commissionAmount`, `netAmount` from: mark-sold, `buildSaleFromItem`, and monthly report default.  
- `KNITTING_SETUP.md` and `KEERA_SALES_EMAIL_PLAN.md` agree with code.

### Affected findings

- **WEB-006** (revise scope: mark-sold vs report/email, not “UI vs email” only)

---

## B. Supply inventory quantity

### What the code does today

| Behavior | Evidence |
|----------|----------|
| Supply items (`type: 'inventory'`) have **quantity**, **available / low-stock / out-of-stock** statuses | Add/edit inventory modals; `script.js` ~4363–4364 |
| **Mark as sold** flow is aimed at **projects** (and completed items); sets `status: 'sold'` | `completeMarkAsSold`, project cards |
| Supply **quantity is not decremented** when an item is sold or consumed | No code path subtracts `quantity` on sale; grep shows quantity used for **price tag copies** (~11588–11591) and **total value** display |
| Projects use **quantity** in `getProjectTotalPrice` for **listed price** (units × price) | ~12781–12784 |

### Missing business definition

The app supports two quantity semantics without documenting which is intended for supplies:

1. **Stock on hand** — selling/consuming should reduce `quantity`.  
2. **Display / tag count only** — quantity means “how many price tags to print” or “pack size,” not live stock.

### Practical consequences

- If staff treat Inventory quantity as **stock**, reports and on-hand counts will **overstate** after physical sales (no automatic decrement).  
- If quantity is **tag count only**, current behavior is **consistent** but the label “Quantity” on the Inventory tab is misleading for reorder decisions.  
- **No SKU / movement ledger** — adjustments are manual edits only.

### Decision required

**For supply inventory rows, should `quantity` represent decrementable stock on hand?**

- **Option A (recommended if you track thread/kits):** Yes — decrement (or block at zero) when marking consumed/sold; add explicit “adjust stock” or sale link for supplies.  
- **Option B (recommended if quantity = tags/pack size):** No — rename UI to “Tag count” / “Pack qty” and document that stock is not tracked; do not use mark-sold on supplies.

### Acceptance criteria (after decision)

- Documented rule in operator guide.  
- UI labels and workflows match (either decrement path exists or sold status unavailable for supplies).

### Affected findings

- **WEB-017** (clarify from ambiguity → defect or n/a based on decision)

---

## Gallery/ideas (related open question)

Not part of BL-04 numeric rules but listed in blockers: server collections exist; client clears arrays on load (**WEB-005**). Decision: retire API vs wire UI.
