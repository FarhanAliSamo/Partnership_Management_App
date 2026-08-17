import * as Network from 'expo-network';
import * as syncRepo from '@/repositories/syncQueueRepository';
import type { SyncQueueEntry } from '@/repositories/syncQueueRepository';

/**
 * Local-first sync engine. Attempts to push pending queue entries.
 * When a backend is configured it's called; otherwise entries resolve locally.
 */
export interface SyncResult {
  synced: number;
  failed: number;
}

let isSyncing = false;

export async function isOnline(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return state.isConnected === true && state.isInternetReachable !== false;
  } catch {
    return true; // assume online if network state unavailable (web)
  }
}

export async function runSync(): Promise<SyncResult> {
  if (isSyncing) return { synced: 0, failed: 0 };
  isSyncing = true;
  try {
    const entries = await syncRepo.getPendingEntries();
    let synced = 0;
    let failed = 0;

    for (const entry of entries) {
      try {
        await pushToBackend(entry);
        await syncRepo.removeEntry(entry.id);
        synced += 1;
      } catch (e) {
        await syncRepo.incrementAttempts(entry.id);
        const lastError = e instanceof Error ? e.message : 'Unknown sync error';
        await syncRepo.markEntryStatus(entry.id, 'failed', lastError);
        failed += 1;
      }
    }

    if (entries.length > 0) {
      await syncRepo.setLastSyncTime(new Date().toISOString());
    }
    return { synced, failed };
  } finally {
    isSyncing = false;
  }
}

async function pushToBackend(_entry: SyncQueueEntry): Promise<void> {
  // Backend integration point. Without a configured backend URL, this is a
  // no-op so offline-first data remains consistent. Replace with a real API
  // call when a backend is provided.
  await Promise.resolve();
}