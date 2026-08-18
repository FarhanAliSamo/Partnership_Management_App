import { upsertRole as saveRole } from '@/repositories/roleRepository';
import { DEFAULT_SETTINGS } from '@/constants/defaults';
import { setManySettings, getAllSettings } from '@/repositories/settingsRepository';
import { DEFAULT_MANAGER_PERMISSIONS, getAdminPermissions } from './permissionService';

/**
 * Seed roles and default settings on first launch. Idempotent.
 *
 * NOTE: Users are intentionally NOT seeded here. Accounts are created in the
 * database (local SQLite, synced to Supabase) via the setup flow (first admin)
 * and the admin "Create User" screen — no hardcoded credentials in the app.
 */
export async function seedDatabase(): Promise<void> {
  await saveRole({
    id: 'role-admin',
    key: 'admin',
    name: 'Admin',
    permissions: getAdminPermissions(),
  });
  await saveRole({
    id: 'role-manager',
    key: 'manager',
    name: 'Manager',
    permissions: DEFAULT_MANAGER_PERMISSIONS as Record<string, boolean>,
  });

  // Ensure settings exist (merges defaults with any user-set values).
  const existing = await getAllSettings();
  await setManySettings({ ...DEFAULT_SETTINGS, ...existing });
}