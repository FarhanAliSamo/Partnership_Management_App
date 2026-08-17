# 11 — Screens

> Complete screen inventory with per-screen behavior, for **F CRM**.
> Routes map to `app/` (see [`06-project-structure.md`](06-project-structure.md)). Visual guidelines in [`10-ui-design.md`](10-ui-design.md).

---

## 1. Authentication

### Login
- **Access**: all (no session).
- Fields: username (Admin/Manager), password/PIN.
- No signup link.
- On success: identify role → persist secure session → route to Main tabs.
- Error: friendly ("Incorrect credentials. Try again.").
- Link/option to enable biometric after first success.

### App Lock (biometric/passcode)
- **Access**: when security enabled.
- Prompts Face ID/Touch ID/device auth or passcode.
- Enforced on foreground/resume.
- Provides "Use password instead" fallback where available.

---

## 2. Main Tabs

### Bottom Tabs
Home · Earnings · Expenses · Finance · More

- Role-driven: Manager may see reduced tabs/items (Finance entries still visible but investment/edit actions limited per [`08-roles-permissions.md`](08-roles-permissions.md)).

---

## 3. Home / Dashboard

- **Access**: Admin + Manager (Admin full, Manager personal/operational).

### Layout (progressive disclosure)
1. Greeting ("Good evening, Farhan") + date.
2. Today's Status badge (Open / Closed / Not recorded).
3. Today's Earning hero number.
4. Today's Share: Admin/Manager mini split.
5. Reminder banner (if no earning + not closed) with **Add** action.
6. **Current Month** card (expandable):
   - Revenue, Average Daily Earning, Run Rate.
7. Expandable: Your Share, Friend Share.
8. Outstanding Loans (plain sentence: "Manager Owes Admin Rs. X").
9. Settlement Status (latest month, payment state).
10. Investment Recovery (progress bar + %) — Admin emphasis; Manager may see reduced/zero.

### Empty state
- When no data: "No earnings recorded yet." + primary CTA "Add today's earning".

---

## 4. Earnings

### Earnings List
- **Access**: Admin + Manager.
- Filters (SegmentedControl): Today, This week, This month, Previous months, Custom range.
- Row shows: Date, Daily total, Admin share, Manager share, Open/Closed status, attachment indicator.
- Closed day row distinct (see [`10-ui-design.md`](10-ui-design.md) §8).
- FAB/CTA: "Add Earning".
- Empty: "No earnings recorded yet."

### Add / Edit Earning
- Fields: Date (default today), Total earning, optional note, optional photos, status (Open).
- Same-day handling: if earning exists for date → show existing record + View/Edit/Add another.
- Shares auto-calculated; no manual share entry.
- Validation: amount ≥ 0; date within reason.
- Save → local-first → sync (Pending) → activity log.

### Earning Detail
- Full earning entry(s) for a date: amounts, shares, note, photos, created by, timestamps, sync state.
- Actions (role-gated): Edit, Delete (Admin only, confirm).

### Closed Day / No Earning
- Fields: Date, status = Closed, reason (required/optional per config), optional photos.
- Shows in history as "Closed — No Earning" + reason.
- Not counted as missing/zero.

---

## 5. Expenses

### Expense List
- **Access**: Admin + Manager.
- Filters: Date, Category, Current month, Custom range.
- Card: Amount, Category, Description, Date, Photo count.
- FAB: "Add Expense".
- Empty: "No expenses this month."

### Add / Edit Expense
- Fields: Date, Amount, Category, Description, optional photos, Notes.
- Categories: Equipment, Repair, Maintenance, Purchase, WiFi, Other.
- WiFi handled separately (financial treatment via calc engine).
- Save → local-first → sync → activity log.
- Delete: Admin only + confirm.

---

## 6. Finance (nested)

### Finance Hub
- Cards/links: Investments, Loans, Settlements, Reports.

---

## 7. Investments

### Investment List / Dashboard
- **Access**: Admin full; Manager basic view (if allowed).
- Summary cards: Total Investment, Admin Investment, Manager Investment, item count.
- Investment by category (donut/bar).
- History list; each item → detail.
- Empty: "No investments added yet."

### Add / Edit Investment
- Fields: Item name, Amount, Date, Category, Description, optional photo(s).
- Each record saved individually.
- Edit/Delete: Admin only + confirm.

### Investment Detail
- Full item info + photos.
- May include recovery context (Admin).

---

## 8. Loans

