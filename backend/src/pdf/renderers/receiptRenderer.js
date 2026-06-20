// Receipt page renderer — coordinates calibrated against Receipt.pdf.
// Layout intent: outer bordered box in the upper half of A4 portrait,
// trust header at top, then field-grid body, signature box bottom-right.
import { rgb } from 'pdf-lib';
import {
  A4,
  drawText,
  drawCentered,
  drawRight,
  drawLine,
  drawRect,
  fromTop,
  formatDate,
  formatAmount,
  BLACK,
} from '../layout.js';

const M = 30;                  // outer page margin
const BOX_LEFT = M;
const BOX_RIGHT = A4.width - M;
const BOX_TOP = fromTop(30);   // outer-box top (from bottom)
const BOX_BOTTOM = fromTop(510); // outer-box bottom

const HEADER_BOTTOM = fromTop(80);       // bottom of trust-name band
const TRUST_BLOCK_BOTTOM = fromTop(200); // bottom of registration block

export async function drawReceiptOnPage(page, ctx, fonts) {
  const { regular, bold, italic } = fonts;

  // Outer bordered box.
  drawRect(page, { x: BOX_LEFT, y: BOX_BOTTOM, w: BOX_RIGHT - BOX_LEFT, h: BOX_TOP - BOX_BOTTOM, borderWidth: 1.2 });

  // Header divider (between trust name and registration block).
  drawLine(page, { x1: BOX_LEFT, y1: HEADER_BOTTOM, x2: BOX_RIGHT, y2: HEADER_BOTTOM, thickness: 1.2 });

  // Left & right thick square marks on the header band.
  page.drawRectangle({ x: BOX_LEFT, y: HEADER_BOTTOM, width: 10, height: BOX_TOP - HEADER_BOTTOM, color: BLACK });
  page.drawRectangle({ x: BOX_RIGHT - 10, y: HEADER_BOTTOM, width: 10, height: BOX_TOP - HEADER_BOTTOM, color: BLACK });

  // Trust name (large, centered in header band).
  drawCentered(page, ctx.trust.name, {
    cx: A4.width / 2,
    y: HEADER_BOTTOM + (BOX_TOP - HEADER_BOTTOM) / 2 - 7,
    font: bold,
    size: 18,
  });

  // Registration block — bold, centered, 10pt, ~14pt line height.
  const regLines = [
    ctx.trust.registrationText,
    ctx.trust.unitText,
    ctx.trust.correspondenceAddress ? `Correspondence Address: ${ctx.trust.correspondenceAddress.split(/\r?\n|,(?=\s)/)[0] || ''}` : '',
    ctx.trust.correspondenceAddress ? (ctx.trust.correspondenceAddress.split(/\r?\n|,(?=\s)/).slice(1).join(', ') || '') : '',
    ctx.trust.phone ? `Phone : ${ctx.trust.phone}` : '',
    ctx.trust.eightyGText,
    ctx.trust.panText,
  ].filter(Boolean);

  let ry = HEADER_BOTTOM - 18;
  for (const line of regLines) {
    drawCentered(page, line, { cx: A4.width / 2, y: ry, font: bold, size: 9.5 });
    ry -= 14;
  }

  // Divider before "Receipt" title.
  const titleDividerY = TRUST_BLOCK_BOTTOM;
  drawLine(page, { x1: BOX_LEFT, y1: titleDividerY, x2: BOX_RIGHT, y2: titleDividerY, thickness: 1.2 });

  // "Receipt" title (centered, underlined).
  const titleY = titleDividerY - 18;
  const titleText = 'Receipt';
  const tWidth = regular.widthOfTextAtSize(titleText, 12);
  drawCentered(page, titleText, { cx: A4.width / 2, y: titleY, font: regular, size: 12 });
  drawLine(page, {
    x1: A4.width / 2 - tWidth / 2, y1: titleY - 1.5,
    x2: A4.width / 2 + tWidth / 2, y2: titleY - 1.5,
    thickness: 0.6,
  });

  // Body grid.
  const rowH = 26;
  let rowY = titleY - 22;

  // Row 1: Receipt No / Receipt Date.
  drawText(page, 'Receipt No:', { x: BOX_LEFT + 14, y: rowY, font: italic, size: 11 });
  drawText(page, String(ctx.receipt.number ?? ''), {
    x: BOX_LEFT + 90, y: rowY, font: regular, size: 11,
  });
  drawRight(page, `Receipt Date: ${formatDate(ctx.receipt.date)}`, {
    rx: BOX_RIGHT - 14, y: rowY, font: italic, size: 11,
  });
  drawLine(page, { x1: BOX_LEFT, y1: rowY - 6, x2: BOX_RIGHT, y2: rowY - 6, thickness: 0.6 });
  rowY -= rowH;

  // Row 2: Received From.
  drawText(page, 'Received From:', { x: BOX_LEFT + 14, y: rowY, font: italic, size: 11 });
  drawText(page, ctx.donor.name, { x: BOX_LEFT + 115, y: rowY, font: bold, size: 11 });
  drawLine(page, { x1: BOX_LEFT, y1: rowY - 6, x2: BOX_RIGHT, y2: rowY - 6, thickness: 0.6 });
  rowY -= rowH;

  // Row 3: the sum of Amount.
  drawText(page, 'the sum of Amount:', { x: BOX_LEFT + 14, y: rowY, font: italic, size: 11 });
  drawText(page, ctx.receipt.amountInWords, { x: BOX_LEFT + 135, y: rowY, font: regular, size: 11 });
  drawLine(page, { x1: BOX_LEFT, y1: rowY - 6, x2: BOX_RIGHT, y2: rowY - 6, thickness: 0.6 });
  rowY -= rowH;

  // Row 4: By <paymentType> | Cheque No/Transaction No.
  drawText(page, 'By', { x: BOX_LEFT + 14, y: rowY, font: italic, size: 11 });
  drawText(page, ctx.receipt.paymentType, { x: BOX_LEFT + 32, y: rowY, font: regular, size: 11 });
  drawText(page, 'Cheque No/Transaction No:', {
    x: BOX_LEFT + 220, y: rowY, font: italic, size: 11,
  });
  drawText(page, ctx.receipt.transactionOrChequeNo, {
    x: BOX_LEFT + 380, y: rowY, font: regular, size: 11,
  });
  drawLine(page, { x1: BOX_LEFT, y1: rowY - 6, x2: BOX_RIGHT, y2: rowY - 6, thickness: 0.6 });
  rowY -= rowH;

  // Row 5: Dated ... Bank ...
  drawText(page, 'Dated', { x: BOX_LEFT + 14, y: rowY, font: italic, size: 11 });
  drawText(page, formatDate(ctx.receipt.transactionOrChequeDate), {
    x: BOX_LEFT + 55, y: rowY, font: regular, size: 11,
  });
  drawText(page, 'Bank', { x: BOX_LEFT + 220, y: rowY, font: italic, size: 11 });
  drawText(page, ctx.receipt.bankName, { x: BOX_LEFT + 255, y: rowY, font: regular, size: 11 });
  drawLine(page, { x1: BOX_LEFT, y1: rowY - 6, x2: BOX_RIGHT, y2: rowY - 6, thickness: 0.6 });
  rowY -= rowH;

  // Row 6: Being ... (purpose)
  drawText(page, 'Being', { x: BOX_LEFT + 14, y: rowY, font: italic, size: 11 });
  drawText(page, ctx.receipt.purpose, { x: BOX_LEFT + 55, y: rowY, font: regular, size: 11 });
  drawLine(page, { x1: BOX_LEFT, y1: rowY - 6, x2: BOX_RIGHT, y2: rowY - 6, thickness: 0.6 });
  rowY -= rowH;

  // Bottom: Rs box (left) + signature box (right).
  const bottomY = BOX_BOTTOM + 18;
  const rsBoxX = BOX_LEFT + 14;
  const rsBoxW = 130;
  const rsBoxH = 22;
    drawRect(page, { x: rsBoxX, y: bottomY, w: rsBoxW, h: rsBoxH });
  drawText(page, 'Rs.', { x: rsBoxX + 8, y: bottomY + 6, font: italic, size: 11 });
  drawText(page, `${formatAmount(ctx.receipt.amount)} /-`, {
    x: rsBoxX + 28, y: bottomY + 6, font: regular, size: 12,
  });

  // Signature box.
  const sigW = 110;
  const sigH = 55;
  const sigX = BOX_RIGHT - 14 - sigW;
  const sigY = BOX_BOTTOM + 14;
  drawRect(page, { x: sigX, y: sigY, w: sigW, h: sigH });
  drawRight(page, 'Trustee', { rx: sigX + sigW, y: sigY - 11, font: regular, size: 10 });
}

// Convenience for single-page receipt PDFs.
export async function renderReceipt(pdf, ctx, fonts) {
  const page = pdf.addPage([A4.width, A4.height]);
  await drawReceiptOnPage(page, ctx, fonts);
  return page;
}

// Suppress unused-import warning (rgb is used implicitly by drawRect/drawLine).
void rgb;
