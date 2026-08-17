# 01 — Requirements

> Full product requirements, scope, and goals for **F CRM**.

---

## 1. Product Definition

A **production-ready mobile application** for a two-person gaming-zone business partnership.

- This is **not** a demo, prototype, or simple CRUD app.
- It is a real financial/business management product intended for actual production use.
- The app is for **exactly two roles**:
  - **Admin** — full access and control.
  - **Manager** — restricted operational access.

### Explicit non-goals (do NOT add)
- Public registration / signup
- Multiple businesses / tenants
- Teams (beyond Admin + Manager)
- Unnecessary enterprise features

---

## 2. Quality Bar

The app must be:

- Clean, modern, premium, simple to use
- Highly responsive
- Offline-first
- Secure
- Visually polished
- Maintainable & production-ready

It should feel like:

> **A premium private partnership finance + operations CRM designed specifically for a two-person gaming-zone business.**

### Must NOT
- Look AI-generated or like a generic template.
- Prioritize visual effects over correctness.
- Duplicate business/calculation logic across screens.
- Silently overwrite or lose financial data.

---

## 3. Tech Stack

| Concern | Technology |
|---------|------------|
| Framework | Expo (latest stable) |
| Language | TypeScript (strict) |
| UI | React Native + modern RN architecture |
| Navigation | Expo Router (file-based) |
| State | Zustand (lightweight) |
| Server state | TanStack Query / React Query (where appropriate) |
| Local DB | SQLite (persistent/offline) |
| Files/images | Expo FileSystem |
| Camera/photo | Expo Image Picker + Expo Camera |
| Notifications | Expo Notifications |
| Biometrics | Expo Local Authentication |
| Secrets | Secure storage (expo-secure-store) |
| Backend API | Proper backend integration |
| Architecture | Clean service/repository pattern |

**Constraints:** modern, stable libraries only; no unnecessary dependencies.

---

## 4. Core Business Context

The app manages a gaming zone owned by two partners.

### Business rules (primary)
1. Daily business earnings are recorded.
2. Monthly earnings are divided **50/50** between the two partners.
3. **WiFi** has special treatment and is handled separately.
4. Other business expenses are **deducted from the Admin's 50% share** (partnership rule).
5. Loans between the two partners are tracked independently.
6. At month-end, each partner can receive their share or use part/all to settle outstanding loans.
7. Monthly settlements must show **exactly where the money went**.
8. Investments must be tracked from the beginning.
9. Admin sees: investment recovery, return, ROI, run rate, average sales, financial performance.
10. Manager sees useful operational + personal financial info, but does **not** have full control.

### Configurability
All major business rules must be **configurable** rather than hardcoded where practical.

---

## 5. Roles & Permissions

### Admin
Full access. Can:
- Create, View, Edit, Update, Delete, Add, Approve
- Manage settlements, investments, loans, expenses
- View reports & advanced analytics
- Manage settings
- Manage manager permissions where appropriate
- Has the complete business overview

### Manager
Restricted access. Can:
- Add earnings
- Add daily expenses
- View earnings & expenses
- View relevant loans
- Add loan repayments where allowed
- View settlements
- Manage their month-end share (allowed workflow)

Manager must **NOT** have unrestricted access to:
- Business settings
- Role management
- Investment deletion
- Critical financial configuration
- Destructive historical financial actions

> Permissions must be **centralized and easy to extend**.

---

## 6. Authentication

- Exactly two authorized accounts: **Admin** and **Manager**.
- **No public signup.**
- After login, identify role → show correct permissions/UI.
- Support:
  - Secure authentication
  - Persistent session
  - Logout
  - Session restoration
  - Optional biometric app lock (Face ID / Touch ID / device auth)

---

## 7. Main Navigation

Bottom navigation (5 tabs):

1. **Home**
2. **Earnings**
3. **Expenses**
4. **Finance**
5. **More**

**Finance** contains (nested):
- Investments
- Loans
- Settlements
- Reports

**More** contains:
- Activity
- Settings

> Do not create too many bottom tabs. Use nested navigation + clean contextual actions.

---

## 8. Module Requirements (summary)

Detailed per-screen behavior lives in [`11-screens.md`](11-screens.md). Core module rules:

