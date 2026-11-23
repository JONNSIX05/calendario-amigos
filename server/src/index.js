import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createApp } from './app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

dotenv.config({ path: path.join(rootDir, '.env') });

const PORT = Number(process.env.PORT || 3001);
const JWT_SECRET = process.env.JWT_SECRET || 'dev-fallback-secret-change-me';
const ADMIN_SETUP_CODE = process.env.ADMIN_SETUP_CODE || 'ADMIN2026';
const DB_PATH = path.resolve(rootDir, process.env.DB_PATH || './data/calendar.db');
const UPLOAD_DIR = path.resolve(rootDir, process.env.UPLOAD_DIR || './data/uploads/icons');
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';
const CLIENT_DIST_DIR = path.join(rootDir, 'client', 'dist');

const { app } = createApp({
  dbPath: DB_PATH,
  uploadDir: UPLOAD_DIR,
  jwtSecret: JWT_SECRET,
  adminSetupCode: ADMIN_SETUP_CODE,
  cookieSecure: COOKIE_SECURE,
  clientDistDir: CLIENT_DIST_DIR,
});

app.listen(PORT, () => {
  console.log(`Servidor Calendario listo en http://localhost:${PORT}`);
});
