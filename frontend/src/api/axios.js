import axios from 'axios';

const STORAGE_KEY = 'dms.auth.token';

export const http = axios.create({ baseURL: '/api' });

// sessionStorage (not localStorage) — the token must not survive the
// browser/tab being closed, so the admin is asked to log in again every time
// the site is opened, rather than staying signed in until the JWT expires.
http.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(STORAGE_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      sessionStorage.removeItem(STORAGE_KEY);
      if (!window.location.pathname.endsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export const tokenStore = {
  get: () => sessionStorage.getItem(STORAGE_KEY),
  set: (t) => sessionStorage.setItem(STORAGE_KEY, t),
  clear: () => sessionStorage.removeItem(STORAGE_KEY),
  key: STORAGE_KEY,
};
