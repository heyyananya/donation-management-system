import { buildRenderContext } from '../services/renderContext.service.js';
import { generatePdf, PDF_TYPES } from '../pdf/pdfEngine.js';
import { AppError } from '../middleware/error.js';

export const pdfController = {
  generate: async (req, res) => {
    const { type, id } = req.params;
    if (!PDF_TYPES.includes(type)) throw new AppError('Unknown PDF type', 400);
    const ctx = await buildRenderContext(id);
    const bytes = await generatePdf(type, ctx);
    const filename = `${typeFilename(type)}-${ctx.receipt.number}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `${req.query.inline ? 'inline' : 'attachment'}; filename="${filename}"`
    );
    res.end(Buffer.from(bytes));
  },
};

function typeFilename(t) {
  if (t === 'receipt') return 'Receipt';
  if (t === 'letter') return 'DonationLetter';
  return 'ThanksLetter';
}
