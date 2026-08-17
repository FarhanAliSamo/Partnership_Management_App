import { exec, queryFirst, queryAll, enqueueWrite } from '@/db/database';
import type { Role, RoleKey } from '@/types';

export interface RoleRow {
  id: string;
  key: string;
  name: string;
  permissions: string;
}

function mapRole(row: RoleRow): Role {
  return {
    id: row.id,
    key: row.key as RoleKey,
    name: row.name,
    permissions: JSON.parse(row.permissions) as Record<string, boolean>,
  };
}

export async function getRoleByKey(key: RoleKey): Promise<Role | null> {
  const row = await queryFirst<RoleRow>('SELECT * FROM roles WHERE key = ?', [key]);
  return row ? mapRole(row) : null;
}

export async function listRoles(): Promise<Role[]> {
  const rows = await queryAll<RoleRow>('SELECT * FROM roles');
  return rows.map(mapRole);
}

export async function upsertRole(role: Role): Promise<void> {
  await enqueueWrite(() =>
    exec(
      `INSERT INTO roles (id, key, name, permissions) VALUES (?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         name = excluded.name,
         permissions = excluded.permissions`,
      [role.id, role.key, role.name, JSON.stringify(role.permissions)]
    )
  );
}