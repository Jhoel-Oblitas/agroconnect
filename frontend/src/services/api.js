import axios from 'axios';

function resolveApiBaseUrl() {
  const raw = (import.meta.env.VITE_API_URL || '/api').trim().replace(/\/+$/, '');
  if (raw === '/api' || raw.endsWith('/api')) return raw;
  return `${raw}/api`;
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 15000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('agroconnect_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('agroconnect_token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
