import { create } from 'zustand';
import * as syncRepo from '@/repositories/syncQueueRepository';
import { runSync, isOnline } from '@/services/sync/syncEngine';

interface SyncState {
  pendingCount: number;
  lastSyncedAt: string | null;
  syncing: boolean;
  online: boolean;
  refresh: () => Promise<void>;
  syncNow: () => Promise<void>;
  autoSync: () => Promise<void>;
  checkOnline: () => Promise<boolean>;
}

export const useSyncStore = create<SyncState>((set) => ({
  pendingCount: 0,
  lastSyncedAt: null,
  syncing: false,
  online: true,

  refresh: async () => {
    const [count, last] = await Promise.all([
      syncRepo.getPendingCount(),
      syncRepo.getLastSyncTime(),
    ]);
    set({ pendingCount: count, lastSyncedAt: last });
  },

  syncNow: async () => {
    if (useSyncStore.getState().syncing) return;
    set({ syncing: true });
    try {
      await runSync();
      await useSyncStore.getState().refresh();
    } finally {
      set({ syncing: false });
    }
  },

  checkOnline: async () => {
    const online = await isOnline();
    set({ online });
    return online;
  },

  /**
   * Auto-sync: called on app start and after any local mutation.
   * Only runs when online, so offline changes queue locally and sync
   * happens automatically once connectivity returns.
   */
  autoSync: async () => {
    const online = await isOnline();
    set({ online });
    if (!online) return;
    await useSyncStore.getState().syncNow();
  },
}));