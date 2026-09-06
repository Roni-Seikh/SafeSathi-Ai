import axios, { AxiosError } from 'axios';
import { API_BASE_URL, TOKEN_STORAGE_KEY, ADMIN_STORAGE_KEY } from '@/constants';
import type { ApiError } from '@/types';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// A session expiring mid-use (401) should drop the admin back to login
// rather than surface a confusing error deep in a page.
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(ADMIN_STORAGE_KEY);
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  }
);

/** Pulls the human-readable message out of the backend's error envelope,
 * falling back to a generic message for network-level failures. */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError | undefined;
    if (apiError?.error?.message) return apiError.error.message;
    if (error.message === 'Network Error') return 'Could not reach the SafeSathi server.';
  }
  return 'Something went wrong. Please try again.';
}
