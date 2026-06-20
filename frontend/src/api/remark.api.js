import { http } from './axios.js';

export const remarkApi = {
  list: () => http.get('/remarks').then((r) => r.data),
  create: (data) => http.post('/remarks', data).then((r) => r.data),
  update: (id, data) => http.put(`/remarks/${id}`, data).then((r) => r.data),
  remove: (id) => http.delete(`/remarks/${id}`).then((r) => r.data),
};
