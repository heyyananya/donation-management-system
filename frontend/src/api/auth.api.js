import { http } from './axios.js';

export const authApi = {
  login: (username, password) => http.post('/auth/login', { username, password }).then((r) => r.data),
  me: () => http.get('/auth/me').then((r) => r.data),
};
