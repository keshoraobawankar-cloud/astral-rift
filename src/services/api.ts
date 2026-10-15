import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Listeners for unauthorized 401 events
type UnauthorizedHandler = () => void;
const unauthorizedHandlers: Set<UnauthorizedHandler> = new Set();

export const onUnauthorized = (handler: UnauthorizedHandler): (() => void) => {
  unauthorizedHandlers.add(handler);
  return () => {
    unauthorizedHandlers.delete(handler);
  };
};

export function handleLogoutRedirect() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('jwt_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('username');
  localStorage.removeItem('aethelgard_username');

  // Dispatch custom event for React components to open login portal
  window.dispatchEvent(
    new CustomEvent('aethelgard:unauthorized', {
      detail: { message: 'Session expired. Please log in again.' },
    })
  );

  // Trigger registered component listeners
  unauthorizedHandlers.forEach((handler) => {
    try {
      handler();
    } catch (err) {
      console.error('Error executing unauthorized handler:', err);
    }
  });
}

// Create a custom axios instance
export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

// Helper to process queued requests once refresh is complete
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// 1. Request Interceptor: Attach Access Token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('jwt_token');
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// 2. Response Interceptor: Catch 401s and Refresh Token
api.interceptors.response.use(
  (response) => response, // Pass through successful responses normally
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Check if error is 401 and we haven't already tried retrying this request
    if (error.response && error.response.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        // If a refresh is already in progress, queue this request until the new token arrives
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');

      if (!refreshToken) {
        // No refresh token available; force logout
        isRefreshing = false;
        handleLogoutRedirect();
        return Promise.reject(error);
      }

      try {
        // Request a new access token from the backend refresh route
        const response = await axios.post('/api/auth/refresh', {
          refresh_token: refreshToken,
        });

        const { access_token, token, new_refresh_token, refresh_token: newRefresh } = response.data;
        const validAccessToken = access_token || token;
        const validRefreshToken = new_refresh_token || newRefresh;

        // Save new tokens
        localStorage.setItem('access_token', validAccessToken);
        localStorage.setItem('jwt_token', validAccessToken);
        if (validRefreshToken) {
          localStorage.setItem('refresh_token', validRefreshToken);
        }

        // Update default header and process queued requests
        api.defaults.headers.common['Authorization'] = `Bearer ${validAccessToken}`;
        processQueue(null, validAccessToken);

        isRefreshing = false;

        // Retry the original failed request
        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${validAccessToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        // If the refresh token itself has expired or is invalid, force logout
        processQueue(refreshError, null);
        isRefreshing = false;
        handleLogoutRedirect();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
