import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { v4 as uuid } from 'uuid';
import { env } from '../config/env.js';

function makeStorage(subdir) {
  const dest = path.join(env.uploadsDir, subdir);
  fs.mkdirSync(dest, { recursive: true });
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dest),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uuid()}${ext}`);
    },
  });
}

export const donorDocUpload = multer({
  storage: makeStorage('donor-docs'),
  limits: { fileSize: 8 * 1024 * 1024 },
});

// Donor creation requires at least one identity document up front (Aadhaar,
// Voter ID, or PAN) — accepted as up to 3 optional files alongside the
// donor's text fields in a single multipart request.
export const donorCreateUpload = multer({
  storage: makeStorage('donor-docs'),
  limits: { fileSize: 8 * 1024 * 1024 },
}).fields([
  { name: 'aadhaarDoc', maxCount: 1 },
  { name: 'voterIdDoc', maxCount: 1 },
  { name: 'panDoc', maxCount: 1 },
]);

export const trustLogoUpload = multer({
  storage: makeStorage('trust-logos'),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    // Accept any image format; non-PNG/JPG uploads are normalised to PNG by the
    // logoConverter before they reach the PDF engine.
    const ok = /^image\//i.test(file.mimetype);
    cb(ok ? null : new Error('Logo must be an image file'), ok);
  },
});
