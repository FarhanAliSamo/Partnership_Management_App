# 04 — Data Model

> Clean relational model for **F CRM**. Stored in SQLite (local/offline) and mirrored to backend.
> All monetary values use **integer minor units** (default `amount_minor`), never floats.

---

## 1. Global Conventions

- **IDs**: UUID strings, primary keys.
- **Timestamps**: ISO-8601 UTC strings (`created_at`, `updated_at`).
- **Business dates**: `YYYY-MM-DD` strings (local date, no timezone ambiguity).
- **Audit**: every financial record has `created_by`, `updated_by` (user ID).
- **Sync**: every syncable record has `sync_state` (`synced` | `pending` | `failed` | `conflict`), `local_version`, `remote_version`.
- **Soft delete**: financial records support `deleted_at` (nullable) instead of hard delete.

---

## 2. Entity Relationship Diagram (logical)

```
Users ──1:N── ActivityLogs (created_by)
Roles ──1:N── Users

Earnings ──1:N── Attachments
Expenses ──1:N── Attachments
Investments ──1:N── Attachments

DailyBusinessStatus (1 per business-date; type = OPEN/CLOSED)

Loans ──1:N── LoanRepayments

MonthlySettlements ──1:N── SettlementAllocations
MonthlySettlements ──1:N── Payments

Settings (singleton / key-value)
SyncQueue (all pending local mutations)
```

---

## 3. Entity Definitions

### 3.1 Users
| Field | Type | Notes |
|-------|------|-------|
| `id` | TEXT PK | UUID |
| `username` | TEXT UNIQUE | "admin" / "manager" |
| `role_id` | TEXT FK → Roles | |
| `display_name` | TEXT | "Farhan" etc. |
| `pin_hash` / `credential_hash` | TEXT | hashed local credential (optional) |
| `biometric_enabled` | INTEGER | 0/1 |
| `created_at` / `updated_at` | TEXT | ISO-8601 |

> Stored credentials are for local auth. Remote auth uses a backend token; only a session token is persisted in SecureStore.

### 3.2 Roles
| Field | Type | Notes |
|-------|------|-------|
| `id` | TEXT PK | |
| `key` | TEXT UNIQUE | `admin` / `manager` |
| `name` | TEXT | "Admin" / "Manager" |
| `permissions` | TEXT (JSON) | see [`08-roles-permissions.md`](08-roles-permissions.md) |

---

### 3.3 Earnings
One record per earning entry (multiple allowed per day).

| Field | Type | Notes |
|-------|------|-------|
| `id` | TEXT PK | |
| `business_date` | TEXT | `YYYY-MM-DD` |
| `amount_minor` | INTEGER | total earning in minor units |
| `note` | TEXT | optional |
| `status` | TEXT | `open` (earning) |
| `created_by` / `updated_by` | TEXT FK → Users | |
| `created_at` / `updated_at` | TEXT | |
| `sync_state` | TEXT | |
| `local_version` / `remote_version` | INTEGER | conflict detection |
| `deleted_at` | TEXT nullable | soft delete |

> Daily total = SUM(amount_minor) grouped by `business_date`. Shares are **derived**, never stored on Earnings.

---

### 3.4 DailyBusinessStatus
Tracks open/closed state per business date, plus zero-earning open days.

| Field | Type | Notes |
|-------|------|-------|
| `id` | TEXT PK | |
| `business_date` | TEXT UNIQUE | one status per day |
| `status` | TEXT | `open` \| `open_zero` \| `closed` |
| `reason` | TEXT | required/optional for `closed` |
| `created_by` | TEXT FK | |
| `created_at` / `updated_at` | TEXT | |
| `sync_state` / versions / `deleted_at` | — | standard sync fields |

> Attachments for closed-day photos may link via `entity_type = daily_status`.

---

### 3.5 Expenses
| Field | Type | Notes |
|-------|------|-------|
| `id` | TEXT PK | |
| `business_date` | TEXT | |
| `amount_minor` | INTEGER | expense amount |
| `category` | TEXT | `equipment` \| `repair` \| `maintenance` \| `purchase` \| `wifi` \| `other` (configurable) |
| `description` | TEXT | |
| `notes` | TEXT | optional |
| `is_wifi` | INTEGER | derived flag (category = wifi) OR explicit |
| `created_by` / `updated_by` | TEXT FK | |
| timestamps / sync / soft-delete | — | standard |

---

### 3.6 Investments
| Field | Type | Notes |
|-------|------|-------|
| `id` | TEXT PK | |
| `item_name` | TEXT | "Gaming PC" |
| `amount_minor` | INTEGER | |
| `business_date` | TEXT | |
| `category` | TEXT | configurable |
| `description` | TEXT | |
| `contributor` | TEXT | `admin` \| `manager` \| `both` (for split tracking) |
| `created_by` / `updated_by` | TEXT FK | |
| timestamps / sync / soft-delete | — | standard |

---

### 3.7 Loans
| Field | Type | Notes |
|-------|------|-------|
| `id` | TEXT PK | |
| `lender` | TEXT | `admin` \| `manager` |
| `borrower` | TEXT | `admin` \| `manager` |
| `amount_minor` | INTEGER | original amount |
| `business_date` | TEXT | |
| `reason` | TEXT | |
| `notes` | TEXT | |
| `status` | TEXT | `active` \| `paid` |
| `remaining_minor` | INTEGER | derived but cached for fast queries |
| `created_by` / `updated_by` | TEXT FK | |
| timestamps / sync / soft-delete | — | standard |

---