### Loan List / Dashboard
- **Access**: Admin + Manager (Manager: relevant loans only).
- Net position banner (plain sentence).
- List of loans with remaining balance + status.
- FAB: "Add Loan" (permission-gated).
- Empty: "No outstanding loans."

### Add / Edit Loan
- Fields: Lender, Borrower, Amount, Date, Reason, Notes.
- Save → status Active, remaining = amount.

### Loan Detail
- Original amount, Repayments list, Remaining balance.
- FAB: "Add Repayment".
- Auto status Paid when remaining = 0.

### Add Repayment
- Fields: Amount, Date, Note (recorded by auto).
- Updates loan balance; activity log + sync.

---

## 9. Settlements

### Settlement List
- **Access**: Admin + Manager.
- Cards by month: month, status (Pending/Partial/Paid), totals.
- Empty: "No settlements yet."

### Settlement Detail
- Full breakdown (see [`10-ui-design.md`](10-ui-design.md) §9):
  Total Earning → Admin Share / Manager Share → Admin Expenses → Final Due.
- Allocation breakdown ("Where did the money go?").
- Payment history.
- Actions: Admin can generate/approve; Manager can manage own allocation.

### Settlement Allocation
- Manager's 50% options: Take My Share / Pay Loan / Split Share.
- Live preview of Received vs Loan Payment.
- Save → creates allocations + creates repayment + updates loan balance.

### Payments
- Mark payment released/received (permission-gated).
- Payment history (append-only).

---

## 10. Reports / Analytics

- **Access**: Admin full; Manager basic only.

### Admin Reports
- **Revenue**: total, monthly, daily, average daily, average monthly.
- **Profit**: total expenses, net profit, partner share.
- **Investment**: total, recovery %, recovered, remaining, ROI, estimated payback.
- **Loans**: total outstanding, admin receivable, manager receivable.
- **Settlements**: paid / pending / partial counts.
- **Trends** (charts): monthly earning, expense, profit trend, investment recovery, partner comparison.

### Manager (basic)
- Average daily earning, current month total, run rate, previous month comparison, own share.

---

## 11. Activity / History

- **Access**: Admin + Manager.
- Timeline of every financial action (user, action, record type, date/time).
- Example: "Farhan added today's earning: Rs. 8,500".
- Empty: "No activity yet."

---

## 12. More (nested)

### More Hub
- Links: Activity, Settings.

### Settings
Sections:
- **Business Settings** (Admin): name, currency, split %, expense rules, categories.
- **Partner Settings** (Admin): Admin profile, Manager profile.
- **Notification Settings**: daily reminder toggle, reminder time, settlement reminders.
- **Sync**: last synced, pending count, Sync Now, Retry.
- **Security**: biometric lock toggle, app passcode.
- **Appearance**: Light / Dark / System.
- **Data**: Export, Backup, Restore (where supported).

> Apply permission matrix: Manager sees own security/appearance; Admin sees all + permission management.

---

## 13. Role-to-Screen Matrix

| Screen | Admin | Manager |
|--------|:-----:|:-------:|
| Login | ✅ | ✅ |
| App lock | ✅ | ✅ |
| Home | ✅ (full) | ✅ (personal/operational) |
| Earnings list/add/edit/detail | ✅ | ✅ (view/add; own edit) |
| Closed day | ✅ | ✅ |
| Expense list/add | ✅ | ✅ |
| Expense edit/delete | ✅ | ❌ (edit own config) |
| Investment list | ✅ | ✅ (basic) |
| Investment add | ✅ | config (default ❌) |
| Investment detail | ✅ | ✅ (basic) |
| Loan list/add | ✅ | ✅ (relevant; add config) |
| Loan detail/repay | ✅ | ✅ |
| Settlement list/detail | ✅ | ✅ |
| Settlement generate/approve | ✅ | ❌ |
| Allocation (own share) | ✅ | ✅ |
| Payments mark | ✅ | config (default ❌) |
| Reports full | ✅ | ❌ |
| Reports basic | ✅ | ✅ |
| Activity | ✅ | ✅ |
| Settings (business/partners/permissions) | ✅ | ❌ |
| Settings (security/appearance) | ✅ | ✅ (self) |

---

## 14. Required Empty-State Copy

| Screen | Empty state |
|--------|-------------|
| Home | "No earnings recorded yet." |
| Earnings | "No earnings recorded yet." |
| Expenses | "No expenses this month." |
| Loans | "No outstanding loans." |
| Investments | "No investments added yet." |
| Settlements | "No settlements yet." |
| Sync | "Everything is synced." |
| Activity | "No activity yet." |