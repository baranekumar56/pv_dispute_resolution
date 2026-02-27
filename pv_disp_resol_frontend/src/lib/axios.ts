import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { env } from '@/config/env';
import { store } from '@/app/store';
import { logoutUser } from '@/features/auth/slices/authSlice';

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: AxiosError | null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve();
  });
  failedQueue = [];
};

const axiosInstance = axios.create({
  baseURL: env.API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (env.isDev) console.debug(`[axios] -> ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => {
    if (env.isDev) console.debug(`[axios] <- ${response.status} ${response.config.url}`);
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;

    const isAuthEndpoint =
      originalRequest.url?.includes('/api/v1/auth/login') ||
      originalRequest.url?.includes('/api/v1/auth/signup') ||
      originalRequest.url?.includes('/api/v1/auth/refresh') ||
      originalRequest.url?.includes('/api/v1/auth/me');

    if (status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => axiosInstance(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await axiosInstance.post('/api/v1/auth/refresh');
        processQueue(null);
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError);
        store.dispatch(logoutUser());
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Backend returns: { detail: string, error_code: string, errors?: [...] }
    const responseData = error.response?.data as {
      detail?: string;
      error_code?: string;
      errors?: Array<{ field: string; message: string }>;
    } | undefined;

    const appError = {
      code:        responseData?.error_code ?? 'UNKNOWN_ERROR',
      message:     responseData?.detail     ?? error.message ?? 'An unexpected error occurred.',
      status_code: status ?? 0,
      errors:      responseData?.errors,
    };

    return Promise.reject(appError);
  }
);

export default axiosInstance;