### Home / Dashboard
- First screen.
- Daily earning reminder: on first open each day, if today's earning not recorded, show clean modal:
  - **"Today's Earning"** — "Have you added today's earning?"
  - Actions: **Add Earning** / **Later** / **Shop Closed / No Earning**
- "Later" → close modal, show compact banner (with **Add** action) at top of Home.
- Reminder must not be annoying. Support daily reminder notifications.

### Zero-Earning / Shop Closed
- Optional flow when shop is closed for a day.
- User must NOT be forced to enter `0` manually.
- Fields: Date, Status (`Closed / No Earning`), optional reason, optional photos, created by, timestamp.
- Must be clearly visible in earnings history as **"Closed — No Earning"** with reason.
- **Do NOT** count closed days as missing earnings or as zero-earning days.
- Average calculations must distinguish:
  - Open day **with** earning
  - Open day **with zero** earning
  - **Closed** day

### Earnings
- Add fields: Date, Total earning, optional note, optional multiple photos, Status.
- Photos from Camera or Gallery, compressed & optimized.
- After save: auto-calculate Total, Admin 50%, Manager 50% (no manual share entry).
- Same-day handling: if today's earning exists, show existing record with View / Edit / Add another entry (support multiple entries/day while keeping daily totals accurate).
- History filters: Today, This week, This month, Previous months, Custom date range.
- History rows show: Date, Daily total, Admin share, Manager share, Open/Closed status, attachments indicator.

### Expenses
- Add fields: Date, Amount, Category, Description, multiple optional photos, Notes.
- Categories: Equipment, Repair, Maintenance, Purchase, WiFi, Other (configurable).
- **WiFi handled separately**; other expenses deducted from Admin share.
- Show calculations clearly, not hidden in a single total.
- List filters: Date, Category, Current month, Custom range.
- Card shows: Amount, Category, Description, Date, Photo count.

### Investments
- Add fields: Item name, Amount, Date, Category, Description, Optional photo(s).
- Example items: Gaming PC, AC, Furniture, Gaming chair, Monitor, Networking equipment, Renovation, Other.
- Each record saved individually.
- Dashboard: Total Investment, Admin Investment, Manager Investment (if applicable), total item count, investment by category, history, total invested.
- Each item opens full details + photos.

### Investment Recovery & Return
- Calculate: Total investment, Cumulative net return, Amount recovered, Remaining to recover, Recovery %, ROI, Estimated payback period, Average monthly net return, Current monthly run rate.
- Payback estimate must be **labeled as an estimate** (never presented as guaranteed).
- Keep concepts separate:
  **Revenue → Expenses → Net Business Profit → Partner Share → Cumulative Return → Investment Recovery**. Do NOT treat total sales as ROI.

### Run Rate & Average Sales
- Show (Admin + Manager): Average Daily Earning, Average Monthly Earning, Current Month Total, Current Month Run Rate, Projected Month-End Earning, Previous Month Comparison.
- Properly account for closed days. Clearly label each metric.

### Loans
- Always between Admin ↔ Manager.
- Track: Lender, Borrower, Amount, Date, Reason, Notes, Status, Remaining balance.
- Dashboard: **"Manager Owes Admin Rs. X"** or **"Admin Owes Manager Rs. X"** (plain sentences, no confusing accounting terms).

### Loan Repayments
- Every loan supports repayments/installments.
- Loan detail: Original Amount, Repayments list, Remaining Balance.
- Repayment stores: Amount, Date, Note, who recorded it.
- Loan auto-becomes **Paid** when remaining = 0.

### Monthly Settlement
- End-of-month reconciliation.
- Steps: Total Monthly Earnings → Admin 50% / Manager 50% → apply expenses, WiFi treatment, loan adjustments, approved adjustments.
- UI must make **obvious how every amount was derived**.

### Manager's 50% Settlement Options
- Manager chooses: **Take My Share** / **Pay Loan** / **Split Share**.
- System auto-updates loan balance; all allocation details stored in settlement.

### Money Allocation / Breakdown
- Each settlement must answer **"Where did the money go?"** with a visual breakdown.

### Payment Status
- Settlement states: **Pending / Partially Paid / Paid**.
- Authorized user marks payments as released/received.
- Store: Amount, Date, Status, optional note, who marked it. Keep payment history.

### Reports / Analytics
- Admin sees: Revenue, Profit, Investment, Loans, Settlements, Trends.
- Charts clean & mobile-friendly; do not overcrowd.

