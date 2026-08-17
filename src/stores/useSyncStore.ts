import { create } from 'zustand';
import * as syncRepo from '@/repositories/syncQueueRepository';
import { runSync } from '@/services/sync/syncEngine';

interface SyncState {
  pendingCount: number;
  lastSyncedAt: string | null;
  syncing: boolean;
  refresh: () => Promise<void>;
  syncNow: () => Promise<void>;
}

export const useSyncStore = create<SyncState>((set) => ({
  pendingCount: 0,
  lastSyncedAt: null,
  syncing: false,

  refresh: async () => {
    const [count, last] = await Promise.all([
      syncRepo.getPendingCount(),
      syncRepo.getLastSyncTime(),
    ]);
    set({ pendingCount: count, lastSyncedAt: last });
  },

  syncNow: async () => {
    set({ syncing: true });
    try {
      await runSync();
      await useSyncStore.getState().refresh();
    } finally {
      set({ syncing: false });
    }
  },
}));