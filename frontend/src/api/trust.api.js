import { http } from './axios.js';

export const trustApi = {
  list: () => http.get('/trusts').then((r) => r.data),
  get: (id) => http.get(`/trusts/${id}`).then((r) => r.data),
  create: (data) => http.post('/trusts', data).then((r) => r.data),
  update: (id, data) => http.put(`/trusts/${id}`, data).then((r) => r.data),
  remove: (id) => http.delete(`/trusts/${id}`).then((r) => r.data),
  uploadLogo: (id, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return http.post(`/trusts/${id}/logo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
  },
  removeLogo: (id) => http.delete(`/trusts/${id}/logo`).then((r) => r.data),
};
