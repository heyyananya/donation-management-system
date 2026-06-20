import { rgb } from 'pdf-lib';

export const BLACK = rgb(0, 0, 0);
export const WHITE = rgb(1, 1, 1);

// A4 at 72dpi: 595.28 x 841.89 pt. The originals are A4.
export const A4 = { width: 595.28, height: 841.89 };

export function drawText(page, text, { x, y, font, size = 10, color = BLACK }) {
  if (text == null || text === '') return 0;
  page.drawText(String(text), { x, y, size, font, color });
  return font.widthOfTextAtSize(String(text), size);
}

export function drawCentered(page, text, { cx, y, font, size = 10, color = BLACK }) {
  if (text == null || text === '') return;
  const w = font.widthOfTextAtSize(String(text), size);
  page.drawText(String(text), { x: cx - w / 2, y, size, font, color });
}

export function drawRight(page, text, { rx, y, font, size = 10, color = BLACK }) {
  if (text == null || text === '') return;
  const w = font.widthOfTextAtSize(String(text), size);
  page.drawText(String(text), { x: rx - w, y, size, font, color });
}

export function drawLine(page, { x1, y1, x2, y2, thickness = 0.75, color = BLACK }) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color });
}

export function drawRect(page, { x, y, w, h, borderWidth = 1, borderColor = BLACK }) {
  page.drawRectangle({ x, y, width: w, height: h, borderWidth, borderColor });
}

// Top-origin helper: given a Y measured from the top of the page, return the
// pdf-lib Y (which is measured from the bottom).
export function fromTop(y, pageHeight = A4.height) {
  return pageHeight - y;
}

export function wrapText(text, font, size, maxWidth) {
  const words = String(text || '').split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function drawWrapped(page, text, { x, y, font, size = 10, maxWidth, lineHeight = size * 1.35, color = BLACK }) {
  const lines = wrapText(text, font, size, maxWidth);
  lines.forEach((line, i) => {
    page.drawText(line, { x, y: y - i * lineHeight, size, font, color });
  });
  return lines.length * lineHeight;
}

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

// Indian-numbering format: 100000 -> "1,00,000", 1234567 -> "12,34,567".
export function formatAmount(amount) {
  const n = Number(amount || 0);
  const negative = n < 0;
  const abs = Math.abs(n);
  const rupees = Math.trunc(abs);
  const paise = Math.round((abs - rupees) * 100);
  const s = String(rupees);
  let grouped;
  if (s.length <= 3) {
    grouped = s;
  } else {
    const last3 = s.slice(-3);
    const rest = s.slice(0, -3);
    grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
  }
  const out = paise ? `${grouped}.${String(paise).padStart(2, '0')}` : grouped;
  return negative ? `-${out}` : out;
}
