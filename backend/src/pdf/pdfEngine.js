import { PDFDocument } from 'pdf-lib';
import { loadFonts } from './fonts.js';
import { renderReceipt } from './renderers/receiptRenderer.js';
import { renderLetter } from './renderers/letterRenderer.js';
import { renderThanksLetter } from './renderers/thanksLetterRenderer.js';
import { AppError } from '../middleware/error.js';

export const PDF_TYPES = ['receipt', 'letter', 'thanks-letter'];

export async function generatePdf(type, ctx) {
  if (!PDF_TYPES.includes(type)) throw new AppError(`Unknown PDF type: ${type}`, 400);

  const pdf = await PDFDocument.create();
  pdf.setTitle(`${typeTitle(type)} - ${ctx.receipt.number}`);
  pdf.setProducer('Donation Management System');
  pdf.setCreator('Donation Management System');
  const fonts = await loadFonts(pdf);

  if (type === 'receipt') await renderReceipt(pdf, ctx, fonts);
  else if (type === 'letter') await renderLetter(pdf, ctx, fonts);
  else if (type === 'thanks-letter') await renderThanksLetter(pdf, ctx, fonts);

  return await pdf.save();
}

function typeTitle(t) {
  if (t === 'receipt') return 'Receipt';
  if (t === 'letter') return 'Donation Letter';
  if (t === 'thanks-letter') return 'Thanks Letter';
  return 'Document';
}
