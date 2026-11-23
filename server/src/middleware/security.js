const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function createSecurityHeaders({ cookieSecure = false } = {}) {
  return function securityHeaders(req, res, next) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex');

    if (cookieSecure) {
      res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
    }

    // Uploaded icons set their own stricter sandbox CSP
    if (!req.path.startsWith('/uploads/icons')) {
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self'; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"
      );
    }

    next();
  };
}

export function createCsrfProtection() {
  return function csrfProtection(req, res, next) {
    if (!MUTATING_METHODS.has(req.method)) {
      return next();
    }

    const secFetchSite = req.headers['sec-fetch-site'];
    if (secFetchSite && secFetchSite.toLowerCase() === 'cross-site') {
      return res.status(403).json({ error: 'Solicitud bloqueada por protección CSRF (cross-site).' });
    }

    const origin = req.headers.origin;
    if (origin) {
      let originHost;
      try {
        originHost = new URL(origin).host.toLowerCase();
      } catch {
        return res.status(403).json({ error: 'Encabezado Origin inválido.' });
      }

      const targetHost = String(req.headers['x-forwarded-host'] || req.headers.host || '')
        .split(',')[0]
        .trim()
        .toLowerCase();

      if (targetHost && originHost !== targetHost) {
        return res.status(403).json({ error: 'Solicitud bloqueada por protección CSRF (origen no permitido).' });
      }
    }

    return next();
  };
}

export function createRateLimiter({
  windowMs = 15 * 60 * 1000,
  max = 20,
  message = 'Demasiados intentos. Por favor espera unos minutos antes de volver a intentarlo.',
} = {}) {
  const hits = new Map();

  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits.entries()) {
      if (now >= entry.resetAt) {
        hits.delete(key);
      }
    }
  }, Math.min(windowMs, 60 * 1000));

  if (typeof cleanupTimer.unref === 'function') {
    cleanupTimer.unref();
  }

  return function rateLimiter(req, res, next) {
    const now = Date.now();
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    let entry = hits.get(ip);

    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(ip, entry);
    }

    entry.count += 1;

    const remaining = Math.max(0, max - entry.count);
    const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));

    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));

    if (entry.count > max) {
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({ error: message });
    }

    return next();
  };
}
