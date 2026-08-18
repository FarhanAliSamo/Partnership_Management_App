import * as Network from 'expo-network';
import * as syncRepo from '@/repositories/syncQueueRepository';
import { markEntitySynced, mergeRemoteRows } from '@/repositories/financialRepository';
import { invalidateData } from '@/lib/dataEvents';
import { getSupabase } from '@/lib/supabase';
import type { SyncQueueEntry } from '@/repositories/syncQueueRepository';

/**
 * Bidirectional sync engine (offline-first).
 *
 * PUSH: local SQLite mutations are enqueued and uploaded to Supabase (PostgreSQL).
 * PULL: cloud rows are merged down into local SQLite so that anything the other
 *       partner added on another device shows up here (true centralized data).
 *
 * Local edits always win on conflict; deleted cloud rows soft-delete locally.
 */

export interface SyncResult {
  synced: number;
  failed: number;
  pulled: number;
}

let isSyncing = false;

/** Maps queue entity_type → Supabase table name. */
const TABLE_MAP: Record<string, string> = {
  earning: 'earnings',
  expense: 'expenses',
  investment: 'investments',
  loan: 'loans',
  repayment: 'loan_repayments',
  settlement: 'monthly_settlements',
  allocation: 'settlement_allocations',
  payment: 'payments',
  daily_status: 'daily_business_status',
};

export async function isOnline(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return state.isConnected === true && state.isInternetReachable !== false;
  } catch {
    return true;
  }
}

export async function runSync(): Promise<SyncResult> {
  if (isSyncing) return { synced: 0, failed: 0, pulled: 0 };
  const supabase = getSupabase();
  if (!supabase) return { synced: 0, failed: 0, pulled: 0 };

  isSyncing = true;
  try {
    // 1. Push local pending changes first.
    const entries = await syncRepo.getPendingEntries();
    let synced = 0;
    let failed = 0;

    for (const entry of entries) {
      try {
        await pushToBackend(supabase, entry);
        await syncRepo.removeEntry(entry.id);
        await markEntitySynced(entry.entity_type, entry.entity_id);
        synced += 1;
      } catch (e) {
        await syncRepo.incrementAttempts(entry.id);
        const lastError = e instanceof Error ? e.message : 'Unknown sync error';
        await syncRepo.markEntryStatus(entry.id, 'failed', lastError);
        failed += 1;
      }
    }

    // 2. Pull + merge cloud rows into local for every tracked table.
    let pulled = 0;
    for (const table of Object.values(TABLE_MAP)) {
      try {
        const { data, error } = await supabase.from(table).select('*');
        if (error) continue;
        if (!data || data.length === 0) continue;
        const entityType = Object.keys(TABLE_MAP).find((k) => TABLE_MAP[k] === table);
        if (!entityType) continue;
        await mergeRemoteRows(entityType, data as Record<string, unknown>[]);
        pulled += data.length;
      } catch {
        // ignore a single table failure; others still sync
      }
    }

    if (entries.length > 0 || pulled > 0) {
      await syncRepo.setLastSyncTime(new Date().toISOString());
      invalidateData();
    }
    return { synced, failed, pulled };
  } finally {
    isSyncing = false;
  }
}

async function pushToBackend(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  entry: SyncQueueEntry
): Promise<void> {
  const table = TABLE_MAP[entry.entity_type];
  if (!table) throw new Error(`Unknown entity type: ${entry.entity_type}`);

  if (entry.operation === 'delete') {
    const { error } = await supabase
      .from(table)
      .update({ deleted_at: new Date().toISOString(), sync_state: 'pending' })
      .eq('id', entry.entity_id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.from(table).upsert(entry.payload);
  if (error) throw new Error(error.message);
}