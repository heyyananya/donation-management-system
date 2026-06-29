import { http } from './axios.js';

export const userApi = {
  list: () => http.get('/users').then((r) => r.data),
  get: (id) => http.get(`/users/${id}`).then((r) => r.data),
  create: (data) => http.post('/users', data).then((r) => r.data),
  update: (id, data) => http.put(`/users/${id}`, data).then((r) => r.data),
  remove: (id) => http.delete(`/users/${id}`).then((r) => r.data),
};