### Activity / History
- Complete activity timeline (user, action, record type, date/time).
- Examples: "Farhan added today's earning: Rs. 8,500".

---

## 9. Offline-First

- App works without internet for: view data, add earning, mark closed, add expense, add investment, add loan, add repayment, add photos, view reports.
- All offline changes stored locally first; never block on internet.

### Sync
- Every local record has sync state: **Synced / Pending Sync / Sync Failed**.
- Visual indicator (cloud icon + Pending).
- Auto-sync when internet returns; provide **Sync Now** and **Retry**.
- Show **"Last synced: 2 min ago"**. No overly technical details.

### Photo sync
- Offline: save image locally, associate with record, mark upload pending.
- Online: upload image, update remote record, mark synced, remove temp files.
- Compress images; never upload huge originals.

### Conflict handling
- Use timestamps/versioning.
- If same record changed in multiple places → conflict state; preserve latest server + local versions until resolved.
- Financial data must never disappear silently.

---

## 10. Notifications

- Daily earning reminder (configurable time) — if no earning or closed status for today.
- Settlement reminders, pending payment reminders, loan reminders, sync failure notifications.

---

## 11. Settings

- **Business Settings**: gaming zone name, currency, default split %, expense rules.
- **Partner Settings**: Admin profile, Manager profile.
- **Notification Settings**: daily reminder, reminder time, settlement reminders.
- **Sync**: last synced, pending count, sync now.
- **Security**: biometric lock, app passcode.
- **Appearance**: Light / Dark / System.
- **Data**: Export, Backup, Restore (where supported).

---

## 12. UX / UI

- Premium modern mobile UI: clean, minimal, sophisticated, financial-SaaS aesthetic.
- Excellent spacing, soft cards, strong typography, subtle gradients, smooth transitions, elegant micro-interactions, clear hierarchy, no clutter.
- One refined accent color + dark/light neutral surfaces.
- Home uses progressive disclosure (do not show every metric at once).
- Zero-earning day states visually distinct (see [`10-ui-design.md`](10-ui-design.md)).

### Responsiveness
- Support small/standard/large phones; no fixed pixel positioning; safe areas; keyboard handling.

### Accessibility
- Accessible labels, touch targets, contrast, keyboard behavior, screen-reader friendly, reduced motion.

### Performance
- Fast startup, 60fps animations, optimized lists (virtualized), image compression, lazy loading, efficient SQLite queries, minimal re-renders.

---

## 13. Data Model

Core entities (detailed in [`04-data-model.md`](04-data-model.md)):

Users, Roles, Earnings, Daily Business Status, Expenses, Investments, Loans, Loan Repayments, Monthly Settlements, Settlement Allocations, Payments, Attachments, Activity Logs, Sync Queue, Settings.

Every financial record: ID, Created at, Updated at, Created by, Updated by, Sync state.

---

## 14. Financial Integrity

- Never use floating point carelessly for money.
- Store money as **integer minor units** (e.g., paisa for PKR) or precise decimal strategy.
- Never silently change historical settlement results.
- Centralized calculation logic; no duplication.
- Dedicated financial calculation service; unit-test important calculations.
- Deterministic important calculations.

---

## 15. Error Handling & Safety

Handle: offline, API errors, validation, image upload, sync failure, auth expiry, duplicate data, invalid financial values.

- Understandable messages; never raw technical errors.
- Destructive actions: confirmation dialogs (e.g., "Delete this expense?" + warning that it affects settlements).
- Prefer soft-delete or protected deletion for historical data.

---

## 16. Acceptance Criteria

Complete when ALL of:
- Admin & Manager can log in.
- Role-based permissions work.
- Daily earning can be added.
- Closed days recorded with reason.
- Earnings split 50/50 automatically.
- Expenses work; WiFi handled separately.
- Investments tracked.
- Loans + repayments work.
- Monthly settlement calculates correctly.
- Manager allocates share toward loan repayment.
- Payment statuses work.
- Admin analytics, ROI, recovery, averages, run rate work.
- Offline records + photos can be created.
- Offline records sync when internet returns.
- Sync states visible.
- Data persistent.
- Important financial calculations tested.
- UI responsive & polished.
- Errors handled properly.
- Production build succeeds.