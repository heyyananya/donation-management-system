// Shared trust-header renderer used by both the Receipt and the Thanks Letter.
//
// Layout:
//   - logoSide: 'center'  -> logo centered above the trust name (Receipt)
//   - logoSide: 'left'    -> logo anchored to the left margin; name & address
//                            still horizontally centered across the page,
//                            matching the official Thanks Letter masthead.
//
// In both modes the trust name is rendered separately (bold, large, centered)
// and then `correspondenceAddressLines` is drawn verbatim — empty entries
// honored as blank rows so layout matches the textarea exactly.
import fs from 'node:fs';
import { A4, drawCentered } from '../layout.js';

const HEADER_FONT_SIZE = 9.5;
const HEADER_LINE_HEIGHT = 12.5;
const NAME_FONT_SIZE = 16;

async function embedTrustLogo(pdf, logoPath) {
  if (!logoPath || !fs.existsSync(logoPath)) return null;
  try {
    const bytes = fs.readFileSync(logoPath);
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    const isJpg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (isPng) return pdf.embedPng(bytes);
    if (isJpg) return pdf.embedJpg(bytes);
    try { return await pdf.embedPng(bytes); }
    catch { try { return await pdf.embedJpg(bytes); } catch { return null; } }
  } catch (err) {
    console.warn(`[pdf] failed to embed logo ${logoPath}:`, err.message);
    return null;
  }
}

/**
 * @param {object} opts
 * @param {number} opts.topY            top of the header zone (pdf coords)
 * @param {number} opts.bottomY         must not draw below this y
 * @param {number} [opts.logoSize=44]   logo box size in pt
 * @param {'center'|'left'} [opts.logoSide='center']
 * @returns {number} y just below the last drawn header line
 */
export async function drawTrustHeader(pdf, page, ctx, fonts, {
  topY, bottomY, logoSize = 44, logoSide = 'center',
}) {
  const { bold } = fonts;
  const { trust } = ctx;
  const img = await embedTrustLogo(pdf, trust.logoPath);
  let y = topY;

  if (img && logoSide === 'left') {
    // Logo pinned to the left margin. Text continues at the same topY so the
    // name appears next to the top of the logo, matching the official masthead.
    const scale = logoSize / Math.max(img.width, img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    page.drawImage(img, { x: 40, y: y - h, width: w, height: h });
    // y is NOT advanced -- the centered text band shares vertical space with the logo.
  } else if (img) {
    // Logo centered above the name.
    const scale = logoSize / Math.max(img.width, img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    page.drawImage(img, { x: A4.width / 2 - w / 2, y: y - h, width: w, height: h });
    y -= h + 4;
  }

  // Trust name -- always centered horizontally on the page.
  if (trust.name) {
    drawCentered(page, trust.name, {
      cx: A4.width / 2, y: y - NAME_FONT_SIZE + 2, font: bold, size: NAME_FONT_SIZE,
    });
    y -= NAME_FONT_SIZE + 8;
  }

  // Correspondence address, verbatim.
  for (const line of trust.correspondenceAddressLines || []) {
    if (y < bottomY + HEADER_LINE_HEIGHT) break;
    if (line) {
      drawCentered(page, line, { cx: A4.width / 2, y, font: bold, size: HEADER_FONT_SIZE });
    }
    y -= HEADER_LINE_HEIGHT;
  }

  return y;
}
