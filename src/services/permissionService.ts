import type { RoleKey, User } from '@/types';

/**
 * Centralized role-based access control. Admin has full access; Manager reads
 * from the stored role permissions map (extensible without code changes).
 */

export type PermissionKey =
  | 'earning:create'
  | 'earning:view'
  | 'earning:edit'
  | 'earning:delete'
  | 'closed_day:create'
  | 'closed_day:view'
  | 'closed_day:edit'
  | 'expense:create'
  | 'expense:view'
  | 'expense:edit'
  | 'expense:delete'
  | 'investment:create'
  | 'investment:view'
  | 'investment:edit'
  | 'investment:delete'
  | 'loan:create'
  | 'loan:view'
  | 'loan:edit'
  | 'loan:delete'
  | 'repayment:create'
  | 'repayment:view'
  | 'settlement:view'
  | 'settlement:manage'
  | 'settlement:approve'
  | 'allocation:manage_own'
  | 'payment:mark'
  | 'report:view'
  | 'report:view_basic'
  | 'activity:view'
  | 'settings:business'
  | 'settings:partners'
  | 'settings:notifications'
  | 'settings:sync'
  | 'settings:security'
  | 'settings:appearance'
  | 'settings:data'
  | 'permission:manage'
  | 'data:export'
  | 'data:restore';

/** Default permissions for the Manager role. */
export const DEFAULT_MANAGER_PERMISSIONS: Record<PermissionKey, boolean> = {
  'earning:create': true,
  'earning:view': true,
  'earning:edit': true,
  'earning:delete': false,
  'closed_day:create': true,
  'closed_day:view': true,
  'closed_day:edit': true,
  'expense:create': true,
  'expense:view': true,
  'expense:edit': true,
  'expense:delete': false,
  'investment:create': false,
  'investment:view': true,
  'investment:edit': false,
  'investment:delete': false,
  'loan:create': true,
  'loan:view': true,
  'loan:edit': false,
  'loan:delete': false,
  'repayment:create': true,
  'repayment:view': true,
  'settlement:view': true,
  'settlement:manage': false,
  'settlement:approve': false,
  'allocation:manage_own': true,
  'payment:mark': false,
  'report:view': false,
  'report:view_basic': true,
  'activity:view': true,
  'settings:business': false,
  'settings:partners': false,
  'settings:notifications': false,
  'settings:sync': true,
  'settings:security': true,
  'settings:appearance': true,
  'settings:data': false,
  'permission:manage': false,
  'data:export': false,
  'data:restore': false,
};

export interface PermissionContext {
  roleKey: RoleKey;
  managerPermissions?: Record<string, boolean>;
}

export function can(
  ctx: PermissionContext | null,
  permission: PermissionKey
): boolean {
  if (!ctx) return false;
  if (ctx.roleKey === 'admin') return true;
  const map = ctx.managerPermissions ?? DEFAULT_MANAGER_PERMISSIONS;
  return map[permission] === true;
}

export function canForUser(user: User | null, permission: PermissionKey): boolean {
  if (!user) return false;
  const ctx: PermissionContext =
    user.role_key === 'admin'
      ? { roleKey: 'admin' }
      : { roleKey: 'manager', managerPermissions: DEFAULT_MANAGER_PERMISSIONS };
  return can(ctx, permission);
}

export function getAdminPermissions(): Record<PermissionKey, boolean> {
  const all = {} as Record<PermissionKey, boolean>;
  const keys = Object.keys(DEFAULT_MANAGER_PERMISSIONS) as PermissionKey[];
  for (const k of keys) all[k] = true;
  return all;
}