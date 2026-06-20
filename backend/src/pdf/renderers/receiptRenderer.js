// Receipt page renderer.
// Header is rendered through _trustHeader.js: logo → trust name → verbatim
// correspondence address. Body grid and bottom Rs/signature box unchanged.
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
} from '../layout.js';
import { drawTrustHeader } from './_trustHeader.js';

const M = 30;
const BOX_LEFT = M;
const BOX_RIGHT = A4.width - M;
const BOX_TOP = fromTop(30);
const BOX_BOTTOM = fromTop(510);

const HEADER_TOP = fromTop(45);     // top of logo
const HEADER_DIVIDER = fromTop(245); // divider between header block and "Receipt" title

export async function drawReceiptOnPage(page, ctx, fonts, pdf) {
  const { regular, bold, italic } = fonts;

  // Outer bordered box.
  drawRect(page, {
    x: BOX_LEFT, y: BOX_BOTTOM,
    w: BOX_RIGHT - BOX_LEFT, h: BOX_TOP - BOX_BOTTOM,
    borderWidth: 1.2,
  });

  await drawTrustHeader(pdf, page, ctx, fonts, {
    topY: HEADER_TOP,
    bottomY: HEADER_DIVIDER,
    logoSize: 44,
  });

  // Divider between header and "Receipt" title.
  drawLine(page, {
    x1: BOX_LEFT, y1: HEADER_DIVIDER, x2: BOX_RIGHT, y2: HEADER_DIVIDER,
    thickness: 1.2,
  });

  // "Receipt" title (centered, underlined).
  const titleY = HEADER_DIVIDER - 18;
  const titleText = 'Receipt';
  const tWidth = regular.widthOfTextAtSize(titleText, 12);
  drawCentered(page, titleText, { cx: A4.width / 2, y: titleY, font: regular, size: 12 });
  drawLine(page, {
    x1: A4.width / 2 - tWidth / 2, y1: titleY - 1.5,
    x2: A4.width / 2 + tWidth / 2, y2: titleY - 1.5,
    thickness: 0.6,
  });

  // Body grid.
  const rowH = 22;
  let rowY = titleY - 22;

  drawText(page, 'Receipt No:', { x: BOX_LEFT + 14, y: rowY, font: italic, size: 11 });
  drawText(page, String(ctx.receipt.number ?? ''), {
    x: BOX_LEFT + 90, y: rowY, font: regular, size: 11,
  });
  drawRight(page, `Receipt Date: ${formatDate(ctx.receipt.date)}`, {
    rx: BOX_RIGHT - 14, y: rowY, font: italic, size: 11,
  });
  drawLine(page, { x1: BOX_LEFT, y1: rowY - 6, x2: BOX_RIGHT, y2: rowY - 6, thickness: 0.6 });
  rowY -= rowH;

  drawText(page, 'Received From:', { x: BOX_LEFT + 14, y: rowY, font: italic, size: 11 });
  drawText(page, ctx.donor.name, { x: BOX_LEFT + 115, y: rowY, font: bold, size: 11 });
  drawLine(page, { x1: BOX_LEFT, y1: rowY - 6, x2: BOX_RIGHT, y2: rowY - 6, thickness: 0.6 });
  rowY -= rowH;

  drawText(page, 'the sum of Amount:', { x: BOX_LEFT + 14, y: rowY, font: italic, size: 11 });
  drawText(page, ctx.receipt.amountInWords, { x: BOX_LEFT + 135, y: rowY, font: regular, size: 11 });
  drawLine(page, { x1: BOX_LEFT, y1: rowY - 6, x2: BOX_RIGHT, y2: rowY - 6, thickness: 0.6 });
  rowY -= rowH;

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

  drawText(page, 'Dated', { x: BOX_LEFT + 14, y: rowY, font: italic, size: 11 });
  drawText(page, formatDate(ctx.receipt.transactionOrChequeDate), {
    x: BOX_LEFT + 55, y: rowY, font: regular, size: 11,
  });
  drawText(page, 'Bank', { x: BOX_LEFT + 220, y: rowY, font: italic, size: 11 });
  drawText(page, ctx.receipt.bankName, { x: BOX_LEFT + 255, y: rowY, font: regular, size: 11 });
  drawLine(page, { x1: BOX_LEFT, y1: rowY - 6, x2: BOX_RIGHT, y2: rowY - 6, thickness: 0.6 });
  rowY -= rowH;

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

  const sigW = 110;
  const sigH = 55;
  const sigX = BOX_RIGHT - 14 - sigW;
  const sigY = BOX_BOTTOM + 14;
  drawRect(page, { x: sigX, y: sigY, w: sigW, h: sigH });
  drawRight(page, 'Trustee', { rx: sigX + sigW, y: sigY - 11, font: regular, size: 10 });
}

export async function renderReceipt(pdf, ctx, fonts) {
  const page = pdf.addPage([A4.width, A4.height]);
  await drawReceiptOnPage(page, ctx, fonts, pdf);
  return page;
}
