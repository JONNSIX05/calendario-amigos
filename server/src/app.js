import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createDatabase } from './db.js';
import { createAuthHelpers } from './middleware/auth.js';
import { createAuthRouter } from './routes/auth.js';
import { createProfileRouter } from './routes/profile.js';
import { createAvailabilityRouter } from './routes/availability.js';
import { createAdminRouter } from './routes/admin.js';

export function createApp({
  dbPath,
  uploadDir,
  jwtSecret,
  adminSetupCode,
  cookieSecure = false,
  clientDistDir = null,
}) {
  const db = createDatabase(dbPath);
  const auth = createAuthHelpers({ db, jwtSecret, cookieSecure });
  const app = express();

  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(auth.attachUser);

  // Serve uploaded custom icons safely (prevents SVG script execution even if opened directly)
  fs.mkdirSync(uploadDir, { recursive: true });
  app.use(
    '/uploads/icons',
    (_req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      next();
    },
    express.static(uploadDir)
  );

  // API routes
  app.use('/api/auth', createAuthRouter({ db, auth, adminSetupCode }));
  app.use('/api/profile', createProfileRouter({ db, auth, uploadDir }));
  app.use('/api/availability', createAvailabilityRouter({ db, auth }));
  app.use('/api/admin', createAdminRouter({ db, auth }));

  // Serve compiled React app in production (or when dist exists)
  if (clientDistDir && fs.existsSync(path.join(clientDistDir, 'index.html'))) {
    app.use(express.static(clientDistDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
        return next();
      }
      return res.sendFile(path.join(clientDistDir, 'index.html'));
    });
  }

  return { app, db };
}
