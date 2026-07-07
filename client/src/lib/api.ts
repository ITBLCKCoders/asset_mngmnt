import { logout } from '@/lib/auth';
import Swal from 'sweetalert2';
import { createLogger } from '@/lib/logger';

const logger = createLogger('API');

import { getApiBase } from '@/lib/env';

const API_BASE = getApiBase();

let isRefreshing = false;

type QueueItem<T = any> = {
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
};
let failedQueue: QueueItem<any>[] = [];

// Auth credential lives in the signed httpOnly cookie set by the server, not
// in JS-accessible storage. We keep an in-memory flag here purely so that UI
// code (NotificationContext, route guards, etc.) can continue to listen for
// "tokenChanged" events to refresh their state when login/logout happens.
//
// The previous implementation persisted the access token in localStorage —
// that was redundant (the cookie is the source of truth) and exposed the
// token to any XSS payload. Callers keep the same getToken/setToken API, but
// nothing is written to localStorage anymore.
//
// We now persist a simple auth flag in sessionStorage (not the actual token)
// so that route guards can detect authentication state across page refreshes.
// sessionStorage is cleared when the tab is closed, providing a good balance.

const SESSION_STORAGE_KEY = 'auth_flag';

// Initialize from sessionStorage on module load
let inMemoryAuthFlag: string | null = null;
if (typeof window !== 'undefined') {
  try {
    inMemoryAuthFlag = sessionStorage.getItem(SESSION_STORAGE_KEY);
  } catch (e) {
    // sessionStorage might be disabled in some contexts
  }
}

export const getToken = (): string | null => inMemoryAuthFlag;

