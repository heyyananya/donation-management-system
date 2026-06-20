// Thanks Letter renderer — Page 1 (trust -> donor thanks), then Page 2 (Letter),
// then Page 3 (Receipt). Composed as the 3-page bundle matching ThanksLetter.pdf.
import fs from 'node:fs';
import path from 'node:path';
import { A4, drawText, drawWrapped, drawCentered, drawLine, fromTop, formatDate, formatAmount } from '../layout.js';
import { drawLetterOnPage } from './letterRenderer.js';
import { drawReceiptOnPage } from './receiptRenderer.js';

async function drawThanksPage(pdf, page, ctx, fonts) {
  const { regular, bold } = fonts;
  const { trust, donor, receipt } = ctx;

  // ---- Header band ----
  // Logo (top-left) if available. Sniff the file's magic bytes so any image
  // with a misleading extension still embeds correctly; try PNG then JPG.
  if (trust.logoPath && fs.existsSync(trust.logoPath)) {
    try {
      const bytes = fs.readFileSync(trust.logoPath);
      const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
      const isJpg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
      let img = null;
      if (isPng) img = await pdf.embedPng(bytes);
      else if (isJpg) img = await pdf.embedJpg(bytes);
      else {
        try { img = await pdf.embedPng(bytes); }
        catch { try { img = await pdf.embedJpg(bytes); } catch { /* unsupported */ } }
      }
      if (img) {
        const size = 72;
        page.drawImage(img, { x: 40, y: fromTop(40) - size, width: size, height: size });
      } else {
        console.warn(`[pdf] logo at ${trust.logoPath} is not PNG/JPG; skipping. Re-upload as .png or .jpg.`);
      }
    } catch (err) {
      console.warn(`[pdf] failed to embed logo ${trust.logoPath}:`, err.message);
    }
  }
  void path;

  // Trust name (large bold, right of logo).
  drawText(page, trust.name, { x: 200, y: fromTop(55), font: bold, size: 18 });

  // Registration / address / phone / 80G / PAN — centered, bold, 10pt
  let hy = fromTop(80);
  const headerLines = [
    trust.registrationText,
    trust.unitText,
    trust.correspondenceAddress ? `Correspondence Address: ${trust.correspondenceAddress.split(/\r?\n|,(?=\s)/)[0] || ''}` : '',
    trust.correspondenceAddress ? (trust.correspondenceAddress.split(/\r?\n|,(?=\s)/).slice(1).join(', ') || '') : '',
    trust.phone ? `Phone : ${trust.phone}` : '',
    trust.eightyGText,
    trust.panText,
  ].filter(Boolean);
  for (const line of headerLines) {
    drawCentered(page, line, { cx: A4.width / 2 + 50, y: hy, font: bold, size: 9.5 });
    hy -= 13;
  }

  // Black divider band.
  const dividerY = fromTop(190);
  page.drawRectangle({
    x: 40, y: dividerY, width: A4.width - 80, height: 4,
  });

  // ---- Body ----
  let by = fromTop(220);
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
  let cy = fromTop(560);
  drawText(page, 'Thanking You,', { x: 60, y: cy, font: regular, size: 11 });
  cy -= 16;
  drawText(page, 'Yours faithfully,', { x: 60, y: cy, font: regular, size: 11 });
  cy -= 28;
  drawText(page, trust.name, { x: 60, y: cy, font: bold, size: 11 });
  cy -= 50;
  drawText(page, 'Authorised Signatory', { x: 60, y: cy, font: bold, size: 11 });

  void drawLine;
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
  // Page 1: thanks letter.
  const p1 = pdf.addPage([A4.width, A4.height]);
  await drawThanksPage(pdf, p1, ctx, fonts);
  // Page 2: donor's covering letter (Letter renderer).
  const p2 = pdf.addPage([A4.width, A4.height]);
  await drawLetterOnPage(p2, ctx, fonts);
  // Page 3: receipt.
  const p3 = pdf.addPage([A4.width, A4.height]);
  await drawReceiptOnPage(p3, ctx, fonts);
}
