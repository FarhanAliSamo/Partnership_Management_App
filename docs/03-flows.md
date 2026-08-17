# 03 — Flows

> End-to-end user, data, and financial flows for **F CRM**.
> These flows are read in conjunction with [`11-screens.md`](11-screens.md) (per-screen behavior) and [`07-calculation-engine.md`](07-calculation-engine.md) (exact math).

---

## 1. Authentication & Session Flow

```
App launch
  │
  ├─► Check secure store for session token
  │     ├─ No token ──────────────────► Login screen
  │     └─ Token exists ──► Validate/restore session
  │                            │
  │                            ├─ Valid ──► App lock check (if enabled)
  │                            │              ├─ Biometric/passcode ok ─► Main tabs
  │                            │              └─ Fail ─► Stay locked / retry
  │                            └─ Invalid/expired ──► Login screen
  │
Login screen
  │  (Admin / Manager credentials only, no signup)
  ▼
Authenticate (secure) ──► identify role ──► persist session ─► Main tabs
```

- **Session restoration**: on cold start, restore session from secure storage; if valid, skip login.
- **Logout**: clears secure session + any cached role; returns to Login.
- **App lock**: optional biometric (Face ID / Touch ID / device auth) or passcode; enforced on app foreground/resume.

---

## 2. Daily Earning Reminder Flow

```
App opens (first time today)
  │
  ├─► Does today have an earning OR closed-day record?
  │     ├─ Yes ──► No modal. (If closed, Home shows "Closed" state.)
  │     └─ No  ──► Show "Today's Earning" modal:
  │                 "Have you added today's earning?"
  │                 Actions: [Add Earning] [Later] [Shop Closed / No Earning]
  │
  ▼
Add Earning ────────────────► Add Earning form
Later ──────────────────────► Close modal → compact banner at top of Home (with Add)
Shop Closed / No Earning ──► Closed Day form (reason required/optional, photos)
```

- Reminder must not be annoying: once "Later" chosen, only compact banner persists; full modal not re-shown same day unless user re-taps banner.
- Daily notifications (configurable time) follow the same "is today recorded?" check.

---

## 3. Earning Entry & Same-Day Flow

```
Add Earning (from modal / banner / Earnings tab)
  │
  ├─► Does an earning already exist for selected date?
  │     ├─ No ──► Fresh form
  │     └─ Yes ──► Show existing record + actions:
  │                 [View] [Edit] [Add another entry]
  │
  ▼
Form:
  - Date (default today)
  - Total earning (major units input → minor units stored)
  - Optional note
  - Optional photos (Camera / Gallery → compress)
  - Status (Open)
  │
  ▼
Validate → save locally (sync state = Pending if offline)
  │
  ▼
Auto-calculate:
  - Daily total
  - Admin share (round)
  - Manager share (remainder)
  │
  ▼
Write Activity log entry
  │
  ▼
Sync to backend (if online) → sync state = Synced
```

- Multiple entries per day allowed; daily total is recomputed.
- No manual entry of shares.

---

## 4. Closed Day Flow

```
Earnings tab / Home banner → "Shop Closed / No Earning"
  │
  ▼
Form:
  - Date
  - Status = Closed / No Earning
  - Reason (optional text or required per config)
  - Optional photos
  │
  ▼
Save → DailyBusinessStatus record (type = CLOSED)
  │
  ▼
Appears in earnings history as:
  "Closed — No Earning"
  Reason: "Maintenance"
  (distinct visual state)
  │
  ▼
Excluded from open-day averages; NOT counted as missing/zero
```

---

## 5. Expense Flow

```
Add Expense
  │
  ▼
Form:
  - Date
  - Amount
  - Category (Equipment/Repair/Maintenance/Purchase/WiFi/Other)
  - Description
  - Optional photos
  - Notes
  │
  ▼
Save → Expense record
  │
  ▼
Classification:
  - WiFi        → shared (before split) per config
  - Non-WiFi    → deducted from Admin share per rule
  │
  ▼
Settlement calculator reflects the treatment (see 07-calculation-engine)
  │
  ▼
Activity log + sync
```

