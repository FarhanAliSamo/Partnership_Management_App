import type { ID, Syncable } from '@/types';
import { generateId } from '@/utils/id';
import { nowISO } from '@/utils/date';

/**
 * Builds the audit + syncability fields for a new financial record.
 */
export function newRecord(userId: ID): Pick<
  Syncable,
  'created_by' | 'updated_by' | 'created_at' | 'updated_at' | 'sync_state' | 'local_version' | 'remote_version' | 'deleted_at'
> {
  const ts = nowISO();
  return {
    created_by: userId,
    updated_by: userId,
    created_at: ts,
    updated_at: ts,
    sync_state: 'pending',
    local_version: 1,
    remote_version: 0,
    deleted_at: null,
  };
}

export function newId(): ID {
  return generateId();
}