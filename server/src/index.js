import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createApp } from './app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

dotenv.config({ path: path.join(rootDir, '.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET || (isProduction ? '' : 'dev-fallback-secret-change-me');
const ADMIN_SETUP_CODE = process.env.ADMIN_SETUP_CODE || 'ADMIN2026';
const DB_PATH = path.resolve(rootDir, process.env.DB_PATH || './data/calendar.db');
const UPLOAD_DIR = path.resolve(rootDir, process.env.UPLOAD_DIR || './data/uploads/icons');
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';
const CLIENT_DIST_DIR = path.join(rootDir, 'client', 'dist');

const INSECURE_JWT_SECRETS = new Set([
  '',
  'dev-fallback-secret-change-me',
  'cambia-esta-clave-por-una-larga-y-aleatoria',
]);

if (isProduction) {
  if (INSECURE_JWT_SECRETS.has(JWT_SECRET) || JWT_SECRET.length < 32) {
    console.error(
      '[FATAL] En NODE_ENV=production debes configurar un JWT_SECRET seguro de al menos 32 caracteres.'
    );
    process.exit(1);
  }
  if (!ADMIN_SETUP_CODE || ADMIN_SETUP_CODE === 'ADMIN2026') {
    console.error(
      '[FATAL] En NODE_ENV=production debes cambiar ADMIN_SETUP_CODE por un código único (no uses ADMIN2026).'
    );
    process.exit(1);
  }
}

const { app, db } = createApp({
  dbPath: DB_PATH,
  uploadDir: UPLOAD_DIR,
  jwtSecret: JWT_SECRET,
  adminSetupCode: ADMIN_SETUP_CODE,
  cookieSecure: COOKIE_SECURE,
  clientDistDir: CLIENT_DIST_DIR,
});

const server = app.listen(PORT, HOST, () => {
  console.log(`Servidor Calendario (${NODE_ENV}) listo en http://${HOST}:${PORT}`);
});

function shutdown(signal) {
  console.log(`Recibida señal ${signal}, cerrando servidor y base de datos...`);
  server.close(() => {
    try {
      db.close();
    } catch {
      // ignore
    }
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
