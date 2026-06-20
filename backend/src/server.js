import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { env } from './config/env.js';
import { authMiddleware } from './middleware/auth.js';
import { notFound, errorHandler } from './middleware/error.js';

import authRoutes from './routes/auth.routes.js';
import donorRoutes from './routes/donor.routes.js';
import trustRoutes from './routes/trust.routes.js';
import remarkRoutes from './routes/remark.routes.js';
import receiptRoutes from './routes/receipt.routes.js';
import pdfRoutes from './routes/pdf.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import yearRoutes from './routes/year.routes.js';

const app = express();

app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json({ limit: '2mb' }));

// Public.
app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.use('/api/auth', authRoutes);

// Static uploaded files (auth-protected so docs aren't world-readable).
app.use(
  '/api/files',
  authMiddleware,
  express.static(env.uploadsDir, { fallthrough: false, maxAge: '5m' })
);

// Authenticated API.
app.use('/api/donors', authMiddleware, donorRoutes);
app.use('/api/trusts', authMiddleware, trustRoutes);
app.use('/api/remarks', authMiddleware, remarkRoutes);
app.use('/api/receipts', authMiddleware, receiptRoutes);
app.use('/api/years', authMiddleware, yearRoutes);
app.use('/api/pdf', authMiddleware, pdfRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);

app.use(notFound);
app.use(errorHandler);

// Ensure runtime dirs exist.
for (const dir of [
  env.dataDir,
  env.uploadsDir,
  path.join(env.uploadsDir, 'donor-docs'),
  path.join(env.uploadsDir, 'trust-logos'),
]) {
  fs.mkdirSync(dir, { recursive: true });
}

app.listen(env.port, () => {
  console.log(`[backend] listening on http://localhost:${env.port}`);
  console.log(`[backend] repo driver: ${env.repoDriver}`);
});
