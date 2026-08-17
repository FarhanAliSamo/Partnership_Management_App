# 12 — Roadmap & Development Process

> Ordered implementation phases and testing plan for **F CRM**.
> Begin work at **Phase 0**. Do not start by building random screens without architecture.

---

## 1. Development Principles

1. Inspect project structure first.
2. Define data model → navigation → permissions → calc services → storage → sync.
3. Build reusable UI components before screens.
4. Build screens → connect logic → test.
5. Test calculations, offline mode, sync, both roles, production build.

---

## 2. Phases

### Phase 0 — Scaffold & Foundation
- [ ] Init Expo + TypeScript + Expo Router.
- [ ] Install dependencies: zustand, tanstack/react-query, expo-sqlite, expo-file-system, expo-image-picker, expo-camera, expo-notifications, expo-local-authentication, expo-secure-store, netinfo, expo-router.
- [ ] TS config, path aliases, `.env`, folder structure per [`06-project-structure.md`](06-project-structure.md).
- [ ] Theme tokens (`src/theme/`) per [`10-ui-design.md`](10-ui-design.md).

### Phase 1 — Data Layer
- [ ] SQLite schema + migrations (all 15 entities, [`04-data-model.md`](04-data-model.md)).
- [ ] Indexes.
- [ ] `baseRepository` + entity repositories.
- [ ] Seed: Admin + Manager users, roles, default settings.

### Phase 2 — Calculation Engine (TDD)
- [ ] `money`, `split`, `expenses`, `settlements`, `allocations`, `loans`, `investments`, `analytics`.
- [ ] Unit tests for the full matrix in [`07-calculation-engine.md`](07-calculation-engine.md) §10.

### Phase 3 — Permissions & Auth
- [ ] `PermissionService` + role matrix ([`08-roles-permissions.md`](08-roles-permissions.md)).
- [ ] `authService` — login, session restore, logout, secure storage.
- [ ] Biometric app lock (`expo-local-authentication`).

### Phase 4 — Core UI Components
- [ ] `Screen`, `Card`, `Button`, `TextField`, `MoneyText`, `Badge`, `Modal`, `SegmentedControl`, `EmptyState`, `ErrorState`, `LoadingState`, `DateField`, `PhotoPicker`, `ConfirmDialog`, `SyncIndicator`.
- [ ] Domain cards: Earning, Expense, Investment, Loan, Settlement, AllocationBreakdown.
- [ ] Charts: Bar, Line, Donut.

### Phase 5 — Navigation Shell
- [ ] Auth routes (login, lock).
- [ ] Main tabs + nested Finance/More stacks.
- [ ] Navigation guards (session + role).

### Phase 6 — Earning & Closed-Day Module
- [ ] Earning list (filters) + add/edit/detail.
- [ ] Daily reminder modal + banner.
- [ ] Closed-day flow + distinct history states.
- [ ] Auto split on save.
- [ ] Activity log + sync enqueue.

### Phase 7 — Expense Module
- [ ] Expense list (filters) + add/edit.
- [ ] WiFi vs non-WiFi classification visible.

### Phase 8 — Investment Module
- [ ] Investment list/dashboard + add/edit/detail.
- [ ] Recovery/ROI/payback (Admin).

### Phase 9 — Loans & Repayments
- [ ] Loan list/net position + add/edit/detail.
- [ ] Repayment flow + auto-paid status.

### Phase 10 — Settlements & Payments
- [ ] Settlement list/detail + breakdown.
- [ ] Manager allocation (Take/Pay Loan/Split) → creates repayment.
- [ ] Payment statuses + history.

### Phase 11 — Reports & Analytics
- [ ] Revenue, profit, investment, loans, settlements, trends.
- [ ] Manager basic metrics.

### Phase 12 — Settings & Activity
- [ ] All settings sections (role-gated).
- [ ] Activity timeline.
- [ ] Data export/backup.

### Phase 13 — Offline & Sync
- [ ] SyncQueue + SyncEngine + conflict resolver.
- [ ] Photo compression + local persistence + upload.
- [ ] Sync indicators + "Sync Now"/"Retry"/"Last synced".
- [ ] Notifications (daily reminder, settlement, loan, sync failure).

### Phase 14 — Polish
- [ ] Accessibility, responsiveness, reduced motion.
- [ ] Empty/loading/error states everywhere.
- [ ] Dark mode.
- [ ] Performance: list virtualization, lazy loading, re-render checks.

### Phase 15 — Testing & Production Build
- [ ] Unit tests (calc engine + permission + money).
- [ ] Integration tests (service flows).
- [ ] Manual device test: offline create + photo + sync; both roles.
- [ ] Production build (`expo export` / EAS build) succeeds.

---

## 3. Testing Plan

### Unit
- Calculation engine (all formulas, incl. example cases).
- Money conversion round-trip.
- Permission matrix.

### Integration
- `EarningService.addEarning` → DB write → calc → activity → sync enqueue.
- `SettlementService.generateSettlement` → snapshot immutability.
- Allocation → repayment → loan balance update.

### Offline
- Create earning/expense/investment/loan offline.
- Attach photo offline.
- Verify sync states Pending.
- Reconnect → auto-sync → Synced.
- Simulate failure → Failed → Retry.

### Role
- Manager cannot access Admin-only actions (UI hidden + service blocked).
- Manager basic reports vs Admin full reports.

### Device / E2E (manual)
- Login both accounts.
- Full month-end settlement.
- Closed-day visualization.
- Payment status transitions.

### Production
- `npx expo export` (or EAS build) completes without errors.
- App launches, local data persists across restart.

---

## 4. Definition of Done (per [`01-requirements.md`](01-requirements.md) §16)

All acceptance criteria pass, plus:
- No duplicated calc logic.
- No raw technical errors in UI.
- Destructive actions have confirmation.
- Soft-delete on historical financial records.
- Sync visible & resilient.
- Production build succeeds.