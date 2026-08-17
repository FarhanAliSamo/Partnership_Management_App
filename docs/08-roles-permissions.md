# 08 — Roles & Permissions

> Centralized RBAC permission matrix for **F CRM**.
> Implemented in `PermissionService` (`src/services/permissionService.ts`). This is the **only** place role checks happen.

---

## 1. Roles

| Role Key | Display | Description |
|----------|---------|-------------|
| `admin` | Admin | Full access and control |
| `manager` | Manager | Restricted operational access |

- Exactly two accounts. No signup.
- Role is stored on the User record; permission decisions read from the centralized matrix (stored as JSON in `Roles.permissions`, editable by Admin).

---

## 2. Permission Model

```ts
type Permission =
  | 'earning:create' | 'earning:view' | 'earning:edit' | 'earning:delete'
  | 'closed_day:create' | 'closed_day:view' | 'closed_day:edit'
  | 'expense:create' | 'expense:view' | 'expense:edit' | 'expense:delete'
  | 'investment:create' | 'investment:view' | 'investment:edit' | 'investment:delete'
  | 'loan:create' | 'loan:view' | 'loan:edit' | 'loan:delete'
  | 'repayment:create' | 'repayment:view'
  | 'settlement:view' | 'settlement:manage' | 'settlement:approve'
  | 'allocation:manage_own'        // manager manages own share
  | 'payment:mark'                 // mark released/received
  | 'report:view'                  // full analytics
  | 'report:view_basic'
  | 'activity:view'
  | 'settings:business' | 'settings:partners' | 'settings:notifications'
  | 'settings:sync' | 'settings:security' | 'settings:appearance' | 'settings:data'
  | 'permission:manage'            // edit manager permissions
  | 'data:export' | 'data:restore';

type Resource = 'earning' | 'closed_day' | 'expense' | 'investment'
  | 'loan' | 'repayment' | 'settlement' | 'allocation'
  | 'payment' | 'report' | 'activity' | 'settings' | 'permission' | 'data';
```

---

## 3. Permission Matrix

| Capability | Admin | Manager |
|------------|:-----:|:-------:|
| **Earnings** | | |
| Add earning | ✅ | ✅ |
| View earnings | ✅ | ✅ |
| Edit earning | ✅ | ✅ (own-day; config) |
| Delete earning | ✅ | ❌ |
| **Closed Day** | | |
| Record closed day | ✅ | ✅ |
| View closed days | ✅ | ✅ |
| Edit closed day | ✅ | ✅ (own-day; config) |
| **Expenses** | | |
| Add expense | ✅ | ✅ |
| View expenses | ✅ | ✅ |
| Edit expense | ✅ | ✅ (own; config) |
| Delete expense | ✅ | ❌ |
| **Investments** | | |
| Add investment | ✅ | ✅ (config, default ❌) |
| View investments | ✅ | ✅ (basic) |
| Edit investment | ✅ | ❌ |
| Delete investment | ✅ | ❌ |
| **Loans** | | |
| Add loan | ✅ | ✅ (config) |
| View loans | ✅ | ✅ (relevant only) |
| Edit loan | ✅ | ❌ |
| Delete loan | ✅ | ❌ |
| **Repayments** | | |
| Add repayment | ✅ | ✅ (where allowed) |
| View repayments | ✅ | ✅ |
| **Settlements** | | |
| View settlements | ✅ | ✅ |
| Generate / manage settlement | ✅ | ❌ |
| Approve settlement | ✅ | ❌ |
| Manage own share allocation | ✅ | ✅ |
| **Payments** | | |
| Mark released/received | ✅ | ✅ (config, default ❌) |
| View payment history | ✅ | ✅ |
| **Reports** | | |
| Full analytics | ✅ | ❌ |
| Basic sales metrics | ✅ | ✅ |
| **Activity** | | |
| View activity | ✅ | ✅ |
| **Settings** | | |
| Business settings | ✅ | ❌ |
| Partner settings | ✅ | ❌ |
| Notification settings | ✅ | ❌ (own reminder maybe) |
| Sync settings | ✅ | ✅ (view + sync now) |
| Security (biometric/passcode) | ✅ | ✅ (self only) |
| Appearance | ✅ | ✅ |
| Data export | ✅ | ❌ (config) |
| Data restore | ✅ | ❌ |
| **Permission management** | ✅ | ❌ |

---

## 4. Guard Logic

```ts
class PermissionService {
  can(user: User, permission: Permission, resource?: Resource): boolean {
    const role = getRole(user.roleId);
    // Check admin override first
    if (role.key === 'admin') return true;
    // Otherwise consult role.permissions JSON (extensible)
    return role.permissions[permission] === true;
  }
}
```

- Admin returns `true` for everything (full access), but still passes through centralized checker for consistency.
- Manager permissions are read from `Roles.permissions`, so Admin can toggle specific capabilities **without code changes**.

---

## 5. UI Enforcement Rules

- **Hide/disable** unauthorized actions (buttons, nav items).
- **Guard at service layer** too — never rely on UI-only hiding. Every mutation service calls `can(...)` and throws `AppError(PERMISSION_DENIED)` if not allowed.
- Manager sees a **reduced** Home/reports view (personal + operational numbers only).

---

## 6. Manager's Restricted Views (summary)

Manager sees:
- Dashboard (personal + operational): Today's status, personal share, loans, settlement status.
- Earnings history (view + add).
- Expenses (view + add).
- Relevant loans (their own as borrower/lender) + repayments.
- Settlements (view) + own share allocation.
- Activity log.
- Own settings (security, appearance).

Manager **cannot**:
- Business settings, partner settings, role/permission management.
- Delete/edit investments, delete loans, delete expenses.
- Generate/approve settlements.
- Full analytics / reports.
- Data restore.