# 05 — Architecture

> Layered, clean, service/repository architecture for **F CRM**.
> Defines how the app is structured logically, independent of file-by-file layout (see [`06-project-structure.md`](06-project-structure.md)).

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                    UI LAYER (React RN)               │
│   Screens (Expo Router) + Reusable Components        │
│   Consumes: stores, hooks, formatted view models     │
└─────────────────────────┬───────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────┐
│              APPLICATION / STATE LAYER               │
│   Zustand stores (auth, sync, ui, session)          │
│   TanStack Query (server state cache)               │
│   Hooks (useEarning, useSettlement, ...)            │
└─────────────────────────┬───────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────┐
│                 DOMAIN / SERVICE LAYER               │
│   CalculationEngine (pure, central finance logic)   │
│   Services: EarningService, ExpenseService, ...     │
│   PermissionService (RBAC guards)                   │
│   SyncEngine (orchestration)                         │
└─────────────────────────┬───────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────┐
│            REPOSITORY / DATA ACCESS LAYER            │
│   SQLite repositories (local source of truth)       │
│   API client (backend)                              │
│   FileStore (image persistence)                     │
└─────────────────────────────────────────────────────┘
```

- **Single direction of dependency**: UI → State → Services → Repositories/Data.
- Services **never** import UI. UI **never** talks to SQLite/API directly.

---

## 2. Design Principles

1. **Local-first / offline-first**: SQLite is the authoritative store on device. Screens read from local; the backend is a synchronization target, not a required path for reads.
2. **Centralized finance**: all money math lives in `CalculationEngine` only. Screens consume results; they never re-implement formulas.
3. **Centralized permissions**: `PermissionService` is the only place role checks happen.
4. **Clean boundaries**: each layer has typed interfaces; repositories implement them.
5. **Deterministic**: calc engine and repositories are pure/testable; no `Date.now()`/random hidden inside business math.

---

## 3. Layer Details

### 3.1 UI Layer
- **Expo Router** file-based routes (see [`11-screens.md`](11-screens.md)).
- **Screens** are thin: read state via hooks, dispatch service calls, render components.
- **Components** (`components/`) are dumb/presentational where possible; receive props and callbacks.

### 3.2 State Layer
- **Zustand** stores:
  - `useAuthStore` — session, user, role, biometric state.
  - `useSyncStore` — sync queue status, last synced, pending count.
  - `useUiStore` — theme, modals, transient UI state.
- **TanStack Query**:
  - Used for **remote** server-state (when online) and caching.
  - Local SQLite is the primary source; React Query is the cache for backend-synced reads and provides optimistic UX for remote round-trips.
- **Hooks** (`hooks/`) wrap service + query consumption per domain.

### 3.3 Domain / Service Layer
- **`CalculationEngine`** — pure functions only (input snapshots → results). No I/O.
- **Services** — orchestrate repositories + calc engine + permissions + activity log + sync enqueue. Examples:
  - `EarningService.addEarning(input)` → validates → repo insert → calc → activity → enqueue sync.
  - `SettlementService.generateSettlement(month)` → gather → calc → snapshot store.
- **`PermissionService`** — `can(user, action, resource)` based on role matrix.
- **`SyncEngine`** — pulls pending from `SyncQueue`, pushes to API, resolves conflicts.

### 3.4 Repository / Data Layer
- **SQLite repositories** per entity (e.g., `EarningRepository`, `ExpenseRepository`).
- **`ApiClient`** — typed HTTP client for backend (auth, CRUD, file upload).
- **`FileStore`** — manages local image files, compression, temp cleanup.
- **`SecureStore`** — session token & secrets only (not SQLite).

---

## 4. Dependency Rules

- A module may import from layers **below** it, never above.
- Cross-domain services go through their own services, not repositories directly, unless it's a clear read-only query that belongs in a hook.
- `CalculationEngine` must be **pure** and import-free of app services.

---

## 5. Auth & Security

- Session token stored in **expo-secure-store** (never AsyncStorage/SQLite).
- Local credential (PIN/passcode) hash stored via SecureStore/SQLite (hashed, salted).
- Biometric via `expo-local-authentication`; app lock enforced on foreground/resume.
- Role identified post-login; permissions applied via `PermissionService`.

---

## 6. Offline & Sync (architecture view)

- Every write creates/updates a local record and **enqueues** a `SyncQueue` entry with `status = pending`.
- `SyncEngine` runs on connectivity change, app foreground, and manual "Sync Now".
- Successful push → `synced`; failure → `failed` (retryable); conflicts → `conflict`.
- Photos upload separately via `FileStore` + API, then the parent record is finalized.
- Details in [`09-offline-sync.md`](09-offline-sync.md).

---

## 7. Money Handling

- Single `Money` module (in calc engine) with:
  - `fromMajor(major: number, minorUnits: number): number` (integer minor)
  - `toMajor(minor: number, minorUnits: number): number`
  - `format(minor, currency, minorUnits, locale): string`
- Business math uses integer minor arithmetic; rounding centralized.

---

## 8. Testing Strategy

- **Unit tests**: `CalculationEngine` (all financial formulas), `PermissionService`, `money` conversion.
- **Repository tests**: SQLite CRUD (in-memory SQLite for CI).
- **Integration tests**: service flows (add earning → calc → activity → sync enqueue).
- **E2E/device tests**: login, offline create + sync, closed-day, settlement allocation (manual run).

---

## 9. Error Handling Strategy

- Typed `AppError` with `code`, `userMessage`, optional `cause`.
- Services throw `AppError`; UI catches and shows `userMessage` (never raw stack).
- Categories: `VALIDATION`, `OFFLINE`, `API`, `AUTH_EXPIRED`, `SYNC_FAILED`, `DUPLICATE`, `CONFLICT`.
- See [`01-requirements.md`](01-requirements.md) §15 for the full list.

---

## 10. Configuration & Environment

- Backend base URL via environment config (expo-build properties / `.env`).
- Business settings stored in DB (`Settings`), not hardcoded.
- Feature flags / role permissions in `Roles.permissions` JSON, editable by Admin.

---

## 11. Concurrency

- All DB writes serialized through a single write queue to avoid race conditions on offline sync.
- `local_version`/`remote_version` integers guard against lost updates.
- Idempotency keys (entity ID + operation) make push retries safe.