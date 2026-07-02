import { http } from './axios.js';

export const donorApi = {
  list: (q = '') => http.get('/donors', { params: { q } }).then((r) => r.data),
  get: (id) => http.get(`/donors/${id}`).then((r) => r.data),
  create: (data) => http.post('/donors', data).then((r) => r.data),
  // Donor creation requires at least one identity document up front, so the
  // create form submits the donor fields together with the chosen file(s)
  // (aadhaarDoc / voterIdDoc / panDoc) in a single multipart request.
  createWithDocs: (data, files) => {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => { if (v != null) fd.append(k, v); });
    if (files.aadhaar) fd.append('aadhaarDoc', files.aadhaar);
    if (files.voterId) fd.append('voterIdDoc', files.voterId);
    if (files.pan) fd.append('panDoc', files.pan);
    return http.post('/donors', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
  },
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
  // Document files are served from /api/files behind auth, so a plain <a
  // href download> won't work (the browser navigation can't attach the JWT).
  // Fetch as a blob through the authenticated client instead.
  downloadDocFile: (fileUrl) => http.get(fileUrl.replace(/^\/api/, ''), { responseType: 'blob' }).then((r) => r.data),
};
