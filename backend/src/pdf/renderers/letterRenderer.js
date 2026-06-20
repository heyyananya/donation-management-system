// Donation Letter renderer (donor → trust covering letter). Trust now has only
// name+logo+correspondenceAddress, so the "To" block is just "The Trustee,
// <trust.name>" — no separate trust address field exists anymore.
import { A4, drawText, drawWrapped, drawLine, fromTop, formatDate, formatAmount } from '../layout.js';

const LEFT = 60;
const RIGHT = A4.width - 60;

export async function drawLetterOnPage(page, ctx, fonts) {
  const { regular, bold } = fonts;
  const { donor, trust, receipt } = ctx;

  // ---- From block (right-aligned, top right) ----
  let y = fromTop(80);
  const fromX = 370;
  drawText(page, 'From :', { x: fromX, y, font: bold, size: 11 });
  y -= 18;
  drawText(page, donor.name, { x: fromX, y, font: bold, size: 11 });
  y -= 16;
  for (const line of (donor.addressLines || []).slice(0, 3)) {
    drawText(page, line, { x: fromX, y, font: regular, size: 10 });
    y -= 14;
  }

  // ---- PAN No (right) ----
  y = fromTop(220);
  if (donor.pan) {
    drawText(page, 'PAN No:', { x: fromX, y, font: bold, size: 11 });
    drawText(page, donor.pan, { x: fromX + 60, y, font: bold, size: 11 });
  }

  y -= 30;
  drawText(page, `Date : ${formatDate(receipt.date)}`, { x: fromX, y, font: regular, size: 11 });

  // ---- To block (left) ----
  let ty = fromTop(310);
  drawText(page, 'To,', { x: LEFT, y: ty, font: regular, size: 11 });
  ty -= 18;
  drawText(page, 'The Trustee,', { x: LEFT, y: ty, font: bold, size: 11 });
  ty -= 16;
  drawText(page, trust.name, { x: LEFT, y: ty, font: bold, size: 11 });

  // ---- Body ----
  let by = fromTop(440);
  drawText(page, 'Dear Sir,', { x: LEFT, y: by, font: regular, size: 11 });
  by -= 22;

  const seg = [
    { text: 'We are enclosing herewith, the sum of amount.', font: regular },
    { text: `${formatAmount(receipt.amount)}/- (${receipt.amountInWords})`, font: bold },
    { text: ' by ', font: regular },
    { text: `${receipt.paymentType} ${receipt.transactionOrChequeNo}`.trim(), font: bold },
    { text: ',Being Donation ', font: regular },
    { text: receipt.purpose, font: bold },
    { text: ' for "', font: regular },
    { text: trust.name, font: bold },
    { text: '".', font: regular },
  ];
  by = drawSegments(page, seg, { x: LEFT, y: by, maxWidth: RIGHT - LEFT, size: 11 });

  by -= 14;
  by -= drawWrapped(page, 'Kindly receive the same and send the official Stamp Receipt along with 80 G. Income tax Exemption Certificate.', {
    x: LEFT, y: by, font: regular, size: 11, maxWidth: RIGHT - LEFT,
  });

  // ---- Closing ----
  let cy = fromTop(650);
  drawText(page, 'Thanking You,', { x: LEFT, y: cy, font: regular, size: 11 });
  cy -= 16;
  drawText(page, 'Yours faithfully,', { x: LEFT, y: cy, font: regular, size: 11 });

  const sigY = fromTop(740);
  drawLine(page, { x1: LEFT, y1: sigY, x2: LEFT + 150, y2: sigY, thickness: 0.8 });

  drawText(page, 'Encl:', { x: LEFT, y: fromTop(810), font: regular, size: 11 });
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

export async function renderLetter(pdf, ctx, fonts) {
  const page = pdf.addPage([A4.width, A4.height]);
  await drawLetterOnPage(page, ctx, fonts);
  return page;
}
