import { create } from 'zustand';
import api, { getOfflineQueue, clearOfflineQueue } from '../lib/api';

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: string | null;
  syncError: string | null;
  checkHealth: () => Promise<void>;
  triggerSync: () => Promise<void>;
  updatePendingCount: () => void;
}

export const useSyncStore = create<SyncState>((set, get) => {
  return {
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingCount: getOfflineQueue().length,
    lastSyncedAt: null,
    syncError: null,

    updatePendingCount: () => {
      set({ pendingCount: getOfflineQueue().length });
    },

    checkHealth: async () => {
      try {
        const res = await api.get('/sync/health', { timeout: 3000 });
        if (res.data?.success) {
          const wasOffline = !get().isOnline;
          set({ isOnline: true, syncError: null });
          if (wasOffline && getOfflineQueue().length > 0) {
            get().triggerSync();
          }
        } else {
          set({ isOnline: false });
        }
      } catch (err) {
        set({ isOnline: false });
      }
    },

    triggerSync: async () => {
      const queue = getOfflineQueue();
      if (queue.length === 0 || get().isSyncing) return;

      set({ isSyncing: true, syncError: null });
      try {
        const payload = {
          device_id: 'DESKTOP-CLIENT-01',
          items: queue,
        };

        const res = await api.post('/sync/push', payload);
        if (res.data?.success) {
          clearOfflineQueue();
          set({
            isSyncing: false,
            pendingCount: 0,
            lastSyncedAt: new Date().toISOString(),
          });
        } else {
          set({ isSyncing: false, syncError: res.data?.error || 'Sync failed' });
        }
      } catch (err: any) {
        set({ isSyncing: false, syncError: err.message || 'Network error during sync' });
      }
    },
  };
});