import { http } from './axios.js';

export const receiptApi = {
  meta: () => http.get('/receipts/meta').then((r) => r.data),
  peekNumber: (financialYear, trustId) =>
    http.get('/receipts/peek-number', { params: { financialYear, trustId } }).then((r) => r.data),
  list: (params = {}) => http.get('/receipts', { params }).then((r) => r.data),
  get: (id) => http.get(`/receipts/${id}`).then((r) => r.data),
  create: (data) => http.post('/receipts', data).then((r) => r.data),
  update: (id, data) => http.put(`/receipts/${id}`, data).then((r) => r.data),
  remove: (id) => http.delete(`/receipts/${id}`).then((r) => r.data),
};
