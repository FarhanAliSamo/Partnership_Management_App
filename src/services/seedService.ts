import { upsertUser } from '@/repositories/userRepository';
import { upsertRole as saveRole } from '@/repositories/roleRepository';
import { DEFAULT_ADMIN, DEFAULT_MANAGER, DEFAULT_SETTINGS } from '@/constants/defaults';
import { setManySettings, getAllSettings } from '@/repositories/settingsRepository';
import { DEFAULT_MANAGER_PERMISSIONS, getAdminPermissions } from './permissionService';

/**
 * Seed roles, users, and default settings on first launch. Idempotent.
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

  await upsertUser({
    id: DEFAULT_ADMIN.id,
    username: DEFAULT_ADMIN.username,
    display_name: DEFAULT_ADMIN.display_name,
    role_key: 'admin',
  });
  await upsertUser({
    id: DEFAULT_MANAGER.id,
    username: DEFAULT_MANAGER.username,
    display_name: DEFAULT_MANAGER.display_name,
    role_key: 'manager',
  });

  // Ensure settings exist (merges defaults with any user-set values)
  const existing = await getAllSettings();
  await setManySettings({ ...DEFAULT_SETTINGS, ...existing });
}