---

## 6. Investment Flow

```
Add Investment
  │
  ▼
Form:
  - Item name
  - Amount
  - Date
  - Category
  - Description
  - Optional photo(s)
  │
  ▼
Save → Investment record (individual item)
  │
  ▼
Investment dashboard aggregates:
  - Total investment
  - Admin/Manager investment (if tracked)
  - Item count
  - By category
  │
  ▼
Investment detail → full info + photos
```

- Investment deletion is **Admin-only** and protected.

---

## 7. Loan & Repayment Flow

```
Add Loan
  │
  ▼
Form:
  - Lender (Admin / Manager)
  - Borrower (the other partner)
  - Amount
  - Date
  - Reason
  - Notes
  │
  ▼
Save → Loan (status = Active, remaining = amount)
  │
  ▼
Loan detail:
  Original amount
  Repayments list
  Remaining balance
  │
  ▼
Add Repayment:
  - Amount
  - Date
  - Note
  - (recorded by) auto from session
  │
  ▼
remaining -= amount
  if remaining <= 0 → status = Paid
  │
  ▼
Activity log + sync
```

- Net position shown as plain sentence ("Manager Owes Admin Rs. X").

---

## 8. Monthly Settlement Flow

```
Month ends (settlement day)
  │
  ▼
Generate settlement:
  1. totalMonthlyEarning
  2. shared expenses (WiFi) → netBusinessProfit
  3. adminShare / managerShare
  4. adminShare -= non-WiFi expenses (rule)
  5. final due per partner
  │
  ▼
Store settlement snapshot (immutable)
  │
  ▼
Manager allocation:
  - Take My Share
  - Pay Loan
  - Split Share
  │
  ▼
Allocations stored in settlement;
  loan payment → creates LoanRepayment → updates loan balance
  │
  ▼
Payment status:
  Pending → Partially Paid → Paid (as payments released)
  │
  ▼
Activity log + sync
```

---

## 9. Sync Flow (Offline → Online)

```
Local write (add/edit)
  │
  ▼
Save to SQLite with sync_state = Pending
  │
  ▼
UI shows cloud icon + "Pending Sync"
  │
  ▼
(Online detection)
  ├─ Auto-sync triggered
  └─ Manual "Sync Now" / "Retry"
  │
  ▼
Push pending records (earliest first)
  └─ Photos uploaded separately, then record updated
  │
  ▼
success ─► sync_state = Synced; update "Last synced"
failure ─► sync_state = Sync Failed; show "Retry"
  │
  ▼
Conflict (same record changed remotely + locally):
  - Preserve server version + local version
  - Mark state = Conflict
  - Surface resolution UI (keep local / keep server / manual merge)
```

---

## 10. Data Export / Backup Flow

```
Settings → Data
  ├─ Export data (JSON/CSV snapshot of financial records)
  └─ Backup (local file via FileSystem)
  └─ Restore (if supported)
```
- Uses Expo FileSystem; files shareable via system share sheet.

---

## 11. Cross-Cutting Events (Activity Log)

Every financial mutation writes an Activity entry:

| Action | Example Text |
|--------|--------------|
| Add earning | "Farhan added today's earning: Rs. 8,500" |
| Add expense | "Manager added expense: Rs. 2,000" |
| Repay loan | "Manager repaid loan: Rs. 5,000" |
| Settlement paid | "August settlement marked as paid" |
| Add investment | "Investment added: Gaming PC - Rs. 250,000" |

Stores: user, action, record type, date/time.

---

## 12. Data Ownership & Permission Flows

- Every mutation checks the **permission matrix** (see [`08-roles-permissions.md`](08-roles-permissions.md)) before writing.
- Manager-triggered destructive actions are denied with a clear message, unless the admin has granted an override via permissions config.