export const setToken = (_token: string | null) => {
  const previousToken = inMemoryAuthFlag;
  inMemoryAuthFlag = _token ?? null;
  if (typeof window !== 'undefined') {
    try {
      if (_token) {
        sessionStorage.setItem(SESSION_STORAGE_KEY, _token);
      } else {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch (e) {
      // sessionStorage might be disabled
    }
    if (previousToken !== inMemoryAuthFlag) {
      window.dispatchEvent(
        new CustomEvent('tokenChanged', { detail: inMemoryAuthFlag })
      );
    }
  }
};

export const getRefreshToken = (): string | null => null;

export const setRefreshToken = (_token: string | null) => {
  // Refresh tokens are rotated by the server via signed httpOnly cookies.
  // This setter is intentionally a no-op for backwards compatibility with
  // existing call sites.
};

const processQueue = (error: any, data: any = null) => {
  failedQueue.forEach(item => {
    error ? item.reject(error) : item.resolve(data);
  });
  failedQueue = [];
};

declare global {
  interface Window {
    Swal: typeof Swal;
    ethereum?: any;
  }
}
if (typeof window !== 'undefined') {
  window.Swal = Swal;

  // MetaMask connection error handling
  if (window.ethereum) {
    // Listen for MetaMask connection issues
    window.ethereum.on(
      'disconnect',
      (error: { code: number; message: string }) => {
        // Suppress ObjectMultiplex errors as they're common and not critical
        if (!error.message || !error.message.includes('ObjectMultiplex')) {
          console.warn('MetaMask disconnected:', error);
        }
      }
    );

    window.ethereum.on('chainChanged', (chainId: string) => {
      logger.info('MetaMask chain changed', { chainId });
    });

    window.ethereum.on('accountsChanged', (accounts: string[]) => {
      logger.info('MetaMask accounts changed', { accounts });
    });
  }
}

async function fetchApi<T = any>(
  input: string,
  init?: RequestInit
): Promise<T> {
  const headers = new Headers(init?.headers);
  // No need to set Authorization header - cookies are sent automatically
  // with credentials: 'include'

  const response = await fetch(`${API_BASE}${input}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (
    response.status === 401 &&
    !input.includes('/refresh') &&
    !input.includes('/login')
  ) {
    if (isRefreshing) {
      return new Promise<T>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      });
    }

    isRefreshing = true;

    try {
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!refreshRes.ok) {
        const errData = await refreshRes.json().catch(() => ({}));
        const errorMsg = (errData.error || '').toLowerCase();

        if (
          errorMsg.includes('revoked') ||
          errorMsg.includes('another') ||
          errorMsg.includes('device')
        ) {
          throw new Error('ANOTHER_DEVICE_LOGIN');
        }
        throw new Error('Refresh failed');
      }

      const retryResponse = await fetch(`${API_BASE}${input}`, {
        ...init,
        headers,
        credentials: 'include',
      });

      if (!retryResponse.ok) {
        const err = await retryResponse.json().catch(() => ({}));
        throw new Error(err.error || 'Retry failed');
      }

      const data = await retryResponse.json();
      processQueue(null, data);
      return data as T;
    } catch (err: any) {
      processQueue(err);

      if (err.message === 'ANOTHER_DEVICE_LOGIN') {
        setToken(null);
        localStorage.removeItem('mfaTempToken');
        sessionStorage.clear();

        await Swal.fire({
          icon: 'error',
          title: 'Logged Out Automatically',
          html: `
            <div style="text-align:center;padding:20px 0">
              <p style="font-size:1.1rem;margin:16px 0">
                Your account has been logged in from <strong>another device</strong>.
              </p>
              <p style="color:#666;font-size:0.95rem">
                This session has been terminated for security.
              </p>
            </div>
          `,
          allowOutsideClick: false,
          allowEscapeKey: false,
          confirmButtonText: 'Go to Login',
          confirmButtonColor: '#EE1D25',
        });

        window.location.replace('/login');
        return Promise.reject(new Error('Logged out from another device'));
      }

      setToken(null);
      await logout();
      throw err;
    } finally {
      // Reset flag to allow future refresh attempts
      isRefreshing = false;
      // Clear failed queue on failure to prevent stuck requests
      failedQueue = [];
    }
  }

  if (!response.ok) {
    const json = await response.json().catch(() => ({}));
    const error = new Error(json.error || json.message || 'Request failed');
    (error as any).response = response;
    (error as any).data = json;

    if (response.status === 500 && json.error) {
      logger.error('Server error details', undefined, {
        endpoint: input,
        status: response.status,
        error: json.error,
        method: init?.method || 'GET',
      });
    }

    throw error;
  }

  // Handle 304 Not Modified - return cached data or empty object
  if (response.status === 304) {
    return {} as T;
  }

  // Handle empty responses gracefully
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    // For non-JSON responses, return empty object
    return {} as T;
  }

  return response.json() as T;
}

export const apiRaw = {
  async get<T = any>(url: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);

    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = new Error('Request failed');
      (error as any).response = response;
      try {
        (error as any).data = await response.json();
      } catch {}
      throw error;
    }

    return response.json() as T;
  },
};

export const api = {
  async get<T = any>(url: string, options: RequestInit = {}) {
    return fetchApi<T>(url, { ...options, method: 'GET' });
  },
  async post<T = any>(url: string, body?: any, options: RequestInit = {}) {
    const isFormData = body instanceof FormData;
    const headers = new Headers(options.headers);
    if (!isFormData) headers.set('Content-Type', 'application/json');

    return fetchApi<T>(url, {
      ...options,
      method: 'POST',
      headers,
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    });
  },
  async patch<T = any>(url: string, body?: any, options: RequestInit = {}) {
    const isFormData = body instanceof FormData;
    const headers = new Headers(options.headers);
    if (!isFormData) headers.set('Content-Type', 'application/json');

    return fetchApi<T>(url, {
      ...options,
      method: 'PATCH',
      headers,
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    });
  },
  async put<T = any>(url: string, body?: any, options: RequestInit = {}) {
    const isFormData = body instanceof FormData;
    const headers = new Headers(options.headers);
    if (!isFormData) headers.set('Content-Type', 'application/json');

    return fetchApi<T>(url, {
      ...options,
      method: 'PUT',
      headers,
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    });
  },
  async delete<T = any>(url: string, options: RequestInit = {}) {
    return fetchApi<T>(url, {
      ...options,
      method: 'DELETE',
      headers: new Headers({
        'Content-Type': 'application/json',
        ...options.headers,
      }),
    });
  },
};

export default api;