### 3.8 LoanRepayments
| Field | Type | Notes |
|-------|------|-------|
| `id` | TEXT PK | |
| `loan_id` | TEXT FK → Loans | |
| `amount_minor` | INTEGER | repayment amount |
| `business_date` | TEXT | |
| `note` | TEXT | |
| `source` | TEXT | `manual` \| `settlement` (where it came from) |
| `settlement_id` | TEXT FK nullable | if created by settlement |
| `recorded_by` | TEXT FK → Users | |
| timestamps / sync | — | standard |

---

### 3.9 MonthlySettlements
| Field | Type | Notes |
|-------|------|-------|
| `id` | TEXT PK | |
| `month` | TEXT | `YYYY-MM` |
| `total_earning_minor` | INTEGER | snapshot |
| `shared_expense_minor` | INTEGER | WiFi (if shared) snapshot |
| `net_profit_minor` | INTEGER | snapshot |
| `admin_share_minor` | INTEGER | snapshot |
| `manager_share_minor` | INTEGER | snapshot |
| `admin_expense_minor` | INTEGER | non-WiFi deducted from admin |
| `admin_due_minor` | INTEGER | final due |
| `manager_due_minor` | INTEGER | final due |
| `status` | TEXT | `pending` \| `partial` \| `paid` |
| `created_by` / `updated_by` | TEXT FK | |
| timestamps / sync | — | standard (settlements immutable once finalized) |

> **Settlement rows are immutable snapshots.** Editing rules later must not mutate these stored numbers.

---

### 3.10 SettlementAllocations
Answers "where did the money go" for a settlement + partner.

| Field | Type | Notes |
|-------|------|-------|
| `id` | TEXT PK | |
| `settlement_id` | TEXT FK → MonthlySettlements | |
| `partner` | TEXT | `admin` \| `manager` |
| `allocation_type` | TEXT | `received` \| `loan_payment` \| `expense` \| `other` |
| `amount_minor` | INTEGER | |
| `loan_id` | TEXT FK nullable | if loan payment |
| `note` | TEXT | |
| `created_by` / `updated_by` | TEXT FK | |
| timestamps / sync | — | standard |

---

### 3.11 Payments
Settlement payment releases.

| Field | Type | Notes |
|-------|------|-------|
| `id` | TEXT PK | |
| `settlement_id` | TEXT FK → MonthlySettlements | |
| `partner` | TEXT | `admin` \| `manager` |
| `amount_minor` | INTEGER | |
| `business_date` | TEXT | |
| `status` | TEXT | `released` \| `received` (marking) |
| `note` | TEXT | |
| `marked_by` | TEXT FK → Users | |
| timestamps / sync | — | standard (append-only) |

---

### 3.12 Attachments
Photos linked to any record.

| Field | Type | Notes |
|-------|------|-------|
| `id` | TEXT PK | |
| `entity_type` | TEXT | `earning` \| `expense` \| `investment` \| `daily_status` |
| `entity_id` | TEXT | FK (not enforced to single table) |
| `local_uri` | TEXT | local FileSystem path |
| `remote_uri` | TEXT nullable | uploaded URL |
| `mime_type` | TEXT | |
| `size_bytes` | INTEGER | compressed size |
| `upload_state` | TEXT | `pending` \| `uploaded` \| `failed` |
| timestamps / sync | — | standard |

---

### 3.13 ActivityLogs
| Field | Type | Notes |
|-------|------|-------|
| `id` | TEXT PK | |
| `user_id` | TEXT FK → Users | |
| `action` | TEXT | `created` \| `updated` \| `deleted` \| `repaid` \| `marked_paid` |
| `record_type` | TEXT | `earning` \| `expense` \| `loan` \| `settlement` \| `investment` |
| `record_id` | TEXT | |
| `message` | TEXT | human-readable ("Farhan added today's earning: Rs. 8,500") |
| `created_at` | TEXT | |

---

### 3.14 SyncQueue
| Field | Type | Notes |
|-------|------|-------|
| `id` | TEXT PK | |
| `entity_type` | TEXT | |
| `entity_id` | TEXT | |
| `operation` | TEXT | `create` \| `update` \| `delete` |
| `payload` | TEXT (JSON) | full record snapshot |
| `status` | TEXT | `pending` \| `in_progress` \| `failed` \| `conflict` |
| `attempts` | INTEGER | |
| `last_error` | TEXT | |
| timestamps | — | |

---

### 3.15 Settings
Key-value (singleton rows or JSON doc).

| Field | Type | Notes |
|-------|------|-------|
| `key` | TEXT PK | e.g. `businessName`, `adminSharePercent` |
| `value` | TEXT (JSON) | typed value |

See [`02-business-rules.md`](02-business-rules.md) §6 for the settings catalog.

---

## 4. Relational Integrity

- FK constraints where SQLite + backend support them.
- Foreign key on soft-delete: do **not** cascade-hard-delete financial children; use `deleted_at`.
- `MonthlySettlements` and `Payments` are append-only in practice; edits create new version rows if strictly required, but never overwrite history.

---

## 5. Indexes (performance)

Recommended SQLite indexes:
```
Earnings    (business_date)
Expenses    (business_date, category)
Investments (business_date, category)
Loans       (borrower, lender, status)
LoanRepayments (loan_id)
MonthlySettlements (month)
SettlementAllocations (settlement_id)
Payments (settlement_id)
ActivityLogs (created_at, record_type)
SyncQueue (status, created_at)
Attachments (entity_type, entity_id)
```

---

## 6. Money Type Strategy

- **Storage**: `amount_minor` INTEGER (paisa). Major units = `amount_minor / 10^currencyMinorUnits`.
- **Conversion**: UI input major → `Math.round(major * 10^minorUnits)`.
- **Display**: minor → formatted string (see [`07-calculation-engine.md`](07-calculation-engine.md)).
- **No floating point** in storage or arithmetic on financial amounts.