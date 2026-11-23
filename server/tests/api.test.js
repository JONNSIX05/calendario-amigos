import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../src/app.js';

function createCookieJar() {
  const cookies = new Map();
  return {
    update(res) {
      const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
      for (const raw of setCookies) {
        const [pair] = raw.split(';');
        const eqIdx = pair.indexOf('=');
        if (eqIdx > 0) {
          const name = pair.slice(0, eqIdx).trim();
          const val = pair.slice(eqIdx + 1).trim();
          if (val === '') cookies.delete(name);
          else cookies.set(name, val);
        }
      }
    },
    header() {
      return [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
    },
  };
}

async function apiRequest(baseUrl, jar, method, urlPath, body) {
  const headers = {};
  if (jar) {
    const cookieHeader = jar.header();
    if (cookieHeader) headers.cookie = cookieHeader;
  }

  let payload;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers['content-type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(`${baseUrl}${urlPath}`, { method, headers, body: payload });
  if (jar) jar.update(res);

  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data, headers: res.headers };
}

test('Calendario API: auth, roles, invitaciones, aislamiento DnD/Otros planes, iconos y disponibilidad', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cal-test-'));
  const dbPath = path.join(tmpDir, 'test.db');
  const uploadDir = path.join(tmpDir, 'uploads');

  const { app, db } = createApp({
    dbPath,
    uploadDir,
    jwtSecret: 'test-secret-key',
    adminSetupCode: 'SETUP99',
    cookieSecure: false,
  });

  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const adminJar = createCookieJar();
  const dndJar = createCookieJar();
  const bothJar = createCookieJar();

  // 1. Status needsSetup = true initially
  const statusRes = await apiRequest(baseUrl, null, 'GET', '/api/auth/status');
  assert.equal(statusRes.status, 200);
  assert.equal(statusRes.data.needsSetup, true);

  // 2. Reject invalid setup code
  const badReg = await apiRequest(baseUrl, adminJar, 'POST', '/api/auth/register', {
    username: 'master',
    displayName: 'Dungeon Master',
    password: 'password123',
    inviteCode: 'WRONG',
  });
  assert.equal(badReg.status, 403);

  // 3. Register initial Admin
  const adminReg = await apiRequest(baseUrl, adminJar, 'POST', '/api/auth/register', {
    username: 'master',
    displayName: 'Dungeon Master',
    password: 'password123',
    inviteCode: 'SETUP99',
    iconValue: 'd20',
    iconBgColor: '#6366f1',
  });
  assert.equal(adminReg.status, 201);
  assert.equal(adminReg.data.user.is_admin, true);
  assert.equal(adminReg.data.user.can_dnd, true);
  assert.equal(adminReg.data.user.can_plans, true);

  // 4. Create single-use DnD-only invite and single-use Both invite (even if max_uses: null is passed)
  const invDndRes = await apiRequest(baseUrl, adminJar, 'POST', '/api/admin/invites', {
    label: 'Solo DnD',
    can_dnd: true,
    can_plans: false,
  });
  assert.equal(invDndRes.status, 201);
  assert.equal(invDndRes.data.invite.max_uses, 1);
  const dndCode = invDndRes.data.invite.code;

  const invBothRes = await apiRequest(baseUrl, adminJar, 'POST', '/api/admin/invites', {
    label: 'Ambos',
    can_dnd: true,
    can_plans: true,
    max_uses: null,
  });
  assert.equal(invBothRes.status, 201);
  assert.equal(invBothRes.data.invite.max_uses, 1);
  const bothCode = invBothRes.data.invite.code;

  // 5. Preview invite publicly must NOT leak roles/access
  const previewRes = await apiRequest(baseUrl, null, 'GET', `/api/auth/invite/${dndCode}`);
  assert.equal(previewRes.status, 200);
  assert.equal(previewRes.data.valid, true);
  assert.equal(previewRes.data.can_dnd, undefined);
  assert.equal(previewRes.data.can_plans, undefined);
  assert.equal(previewRes.data.label, undefined);

  // 6. Register DnD-only friend using single-use invite with custom icon & color
  const dndReg = await apiRequest(baseUrl, dndJar, 'POST', '/api/auth/register', {
    username: 'elena',
    displayName: 'Elena',
    password: 'password123',
    inviteCode: dndCode,
    iconValue: 'fox',
    iconBgColor: '#f97316',
  });
  assert.equal(dndReg.status, 201);
  assert.equal(dndReg.data.user.can_dnd, true);
  assert.equal(dndReg.data.user.can_plans, false);
  assert.equal(dndReg.data.user.icon_value, 'fox');
  assert.equal(dndReg.data.user.icon_bg_color, '#f97316');

  // 7. Second use of single-use invite must fail
  const exhaustedReg = await apiRequest(baseUrl, null, 'POST', '/api/auth/register', {
    username: 'otro',
    displayName: 'Otro',
    password: 'password123',
    inviteCode: dndCode,
  });
  assert.equal(exhaustedReg.status, 403);

  // 8. Register Both-calendars friend and verify that code also expires after 1 use
  const bothReg = await apiRequest(baseUrl, bothJar, 'POST', '/api/auth/register', {
    username: 'carlos',
    displayName: 'Carlos',
    password: 'password123',
    inviteCode: bothCode,
  });
  assert.equal(bothReg.status, 201);
  assert.equal(bothReg.data.user.can_dnd, true);
  assert.equal(bothReg.data.user.can_plans, true);

  const bothSecondUse = await apiRequest(baseUrl, null, 'GET', `/api/auth/invite/${bothCode}`);
  assert.equal(bothSecondUse.status, 404);

  // 9. Access control on calendars
  const pubDnd = await apiRequest(baseUrl, null, 'GET', '/api/availability?month=2026-11&calendar=dnd');
  assert.equal(pubDnd.status, 200);
  assert.equal(pubDnd.data.users.length, 3);

  const pubPlans = await apiRequest(baseUrl, null, 'GET', '/api/availability?month=2026-11&calendar=plans');
  assert.equal(pubPlans.status, 401);

  const dndUserPlans = await apiRequest(baseUrl, dndJar, 'GET', '/api/availability?month=2026-11&calendar=plans');
  assert.equal(dndUserPlans.status, 403);

  const bothUserPlans = await apiRequest(baseUrl, bothJar, 'GET', '/api/availability?month=2026-11&calendar=plans');
  assert.equal(bothUserPlans.status, 200);
  assert.equal(bothUserPlans.data.users.length, 2); // Only Admin and Carlos

  // 10. Availability write isolation
  const dndWriteOk = await apiRequest(baseUrl, dndJar, 'PUT', '/api/availability/2026-11-28', {
    calendar: 'dnd',
    status: 'available',
    note: 'Llevo dados',
  });
  assert.equal(dndWriteOk.status, 200);
  assert.equal(dndWriteOk.data.entry.note, 'Llevo dados');

  const dndWritePlansDenied = await apiRequest(baseUrl, dndJar, 'PUT', '/api/availability/2026-11-28', {
    calendar: 'plans',
    status: 'available',
  });
  assert.equal(dndWritePlansDenied.status, 403);

  const bothWritePlansOk = await apiRequest(baseUrl, bothJar, 'PUT', '/api/availability/2026-11-29', {
    calendar: 'plans',
    status: 'maybe',
    note: 'Depende del trabajo',
  });
  assert.equal(bothWritePlansOk.status, 200);

  // 11. Admin grants plans role to Elena
  const grantRes = await apiRequest(baseUrl, adminJar, 'PATCH', `/api/admin/users/${dndReg.data.user.id}/roles`, {
    can_dnd: true,
    can_plans: true,
  });
  assert.equal(grantRes.status, 200);
  assert.equal(grantRes.data.user.can_plans, true);

  const elenaPlansNow = await apiRequest(baseUrl, dndJar, 'GET', '/api/availability?month=2026-11&calendar=plans');
  assert.equal(elenaPlansNow.status, 200);

  // 12. Profile update: icon_bg_color validation & SVG sanitization
  const badColor = await apiRequest(baseUrl, dndJar, 'PATCH', '/api/profile', {
    iconBgColor: 'not-a-color',
  });
  assert.equal(badColor.status, 400);

  const goodProfile = await apiRequest(baseUrl, dndJar, 'PATCH', '/api/profile', {
    displayName: 'Elena M.',
    iconBgColor: '#ec4899',
    iconType: 'preset',
    iconValue: 'wizard',
  });
  assert.equal(goodProfile.status, 200);
  assert.equal(goodProfile.data.user.icon_bg_color, '#ec4899');
  assert.equal(goodProfile.data.user.icon_value, 'wizard');

  // Upload SVG containing malicious <script> and onclick
  const dirtySvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" onclick="alert(1)"><script>alert(2)</script><circle cx="12" cy="12" r="10"/></svg>';
  const svgForm = new FormData();
  svgForm.append('icon', new Blob([dirtySvg], { type: 'image/svg+xml' }), 'hero.svg');

  const svgUpload = await apiRequest(baseUrl, dndJar, 'POST', '/api/profile/icon', svgForm);
  assert.equal(svgUpload.status, 200);
  assert.equal(svgUpload.data.user.icon_type, 'upload');
  assert.match(svgUpload.data.user.icon_value, /^\/uploads\/icons\/.+\.svg$/);

  const servedSvg = await apiRequest(baseUrl, null, 'GET', svgUpload.data.user.icon_value);
  assert.equal(servedSvg.status, 200);
  assert.equal(servedSvg.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(!servedSvg.data.includes('<script'));
  assert.ok(!servedSvg.data.includes('onclick'));
  assert.ok(servedSvg.data.includes('<circle'));

  // Reject invalid file type (.txt)
  const badForm = new FormData();
  badForm.append('icon', new Blob(['hello'], { type: 'text/plain' }), 'evil.txt');
  const badUpload = await apiRequest(baseUrl, dndJar, 'POST', '/api/profile/icon', badForm);
  assert.equal(badUpload.status, 400);

  // 13. Healthcheck & security headers
  const healthRes = await apiRequest(baseUrl, null, 'GET', '/api/health');
  assert.equal(healthRes.status, 200);
  assert.equal(healthRes.data.status, 'ok');
  assert.equal(healthRes.headers.get('x-frame-options'), 'DENY');
  assert.equal(healthRes.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(healthRes.headers.get('x-powered-by'), null);
  assert.ok(healthRes.headers.get('content-security-policy')?.includes("frame-ancestors 'none'"));

  // 14. CSRF protection blocks cross-site mutations
  const csrfCrossSite = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { 'sec-fetch-site': 'cross-site' },
  });
  assert.equal(csrfCrossSite.status, 403);

  const csrfBadOrigin = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { origin: 'https://evil-attacker.com' },
  });
  assert.equal(csrfBadOrigin.status, 403);
});

test('Calendario API: rate limiting en endpoints de autenticación', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cal-rl-test-'));
  const dbPath = path.join(tmpDir, 'test.db');
  const uploadDir = path.join(tmpDir, 'uploads');

  const { app, db } = createApp({
    dbPath,
    uploadDir,
    jwtSecret: 'test-secret-key',
    adminSetupCode: 'SETUP99',
    cookieSecure: true,
    authRateLimit: { windowMs: 60_000, max: 3 },
  });

  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  for (let i = 0; i < 3; i++) {
    const res = await apiRequest(baseUrl, null, 'POST', '/api/auth/login', {
      username: 'nobody',
      password: 'wrong',
    });
    assert.equal(res.status, 401);
    assert.ok(res.headers.get('strict-transport-security')?.includes('max-age='));
  }

  const blockedRes = await apiRequest(baseUrl, null, 'POST', '/api/auth/login', {
    username: 'nobody',
    password: 'wrong',
  });
  assert.equal(blockedRes.status, 429);
  assert.ok(blockedRes.headers.get('retry-after'));
});
