import { exec, queryFirst, queryAll, enqueueWrite } from '@/db/database';
import type { User, ID } from '@/types';

export interface UserRow {
  id: string;
  username: string;
  display_name: string;
  role_key: string;
  passcode_hash: string | null;
  biometric_enabled: number;
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const row = await queryFirst<UserRow>(
    'SELECT id, username, display_name, role_key FROM users WHERE username = ?',
    [username]
  );
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    role_key: row.role_key as User['role_key'],
  };
}

export async function getUserById(id: ID): Promise<User | null> {
  const row = await queryFirst<UserRow>(
    'SELECT id, username, display_name, role_key FROM users WHERE id = ?',
    [id]
  );
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    role_key: row.role_key as User['role_key'],
  };
}

export async function listUsers(): Promise<User[]> {
  const rows = await queryAll<UserRow>('SELECT id, username, display_name, role_key FROM users');
  return rows.map((row) => ({
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    role_key: row.role_key as User['role_key'],
  }));
}

export async function upsertUser(user: {
  id: ID;
  username: string;
  display_name: string;
  role_key: string;
}): Promise<void> {
  const now = new Date().toISOString();
  await enqueueWrite(() =>
    exec(
      `INSERT INTO users (id, username, display_name, role_key, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         display_name = excluded.display_name,
         role_key = excluded.role_key,
         updated_at = excluded.updated_at`,
      [user.id, user.username, user.display_name, user.role_key, now, now]
    )
  );
}

export async function updateDisplayName(id: ID, displayName: string): Promise<void> {
  await enqueueWrite(() =>
    exec('UPDATE users SET display_name = ?, updated_at = ? WHERE id = ?', [
      displayName,
      new Date().toISOString(),
      id,
    ])
  );
}

export async function setUserPasscodeHash(id: ID, hash: string): Promise<void> {
  await enqueueWrite(() =>
    exec('UPDATE users SET passcode_hash = ?, updated_at = ? WHERE id = ?', [
      hash,
      new Date().toISOString(),
      id,
    ])
  );
}

export async function getUserAuth(id: ID): Promise<{ passcode_hash: string | null } | null> {
  const row = await queryFirst<{ passcode_hash: string | null }>(
    'SELECT passcode_hash FROM users WHERE id = ?',
    [id]
  );
  return row;
}

export async function setBiometricEnabled(id: ID, enabled: boolean): Promise<void> {
  await enqueueWrite(() =>
    exec('UPDATE users SET biometric_enabled = ?, updated_at = ? WHERE id = ?', [
      enabled ? 1 : 0,
      new Date().toISOString(),
      id,
    ])
  );
}

export async function getBiometricEnabled(id: ID): Promise<boolean> {
  const row = await queryFirst<{ biometric_enabled: number }>(
    'SELECT biometric_enabled FROM users WHERE id = ?',
    [id]
  );
  return row ? row.biometric_enabled === 1 : false;
}

export async function deleteUserById(id: ID): Promise<void> {
  await enqueueWrite(() => exec('DELETE FROM users WHERE id = ?', [id]));
}

export async function countUsers(): Promise<number> {
  const row = await queryFirst<{ n: number }>('SELECT COUNT(*) AS n FROM users');
  return row ? row.n : 0;
}
