// Thanks Letter renderer — 3-page bundle: trust→donor thanks letter,
// donor→trust covering letter, official receipt. Page 1 header uses the
// shared logo → trust name → correspondence address layout.
import { A4, drawText, drawWrapped, formatDate, formatAmount, fromTop } from '../layout.js';
import { drawTrustHeader } from './_trustHeader.js';
import { drawLetterOnPage } from './letterRenderer.js';
import { drawReceiptOnPage } from './receiptRenderer.js';

async function drawThanksPage(pdf, page, ctx, fonts) {
  const { regular, bold } = fonts;
  const { trust, donor, receipt } = ctx;

  // Header band: logo on the LEFT, trust name centered, correspondence
  // address centered below. Matches the official Thanks Letter masthead.
  const headerEndY = await drawTrustHeader(pdf, page, ctx, fonts, {
    topY: fromTop(50),
    bottomY: fromTop(225),
    logoSize: 78,
    logoSide: 'left',
  });
  const dividerY = Math.min(headerEndY - 6, fromTop(230));
  page.drawRectangle({ x: 40, y: dividerY, width: A4.width - 80, height: 4 });

  // ---- Body ----
  let by = dividerY - 30;
  drawText(page, `Date :   ${formatDate(receipt.date)}`, { x: 60, y: by, font: regular, size: 11 });
  by -= 28;

  drawText(page, 'To :', { x: 60, y: by, font: bold, size: 11 });
  by -= 18;
  drawText(page, donor.name, { x: 60, y: by, font: bold, size: 11 });
  by -= 16;
  for (const line of (donor.addressLines || []).slice(0, 3)) {
    drawText(page, line, { x: 60, y: by, font: regular, size: 10 });
    by -= 14;
  }

  by -= 12;
  if (donor.pan) {
    drawText(page, 'PAN No:', { x: 60, y: by, font: bold, size: 11 });
    drawText(page, donor.pan, { x: 130, y: by, font: bold, size: 11 });
    by -= 28;
  }

  drawText(page, 'Respected Sir / Madam,', { x: 60, y: by, font: regular, size: 11 });
  by -= 22;

  const seg = [
    { text: 'Thank you very much for your contribution of ', font: regular },
    { text: `${formatAmount(receipt.amount)}/- (${receipt.amountInWords})`, font: bold },
    { text: ' by ', font: regular },
    { text: `${receipt.paymentType} ${receipt.transactionOrChequeNo}`.trim(), font: bold },
    { text: ',being ', font: regular },
    { text: receipt.purpose, font: bold },
    { text: ' for "', font: regular },
    { text: trust.name, font: bold },
    { text: '".', font: regular },
  ];
  by = drawSegments(page, seg, { x: 60, y: by, maxWidth: A4.width - 120, size: 11 });

  by -= 8;
  by -= drawWrapped(page, `We are enclosing herewith Receipt No.${receipt.number} Dt.${formatDate(receipt.date)}.`, {
    x: 60, y: by, font: regular, size: 11, maxWidth: A4.width - 120,
  });

  by -= 6;
  by -= drawWrapped(page, 'Please acknowledge the receipt.', {
    x: 60, y: by, font: regular, size: 11, maxWidth: A4.width - 120,
  });

  // ---- Closing ----
  let cy = fromTop(580);
  drawText(page, 'Thanking You,', { x: 60, y: cy, font: regular, size: 11 });
  cy -= 16;
  drawText(page, 'Yours faithfully,', { x: 60, y: cy, font: regular, size: 11 });
  cy -= 28;
  drawText(page, trust.name, { x: 60, y: cy, font: bold, size: 11 });
  cy -= 50;
  drawText(page, 'Authorised Signatory', { x: 60, y: cy, font: bold, size: 11 });
}

function drawSegments(page, segments, { x, y, maxWidth, size }) {
  let cx = x;
  let cy = y;
  const lineHeight = size * 1.45;
  for (const s of segments) {
    const words = s.text.split(/(\s+)/);
    for (const w of words) {
      if (!w) continue;
      const ww = s.font.widthOfTextAtSize(w, size);
      if (cx + ww > x + maxWidth && cx > x) {
        cy -= lineHeight;
        cx = x;
        if (/^\s+$/.test(w)) continue;
      }
      page.drawText(w, { x: cx, y: cy, size, font: s.font });
      cx += ww;
    }
  }
  return cy - lineHeight;
}

export async function renderThanksLetter(pdf, ctx, fonts) {
  const p1 = pdf.addPage([A4.width, A4.height]);
  await drawThanksPage(pdf, p1, ctx, fonts);
  const p2 = pdf.addPage([A4.width, A4.height]);
  await drawLetterOnPage(p2, ctx, fonts);
  const p3 = pdf.addPage([A4.width, A4.height]);
  await drawReceiptOnPage(p3, ctx, fonts, pdf);
}
