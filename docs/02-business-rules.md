# 02 — Business Rules

> Definitive business rules, partnership split logic, and all configurable settings for **F CRM**.
> This is the **single source of truth** for how money flows. The calculation engine (see [`07-calculation-engine.md`](07-calculation-engine.md)) implements these rules — screens never re-derive them.

---

## 1. Partnership Structure

- Two partners only: **Admin** and **Manager**.
- Business is a single gaming zone. No multi-business support.

---

## 2. Core Money Flow (the canonical pipeline)

Always compute in this exact order and keep each stage distinct:

```
Revenue (Gross Earnings)
        │
        ▼
  (-) Expenses  ──►  (WiFi handled separately)
        │
        ▼
Net Business Profit
        │
        ▼
Partner Shares (50/50 split of monthly earnings)
        │
        ▼
Settlement Allocations (take share / pay loan / expenses)
        │
        ▼
Cumulative Return  ──►  Investment Recovery
                          (ROI, payback estimate)
```

> **Do NOT** collapse these stages. In particular, **total sales ≠ ROI**. ROI derives from cumulative net return vs. total investment.

---

## 3. Earnings Split Rule

- **Default split**: Admin 50% / Manager 50%.
- Split is **configurable** (stored in Business Settings) — e.g., 60/40 if partners ever agree.
- Shares are always **calculated automatically** from total earning; never manually entered.
- If multiple earning entries exist on one day, split applies to the **daily total**, not per-entry (per-entry split shown for reference only).

### Split formula
```
adminShare  = round(totalEarning * adminPercent / 100)
managerShare = totalEarning - adminShare   // keeps total exact
```
> Use integer minor units + integer arithmetic (see [`07-calculation-engine.md`](07-calculation-engine.md)). The "remainder" (rounding) goes to Admin by default so sums always reconcile.

---

## 4. Daily Earning States

A given calendar day is in exactly one of these states:

| State | Meaning | Counted in averages? |
|-------|---------|----------------------|
| **Open — with earning** | A normal operating day with recorded earning ≥ 0 | Yes (as open days) |
| **Open — zero earning** | Open, but explicitly recorded earning = 0 | Yes (as open days, value 0) |
| **Closed — No Earning** | Intentionally closed; has a status + optional reason | **Excluded** from "open day" averages; shown separately |
| **Unrecorded** | Nothing recorded yet | Excluded from averages; drives the daily reminder |

### Critical distinctions
- **Do NOT** treat a closed day as missing/zero.
- **Do NOT** treat every unrecorded day as zero.
- Average-daily metrics distinguish "open days" from "calendar days":
  - `avgDailyOnOpenDays` = total earning ÷ open-day count.
  - `avgDailyOnCalendarDays` = total earning ÷ calendar-day count (only for metrics explicitly labeled "calendar days").

---

## 5. Expense Rules

### Categories (default, configurable)
- Equipment
- Repair
- Maintenance
- Purchase
- **WiFi** (special)
- Other

### The WiFi rule (the single most important expense rule)
1. **WiFi expenses are financially separate** from other business expenses.
2. **All other (non-WiFi) expenses** are deducted from the **Admin's 50% share**.
3. WiFi is **not** deducted from Admin's share in the same way — it follows its own treatment (configurable):
   - Default treatment: WiFi is a **shared business expense** deducted **before** the 50/50 split (i.e., reduces net business profit that both partners share).
   - Configurable alternative: WiFi deducted from Admin share like other expenses.

> Since "other expenses → Admin's share" is itself a partnership rule, make it configurable too (see §6).

### Expense deduction in settlement (default)
```
monthlyEarning
  - sharedExpenses (WiFi default)
  = netBusinessProfit

netBusinessProfit
  → adminShare   = round(netBusinessProfit * adminPercent / 100)  - adminDeductibleExpenses
  → managerShare = round(netBusinessProfit * managerPercent / 100)
```
> Where `adminDeductibleExpenses` = sum of non-WiFi expenses (default rule). This is what makes Admin's final due lower.

---

## 6. Configurable Settings (Business Settings)

Stored in the `settings` table / business settings entity.

| Setting | Default | Notes |
|---------|---------|-------|
| `businessName` | "Gaming Zone" | Shown in header/settings |
| `currency` | PKR (Rs.) | Formatting only; values stored in minor units |
| `currencyMinorUnits` | 2 | Minor-unit precision (paisa) |
| `adminSharePercent` | 50 | Split numerator for Admin |
| `managerSharePercent` | 50 | Split numerator for Manager |
| `wifiExpenseTreatment` | `shared` | `shared` = before split, or `admin` = from Admin share |
| `adminBearsNonWifiExpenses` | `true` | Whether non-WiFi expenses come from Admin share |
| `expenseCategories` | (list above) | Configurable category list |
| `investmentCategories` | (list) | Configurable category list |
| `settlementDay` | last day of month | When settlements are generated |

> Split percentages must sum to 100 — validate on change.

---

## 7. Loan Rules

- Loans are always **between Admin and Manager** (two directions):
  - `manager_owes_admin` (Admin lent to Manager)
  - `admin_owes_manager` (Manager lent to Admin)
- Fields: Lender, Borrower, Amount, Date, Reason, Notes, Status, Remaining balance.
- Loans tracked **independently** from earnings/expenses.
- Repayments reduce remaining balance; auto-status → **Paid** when remaining = 0.

