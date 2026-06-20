import { http } from './axios.js';

export const donorApi = {
  list: (q = '') => http.get('/donors', { params: { q } }).then((r) => r.data),
  get: (id) => http.get(`/donors/${id}`).then((r) => r.data),
  create: (data) => http.post('/donors', data).then((r) => r.data),
  update: (id, data) => http.put(`/donors/${id}`, data).then((r) => r.data),
  remove: (id) => http.delete(`/donors/${id}`).then((r) => r.data),
  uploadDoc: (id, file, type, label) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', type);
    if (label) fd.append('label', label);
    return http.post(`/donors/${id}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
  },
  removeDoc: (id, docId) => http.delete(`/donors/${id}/documents/${docId}`).then((r) => r.data),
};
