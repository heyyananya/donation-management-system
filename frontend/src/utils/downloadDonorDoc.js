import { donorApi } from '../api/donor.api.js';
import { downloadBlob } from './downloadBlob.js';

export async function downloadDonorDoc(doc) {
  const blob = await donorApi.downloadDocFile(doc.url);
  downloadBlob(blob, doc.originalName);
}
