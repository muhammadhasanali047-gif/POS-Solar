import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api/v1`
  : '/api/v1';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor: attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('solar_pos_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 & offline write-through queue
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If unauthorized, redirect to login
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('solar_pos_token');
      localStorage.removeItem('solar_pos_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // Offline Write-Through Queue:
    // If network error occurred on a mutation (POST/PUT/DELETE), queue locally
    const isNetworkError = !error.response || error.code === 'ERR_NETWORK' || !navigator.onLine;
    const isMutation = ['post', 'put', 'delete'].includes(originalRequest.method?.toLowerCase() || '');

    if (isNetworkError && isMutation) {
      console.warn('Network offline. Enqueuing mutation into local offline queue...', originalRequest.url);

      const clientUuid = `UUID-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const queueItem = {
        client_uuid: clientUuid,
        url: originalRequest.url,
        method: originalRequest.method,
        entity: extractEntityFromUrl(originalRequest.url || ''),
        operation: originalRequest.method?.toUpperCase() === 'POST' ? 'INSERT' : 'UPDATE',
        payload: originalRequest.data ? JSON.parse(originalRequest.data) : {},
        client_timestamp: new Date().toISOString(),
      };

      enqueueOfflineTransaction(queueItem);

      // Return synthetic optimistic response so user workflow continues uninterrupted
      return Promise.resolve({
        data: {
          success: true,
          message: 'Saved to local offline queue. Will sync automatically when connection restores.',
          data: {
            ...queueItem.payload,
            id: clientUuid,
            _is_offline_pending: true,
          },
        },
        status: 200,
        statusText: 'OK (Offline Queued)',
        headers: {},
        config: originalRequest,
      });
    }

    return Promise.reject(error);
  }
);

function extractEntityFromUrl(url: string): string {
  if (url.includes('/sales')) return 'Sale';
  if (url.includes('/quotations')) return 'Quotation';
  if (url.includes('/customers')) return 'Customer';
  if (url.includes('/payments')) return 'Payment';
  if (url.includes('/expenses')) return 'Expense';
  if (url.includes('/claims')) return 'WarrantyClaim';
  if (url.includes('/dealers')) return 'Dealer';
  return 'Unknown';
}

export function getOfflineQueue() {
  try {
    const raw = localStorage.getItem('solar_pos_offline_queue');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function enqueueOfflineTransaction(item: any) {
  const queue = getOfflineQueue();
  queue.push(item);
  localStorage.setItem('solar_pos_offline_queue', JSON.stringify(queue));
  window.dispatchEvent(new Event('offline-queue-updated'));
}

export function clearOfflineQueue() {
  localStorage.setItem('solar_pos_offline_queue', JSON.stringify([]));
  window.dispatchEvent(new Event('offline-queue-updated'));
}

export default api;