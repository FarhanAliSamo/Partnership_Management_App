import { exec, queryFirst, queryAll, enqueueWrite } from '@/db/database';

export type SyncOperation = 'create' | 'update' | 'delete';
export type SyncQueueStatus = 'pending' | 'in_progress' | 'failed' | 'conflict';

export interface SyncQueueEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  operation: SyncOperation;
  payload: Record<string, unknown>;
  status: SyncQueueStatus;
  attempts: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

interface SyncQueueRow {
  id: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  payload: string;
  status: string;
  attempts: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

function map(row: SyncQueueRow): SyncQueueEntry {
  return {
    id: row.id,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    operation: row.operation as SyncOperation,
    payload: JSON.parse(row.payload) as Record<string, unknown>,
    status: row.status as SyncQueueStatus,
    attempts: row.attempts,
    last_error: row.last_error,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function enqueueSync(entry: SyncQueueEntry): Promise<void> {
  await enqueueWrite(() =>
    exec(
      `INSERT INTO sync_queue (id, entity_type, entity_id, operation, payload, status, attempts, last_error, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET
         payload=excluded.payload,
         status=excluded.status,
         attempts=excluded.attempts,
         last_error=excluded.last_error,
         updated_at=excluded.updated_at`,
      [
        entry.id, entry.entity_type, entry.entity_id, entry.operation,
        JSON.stringify(entry.payload), entry.status, entry.attempts, entry.last_error,
        entry.created_at, entry.updated_at,
      ]
    )
  );
}

export async function getPendingEntries(): Promise<SyncQueueEntry[]> {
  const rows = await queryAll<SyncQueueRow>(
    `SELECT * FROM sync_queue WHERE status IN ('pending','failed','conflict') ORDER BY created_at ASC`
  );
  return rows.map(map);
}

export async function getEntryById(id: string): Promise<SyncQueueEntry | null> {
  const row = await queryFirst<SyncQueueRow>(`SELECT * FROM sync_queue WHERE id = ?`, [id]);
  return row ? map(row) : null;
}

export async function markEntryStatus(
  id: string,
  status: SyncQueueStatus,
  lastError: string | null = null
): Promise<void> {
  await enqueueWrite(() =>
    exec('UPDATE sync_queue SET status=?, last_error=?, updated_at=? WHERE id=?', [
      status,
      lastError,
      new Date().toISOString(),
      id,
    ])
  );
}

export async function incrementAttempts(id: string): Promise<void> {
  await enqueueWrite(() =>
    exec('UPDATE sync_queue SET attempts = attempts + 1, updated_at=? WHERE id=?', [
      new Date().toISOString(),
      id,
    ])
  );
}

export async function removeEntry(id: string): Promise<void> {
  await enqueueWrite(() => exec('DELETE FROM sync_queue WHERE id = ?', [id]));
}

export async function clearSyncedEntries(): Promise<void> {
  await enqueueWrite(() => exec(`DELETE FROM sync_queue WHERE status = 'synced'`));
}

export async function getPendingCount(): Promise<number> {
  const row = await queryFirst<{ n: number }>(
    `SELECT COUNT(*) AS n FROM sync_queue WHERE status IN ('pending','failed','conflict')`
  );
  return row ? row.n : 0;
}

export async function getLastSyncTime(): Promise<string | null> {
  const row = await queryFirst<{ value: string }>(
    `SELECT value FROM settings WHERE key = 'lastSyncAt'`
  );
  return row ? row.value : null;
}

export async function setLastSyncTime(iso: string): Promise<void> {
  await enqueueWrite(() =>
    exec(
      `INSERT INTO settings (key, value) VALUES ('lastSyncAt', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [JSON.stringify(iso)]
    )
  );
}