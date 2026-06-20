import fs from 'node:fs';
import path from 'node:path';
import { v4 as uuid } from 'uuid';
import sharp from 'sharp';

// pdf-lib only embeds PNG and JPG. If the uploaded logo is already one of those
// (verified by magic bytes, not the claimed extension), keep it as-is; otherwise
// transcode to PNG via sharp so it works in the Thanks Letter PDF. The original
// file is replaced on disk and the (possibly new) filename is returned.
export async function ensurePdfFriendlyLogo(file) {
  const filePath = file.path;
  const buf = fs.readFileSync(filePath);
  const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const isJpg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (isPng || isJpg) return file.filename;

  const dir = path.dirname(filePath);
  const newName = `${uuid()}.png`;
  const newPath = path.join(dir, newName);
  await sharp(buf, { failOn: 'none' }).png().toFile(newPath);
  try { fs.unlinkSync(filePath); } catch { /* ignore */ }
  return newName;
}
