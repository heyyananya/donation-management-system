import { http } from './axios.js';

export const yearApi = {
  list: () => http.get('/years').then((r) => r.data),
  create: (data) => http.post('/years', data).then((r) => r.data),
  update: (id, data) => http.put(`/years/${id}`, data).then((r) => r.data),
  remove: (id) => http.delete(`/years/${id}`).then((r) => r.data),
};
