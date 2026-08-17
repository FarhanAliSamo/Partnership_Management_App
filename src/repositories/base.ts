import { exec, queryFirst, queryAll, enqueueWrite } from '@/db/database';
import type { ID, SyncState } from '@/types';

/**
 * Common syncable-row field utilities shared by repositories.
 */

export const SYNCABLE_FIELDS =
  'id, created_by, updated_by, created_at, updated_at, sync_state, local_version, remote_version, deleted_at';

export interface SyncFields {
  sync_state: SyncState;
  local_version: number;
  remote_version: number;
  deleted_at: string | null;
}

export function stampFields(
  overrides: Partial<SyncFields> = {}
): SyncFields {
  return {
    sync_state: overrides.sync_state ?? 'synced',
    local_version: overrides.local_version ?? 1,
    remote_version: overrides.remote_version ?? 0,
    deleted_at: overrides.deleted_at ?? null,
  };
}

export function softDeleteClause(): string {
  return 'deleted_at IS NULL';
}

export async function softDeleteById(table: string, id: ID): Promise<void> {
  const sql = `UPDATE ${table} SET deleted_at = ?, sync_state = 'pending', local_version = local_version + 1, updated_at = ? WHERE id = ?`;
  await enqueueWrite(() => exec(sql, [new Date().toISOString(), new Date().toISOString(), id]));
}

export { queryFirst, queryAll };