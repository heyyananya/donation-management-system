import { http } from './axios.js';

export const pdfApi = {
  download: async (type, receiptId, { inline = false } = {}) => {
    const res = await http.get(`/pdf/${type}/${receiptId}`, {
      params: inline ? { inline: 1 } : {},
      responseType: 'blob',
    });
    return res.data;
  },
};
