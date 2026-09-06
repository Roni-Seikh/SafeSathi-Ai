import axios, { AxiosError, AxiosInstance } from 'axios';
import { firebaseAuth } from './firebase';
import { API_BASE_URL } from '../constants/config';
import { ApiErrorBody } from '../types/api.types';

export class ApiRequestError extends Error {
  public readonly code: string;
  public readonly details: unknown;
  public readonly httpStatus?: number;

  constructor(code: string, message: string, httpStatus?: number, details?: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
  }
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

apiClient.interceptors.request.use(async (config) => {
  const currentUser = firebaseAuth.currentUser;
  if (currentUser) {
    const token = await currentUser.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    if (error.response?.data && !error.response.data.success) {
      const { code, message, details } = error.response.data.error;
      return Promise.reject(new ApiRequestError(code, message, error.response.status, details));
    }
    return Promise.reject(
      new ApiRequestError('NETWORK_ERROR', error.message || 'Could not reach the server', error.response?.status)
    );
  }
);
