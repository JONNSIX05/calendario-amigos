import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Router } from 'express';
import multer from 'multer';
import { PRESET_ICON_IDS, serializeUser } from '../db.js';
import { isValidPngBuffer, sanitizeSvgBuffer } from '../utils/sanitizeSvg.js';

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;
const MAX_ICON_BYTES = 512 * 1024; // 512 KB

export function createProfileRouter({ db, auth, uploadDir }) {
  const router = Router();
  fs.mkdirSync(uploadDir, { recursive: true });

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_ICON_BYTES },
  });

  function removeOldUploadedIcon(iconType, iconValue) {
    if (iconType !== 'upload' || !iconValue?.startsWith('/uploads/icons/')) return;
    const filename = path.basename(iconValue);
    const fullPath = path.join(uploadDir, filename);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch {
        // Ignore cleanup failure
      }
    }
  }

  router.patch('/', auth.requireAuth, (req, res) => {
    const updates = [];
    const params = [];

    if (req.body?.displayName !== undefined) {
      const displayName = String(req.body.displayName).trim();
      if (displayName.length < 1 || displayName.length > 30) {
        return res.status(400).json({ error: 'El nombre visible debe tener entre 1 y 30 caracteres.' });
      }
      updates.push('display_name = ?');
      params.push(displayName);
    }

    if (req.body?.iconBgColor !== undefined) {
      const color = String(req.body.iconBgColor).trim();
      if (!HEX_COLOR_RE.test(color)) {
        return res.status(400).json({ error: 'El color de fondo debe ser un código hexadecimal válido (#RRGGBB).' });
      }
      updates.push('icon_bg_color = ?');
      params.push(color);
    }

    let switchingToPreset = false;
    if (req.body?.iconType === 'preset' && req.body?.iconValue !== undefined) {
      const presetId = String(req.body.iconValue).trim();
      if (!PRESET_ICON_IDS.has(presetId)) {
        return res.status(400).json({ error: 'Ícono predeterminado no válido.' });
      }
      updates.push("icon_type = 'preset'", 'icon_value = ?');
      params.push(presetId);
      switchingToPreset = true;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay cambios para actualizar.' });
    }

    const previous = db.prepare('SELECT icon_type, icon_value FROM users WHERE id = ?').get(req.user.id);
    params.push(req.user.id);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    if (switchingToPreset && previous) {
      removeOldUploadedIcon(previous.icon_type, previous.icon_value);
    }

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    return res.json({ user: serializeUser(updated) });
  });

  router.post('/icon', auth.requireAuth, (req, res) => {
    upload.single('icon')(req, res, (multerErr) => {
      if (multerErr) {
        if (multerErr.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'El archivo supera el tamaño máximo permitido de 512 KB.' });
        }
        return res.status(400).json({ error: 'Error al subir el archivo.' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'Debes seleccionar un archivo .svg o .png.' });
      }

      const ext = path.extname(req.file.originalname || '').toLowerCase();
      const mime = (req.file.mimetype || '').toLowerCase();

      let finalExt = '';
      let finalBuffer = null;

      try {
        if (ext === '.png' || mime === 'image/png') {
          if (!isValidPngBuffer(req.file.buffer)) {
            return res.status(400).json({ error: 'El archivo no es una imagen PNG válida.' });
          }
          finalExt = '.png';
          finalBuffer = req.file.buffer;
        } else if (ext === '.svg' || mime === 'image/svg+xml') {
          finalBuffer = sanitizeSvgBuffer(req.file.buffer);
          finalExt = '.svg';
        } else {
          return res.status(400).json({ error: 'Solo se permiten archivos en formato .svg o .png.' });
        }
      } catch (err) {
        return res.status(400).json({ error: err.message || 'Archivo de ícono inválido.' });
      }

      const filename = `u${req.user.id}-${crypto.randomBytes(8).toString('hex')}${finalExt}`;
      const destination = path.join(uploadDir, filename);
      fs.writeFileSync(destination, finalBuffer);

      const previous = db.prepare('SELECT icon_type, icon_value FROM users WHERE id = ?').get(req.user.id);
      const publicUrl = `/uploads/icons/${filename}`;

      db.prepare("UPDATE users SET icon_type = 'upload', icon_value = ? WHERE id = ?").run(
        publicUrl,
        req.user.id
      );

      if (previous) {
        removeOldUploadedIcon(previous.icon_type, previous.icon_value);
      }

      const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
      return res.json({ user: serializeUser(updated) });
    });
  });

  return router;
}