### Net loan position (dashboard)
```
managerOwesAdmin = sum(remaining of loans where borrower = Manager)
adminOwesManager = sum(remaining of loans where borrower = Admin)
netPosition      = managerOwesAdmin - adminOwesManager
```
Display as plain sentence:
- `net > 0` → **"Manager Owes Admin Rs. X"**
- `net < 0` → **"Admin Owes Manager Rs. X"**
- `net = 0` → **"No outstanding loans between partners."**

---

## 8. Settlement Rules

### Settlement generation (month end)
For a given month:
1. `totalMonthlyEarning` = sum of all earning entries in month (all days; closed days contribute 0 but are included as closed, not as zero).
2. Apply expense rule → `netBusinessProfit`.
3. `adminShare` = rounded share − admin-deductible expenses.
4. `managerShare` = rounded share.
5. Apply loan adjustments (repayments made via settlement allocation).
6. Produce **final due** for each partner.

### Example (from prompt)
```
Total Earnings      Rs. 200,000
Admin Share (50%)   Rs. 100,000
Manager Share (50%) Rs. 100,000
Admin Expenses      Rs.  15,000
--------------------------------
Admin Final Due     Rs.  85,000
Manager Final Due   Rs. 100,000
```

### Manager's 50% allocation options
For Manager's share, Manager may choose:
- **Take My Share** — receive full amount.
- **Pay Loan** — allocate all toward outstanding loan(s).
- **Split Share** — allocate part to loan, receive remainder.

Example: `managerShare = 100,000`, outstanding loan to Admin = 30,000.
- Pay Loan = 30,000 → Receive = 70,000.
- Or Pay Loan = 10,000 → Receive = 90,000.

### Allocation integrity
- `received + loanPayment + otherAllocations = partnerShare` (must reconcile exactly).
- Loan payments **automatically create loan repayments** and update loan balances.
- All allocation details are **stored** in the settlement (never just an on-screen number).

---

## 9. Payment Status Rules

Settlement payment states:
- **Pending**
- **Partially Paid**
- **Paid**

Rules:
- A settlement starts **Pending**.
- When total released ≥ final due → **Paid**.
- When 0 > released < final due → **Partially Paid**.
- Payment records store amount, date, status, note, and who marked it.
- Payment history is immutable (append-only).

---

## 10. Investment & Recovery Rules

### Investment tracking
- Each investment saved individually (item name, amount, date, category, description, photos).
- Totals:
  - `totalInvestment` = sum of all investment items.
  - `adminInvestment` / `managerInvestment` = per-contributor totals (if tracked).

### Recovery & return
Keep **Revenue vs. Return vs. Recovery** distinct:

| Concept | Formula |
|---------|---------|
| **Revenue** (Gross) | sum of all earnings |
| **Expenses** | sum of all expenses |
| **Net Business Profit** | Revenue − Expenses |
| **Partner Share** | Net Profit split per §3/§5 |
| **Cumulative Net Return** | Admin's cumulative share of net profit attributable to investment recovery (configurable basis) |
| **Amount Recovered** | Cumulative return already realized against investment |
| **Remaining to Recover** | Total Investment − Amount Recovered |
| **Recovery %** | Amount Recovered ÷ Total Investment × 100 |
| **ROI** | (Cumulative Net Return − Total Investment) ÷ Total Investment × 100 |
| **Avg Monthly Net Return** | cumulative net return ÷ number of months in operation |
| **Run Rate (current month)** | see §11 |
| **Payback Estimate** | `totalInvestment ÷ avgMonthlyNetReturn` (in months) — **labeled an estimate** |

> Default recovery basis: **Admin's cumulative net profit share** (since investments are typically tracked from Admin's perspective). Make this configurable — see `investmentRecoveryBasis` in settings.

### Example (from prompt)
```
Investment  Rs. 1,250,000
Recovered   Rs.   350,000
Remaining   Rs.   900,000
Recovery    28%
```
Payback estimate must be clearly labeled **estimate**; never presented as guaranteed.

---

## 11. Run Rate & Average Sales

### Definitions
- **Current Month Total** = sum of earnings in current month (open days only; closed days contribute 0 but are counted separately).
- **Average Daily Earning** = `totalEarning(open days) ÷ open-day count`.
- **Average Monthly Earning** = average of full historical monthly totals.
- **Current Month Run Rate** = `(currentMonthTotal ÷ elapsedOpenDaysSoFar) × projectedOpenDaysInMonth` (or calendar-day equivalent; clearly label which basis).
- **Projected Month-End Earning** = run rate projection.
- **Previous Month Comparison** = % delta vs previous month total.

### Closed-day handling
- Closed days are **excluded** from denominator for open-day-based metrics.
- If a metric uses calendar days, label it explicitly ("per calendar day").

> All averages include both "with earning" and "zero earning" open days (zero-earning open days are real open days).

---

## 12. Determinism & Integrity

- All calculations must be **deterministic** and centralized in the calculation engine.
- Money stored/calculated in **integer minor units**; convert to display strings only at the UI boundary.
- Historical settlements are **immutable snapshots** — recalculating current rules must not mutate previously stored settlement results.
- Rounding rule: use **round-half-away-from-zero**, remainder assigned to Admin (configurable).

---

## 13. Rationale & Defaults Cheatsheet

| Rule | Default | Configurable |
|------|---------|--------------|
| Partner split | 50/50 | Yes |
| WiFi → shared, deducted before split | Yes | Yes (`wifiExpenseTreatment`) |
| Non-WiFi expenses → Admin share | Yes | Yes |
| ROI recovery basis | Admin net profit share | Yes |
| Currency | PKR | Yes |
| Minor units | 2 | Yes |
| Expense categories | 6 defaults | Yes |
| Settlement day | month end | Yes |