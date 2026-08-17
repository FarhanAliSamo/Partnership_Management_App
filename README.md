# F CRM — Partnership Finance CRM for a Two-Person Gaming Zone

Production-grade mobile application for managing the finances and operations of a gaming-zone business owned by two partners (Admin + Manager).

This repository's `docs/` folder contains **complete, self-contained documentation**. Any developer or AI agent can understand the entire product and continue implementation **by reading these docs alone** — without re-reading the original build prompt.

---

## Documentation Index

Read the docs in this order for the fastest ramp-up:

| # | File | What it covers |
|---|------|----------------|
| 1 | [`docs/01-requirements.md`](docs/01-requirements.md) | Full product requirements, scope, goals |
| 2 | [`docs/02-business-rules.md`](docs/02-business-rules.md) | Business rules, configurable settings, partnership split logic |
| 3 | [`docs/03-flows.md`](docs/03-flows.md) | End-to-end user, data, and financial flows |
| 4 | [`docs/04-data-model.md`](docs/04-data-model.md) | Entities, fields, relationships, money handling |
| 5 | [`docs/05-architecture.md`](docs/05-architecture.md) | Tech stack, layers, service/repository architecture |
| 6 | [`docs/06-project-structure.md`](docs/06-project-structure.md) | Concrete file/folder layout of the codebase |
| 7 | [`docs/07-calculation-engine.md`](docs/07-calculation-engine.md) | Centralized financial calculation specification |
| 8 | [`docs/08-roles-permissions.md`](docs/08-roles-permissions.md) | RBAC permission matrix for Admin and Manager |
| 9 | [`docs/09-offline-sync.md`](docs/09-offline-sync.md) | Offline-first strategy, sync queue, conflict handling, photo sync |
| 10 | [`docs/10-ui-design.md`](docs/10-ui-design.md) | Design system, visual language, UX rules, accessibility |
| 11 | [`docs/11-screens.md`](docs/11-screens.md) | Complete screen inventory with per-screen behavior |
| 12 | [`docs/12-roadmap.md`](docs/12-roadmap.md) | Implementation phases, development process, testing plan |
| 13 | [`docs/13-implementation-log.md`](docs/13-implementation-log.md) | Work completed, decisions made, current build status |

---

## Product Summary (1-minute brief)

- **App**: Offline-first private finance + operations CRM for a single 2-person gaming-zone partnership.
- **Users**: Exactly two — **Admin** (full access) and **Manager** (restricted operational access). No public signup.
- **Core financial rule**: Daily earnings recorded → monthly earnings split 50/50 → WiFi handled separately → other expenses deducted from Admin's share → loans tracked independently → month-end settlement shows exactly where every rupee went.
- **Key modules**: Earnings, Closed-day recording, Expenses, Investments, Loans + Repayments, Monthly Settlements (+ allocations & payment status), Reports/Analytics, Activity log, Settings.
- **Non-negotiables**:
  - Offline-first (everything works without internet, syncs later).
  - Financial integrity (integer minor units, centralized calc engine, no silent history changes).
  - Premium, minimal, financial-SaaS visual quality.
  - Role-based permissions centralized and extensible.

---

## Conventions

- **Money** is always stored/calculated in **integer minor units** (paisa for PKR), never floats.
- **Currency**: PKR (Rs.) by default, configurable.
- **Dates**: Stored as ISO-8601 strings (`YYYY-MM-DD`) for business dates; ISO-8601 timestamps for audit fields.
- **IDs**: UUID strings.

---

> Tip for a new AI agent: read the docs in order 1 → 13, then begin implementation at phase 0 in [`docs/12-roadmap.md`](docs/12-roadmap.md).