import axios from 'axios';

const STORAGE_KEY = 'dms.auth.token';

export const http = axios.create({ baseURL: '/api' });

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem(STORAGE_KEY);
      if (!window.location.pathname.endsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export const tokenStore = {
  get: () => localStorage.getItem(STORAGE_KEY),
  set: (t) => localStorage.setItem(STORAGE_KEY, t),
  clear: () => localStorage.removeItem(STORAGE_KEY),
  key: STORAGE_KEY,
};
