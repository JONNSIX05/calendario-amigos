import jwt from 'jsonwebtoken';
import { serializeUser } from '../db.js';

export const AUTH_COOKIE_NAME = 'cal_session';

export function createAuthHelpers({ db, jwtSecret, cookieSecure }) {
  function signToken(userId) {
    return jwt.sign({ uid: userId }, jwtSecret, { expiresIn: '30d' });
  }

  function setAuthCookie(res, token) {
    res.cookie(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: Boolean(cookieSecure),
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }

  function clearAuthCookie(res) {
    res.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: true,
      sameSite: 'lax',
      secure: Boolean(cookieSecure),
      path: '/',
    });
  }

  function attachUser(req, _res, next) {
    const token = req.cookies?.[AUTH_COOKIE_NAME];
    if (!token) {
      req.user = null;
      return next();
    }

    try {
      const payload = jwt.verify(token, jwtSecret);
      const row = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.uid);
      req.user = serializeUser(row);
    } catch {
      req.user = null;
    }
    return next();
  }

  function requireAuth(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: 'Debes iniciar sesión para realizar esta acción.' });
    }
    return next();
  }

  function requireAdmin(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: 'Debes iniciar sesión.' });
    }
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Solo el administrador puede acceder a esta sección.' });
    }
    return next();
  }

  return {
    signToken,
    setAuthCookie,
    clearAuthCookie,
    attachUser,
    requireAuth,
    requireAdmin,
  };
}
