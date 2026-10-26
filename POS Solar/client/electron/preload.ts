import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  triggerOfflineSync: () => ipcRenderer.invoke('trigger-offline-sync'),
  onSyncStatusChange: (callback: (status: any) => void) => {
    ipcRenderer.on('sync-status-changed', (_event, value) => callback(value));
  },
  printReceipt: () => ipcRenderer.invoke('print-receipt'),
});