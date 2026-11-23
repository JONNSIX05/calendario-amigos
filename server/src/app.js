import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createDatabase } from './db.js';
import { createAuthHelpers } from './middleware/auth.js';
import {
  createCsrfProtection,
  createRateLimiter,
  createSecurityHeaders,
} from './middleware/security.js';
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
  authRateLimit = { windowMs: 15 * 60 * 1000, max: 20 },
}) {
  const db = createDatabase(dbPath);
  const auth = createAuthHelpers({ db, jwtSecret, cookieSecure });
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(createSecurityHeaders({ cookieSecure }));
  app.use(createCsrfProtection());
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(auth.attachUser);

  // Prevent search engines and crawlers from indexing the site
  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain');
    res.send('User-agent: *\nDisallow: /\n');
  });

  // Healthcheck endpoint for Docker & monitoring
  app.get('/api/health', (_req, res) => {
    try {
      db.prepare('SELECT 1 AS ok').get();
      return res.json({ status: 'ok' });
    } catch {
      return res.status(503).json({ status: 'error' });
    }
  });

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

  const authRateLimiter = authRateLimit
    ? createRateLimiter(authRateLimit)
    : (_req, _res, next) => next();

  // API routes
  app.use('/api/auth', createAuthRouter({ db, auth, adminSetupCode, authRateLimiter }));
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
