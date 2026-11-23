import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { DEFAULT_BG_COLORS, PRESET_ICON_IDS, serializeUser } from '../db.js';

const USERNAME_RE = /^[a-zA-Z0-9._-]{2,24}$/;
const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

export function createAuthRouter({ db, auth, adminSetupCode, authRateLimiter = (_req, _res, next) => next() }) {
  const router = Router();

  function getUserCount() {
    return db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  }

  router.get('/status', (_req, res) => {
    const count = getUserCount();
    res.json({ needsSetup: count === 0 });
  });

  router.get('/me', (req, res) => {
    res.json({ user: req.user || null });
  });

  router.get('/invite/:code', authRateLimiter, (req, res) => {
    const code = String(req.params.code || '').trim();
    if (!code) {
      return res.status(400).json({ valid: false, error: 'Código de invitación vacío.' });
    }

    const userCount = getUserCount();
    if (userCount === 0 && adminSetupCode && code === adminSetupCode) {
      return res.json({ valid: true });
    }

    const invite = db
      .prepare(
        `SELECT id FROM invites
         WHERE code = ? AND active = 1 AND uses_count < 1`
      )
      .get(code);

    if (!invite) {
      return res.status(404).json({
        valid: false,
        error: 'El código de invitación no es válido o ya fue utilizado.',
      });
    }

    return res.json({ valid: true });
  });

  router.post('/register', authRateLimiter, async (req, res) => {
    const username = String(req.body?.username || '').trim();
    const displayName = String(req.body?.displayName || '').trim() || username;
    const password = String(req.body?.password || '');
    const inviteCode = String(req.body?.inviteCode || '').trim();
    const requestedIcon = String(req.body?.iconValue || 'd20').trim();
    const requestedColor = String(req.body?.iconBgColor || '').trim();

    if (!USERNAME_RE.test(username)) {
      return res.status(400).json({
        error: 'El usuario debe tener entre 2 y 24 caracteres (letras, números, ".", "_" o "-").',
      });
    }
    if (displayName.length < 1 || displayName.length > 30) {
      return res.status(400).json({ error: 'El nombre visible debe tener entre 1 y 30 caracteres.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    }
    if (!inviteCode) {
      return res.status(400).json({ error: 'Necesitas un código de invitación para registrarte.' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(409).json({ error: 'Ese nombre de usuario ya está en uso.' });
    }

    const iconValue = PRESET_ICON_IDS.has(requestedIcon) ? requestedIcon : 'd20';
    const passwordHash = await bcrypt.hash(password, 10);

    try {
      const createdUser = db.transaction(() => {
        const userCount = getUserCount();
        const iconBgColor = HEX_COLOR_RE.test(requestedColor)
          ? requestedColor
          : DEFAULT_BG_COLORS[userCount % DEFAULT_BG_COLORS.length];

        let isAdmin = 0;
        let canDnd = 1;
        let canPlans = 0;

        if (userCount === 0 && adminSetupCode && inviteCode === adminSetupCode) {
          isAdmin = 1;
          canDnd = 1;
          canPlans = 1;
        } else {
          const invite = db
            .prepare(
              `SELECT * FROM invites
               WHERE code = ? AND active = 1 AND uses_count < 1`
            )
            .get(inviteCode);

          if (!invite) {
            const err = new Error('Código de invitación inválido o ya utilizado.');
            err.status = 403;
            throw err;
          }

          canDnd = invite.can_dnd ? 1 : 0;
          canPlans = invite.can_plans ? 1 : 0;

          db.prepare('UPDATE invites SET uses_count = 1, active = 0 WHERE id = ?').run(invite.id);
        }

        const info = db
          .prepare(
            `INSERT INTO users (username, display_name, password_hash, icon_type, icon_value, icon_bg_color, is_admin, can_dnd, can_plans)
             VALUES (?, ?, ?, 'preset', ?, ?, ?, ?, ?)`
          )
          .run(username, displayName, passwordHash, iconValue, iconBgColor, isAdmin, canDnd, canPlans);

        return db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
      })();

      const token = auth.signToken(createdUser.id);
      auth.setAuthCookie(res, token);
      return res.status(201).json({ user: serializeUser(createdUser) });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message });
      }
      if (String(err.message).includes('UNIQUE')) {
        return res.status(409).json({ error: 'Ese nombre de usuario ya está en uso.' });
      }
      return res.status(500).json({ error: 'Error al registrar el usuario.' });
    }
  });

  router.post('/login', authRateLimiter, async (req, res) => {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');

    if (!username || !password) {
      return res.status(400).json({ error: 'Ingresa tu usuario y contraseña.' });
    }

    const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!row) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    const valid = await bcrypt.compare(password, row.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    const token = auth.signToken(row.id);
    auth.setAuthCookie(res, token);
    return res.json({ user: serializeUser(row) });
  });

  router.post('/logout', (_req, res) => {
    auth.clearAuthCookie(res);
    res.json({ ok: true });
  });

  return router;
}
