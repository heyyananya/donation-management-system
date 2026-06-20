import { http } from './axios.js';

export const dashboardApi = {
  summary: () => http.get('/dashboard/summary').then((r) => r.data),
};
