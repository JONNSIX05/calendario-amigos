import crypto from 'node:crypto';
import { Router } from 'express';
import { serializeUser } from '../db.js';

function generateInviteCode() {
  return crypto.randomBytes(6).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
}

export function createAdminRouter({ db, auth }) {
  const router = Router();
  router.use(auth.requireAdmin);

  router.get('/invites', (_req, res) => {
    const rows = db
      .prepare(
        `SELECT i.*, u.display_name AS creator_name
         FROM invites i
         LEFT JOIN users u ON u.id = i.created_by
         ORDER BY i.id DESC`
      )
      .all()
      .map((row) => ({
        id: row.id,
        code: row.code,
        label: row.label,
        can_dnd: Boolean(row.can_dnd),
        can_plans: Boolean(row.can_plans),
        max_uses: row.max_uses,
        uses_count: row.uses_count,
        active: Boolean(row.active),
        creator_name: row.creator_name || 'Admin',
        created_at: row.created_at,
      }));

    res.json({ invites: rows });
  });

  router.post('/invites', (req, res) => {
    const canDnd = Boolean(req.body?.can_dnd);
    const canPlans = Boolean(req.body?.can_plans);
    const label = String(req.body?.label || '').trim().slice(0, 60);
    // All invites are strictly single-use
    const maxUses = 1;

    if (!canDnd && !canPlans) {
      return res.status(400).json({ error: 'La invitación debe dar acceso al menos a DnD o a Otros planes.' });
    }

    const code = generateInviteCode();
    const info = db
      .prepare(
        `INSERT INTO invites (code, label, can_dnd, can_plans, max_uses, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(code, label, canDnd ? 1 : 0, canPlans ? 1 : 0, maxUses, req.user.id);

    const created = db.prepare('SELECT * FROM invites WHERE id = ?').get(info.lastInsertRowid);
    return res.status(201).json({
      invite: {
        id: created.id,
        code: created.code,
        label: created.label,
        can_dnd: Boolean(created.can_dnd),
        can_plans: Boolean(created.can_plans),
        max_uses: created.max_uses,
        uses_count: created.uses_count,
        active: Boolean(created.active),
        created_at: created.created_at,
      },
    });
  });

  router.delete('/invites/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'ID de invitación inválido.' });
    }
    db.prepare('DELETE FROM invites WHERE id = ?').run(id);
    return res.json({ ok: true });
  });

  router.get('/users', (_req, res) => {
    const users = db
      .prepare('SELECT * FROM users ORDER BY is_admin DESC, display_name COLLATE NOCASE ASC')
      .all()
      .map(serializeUser);
    res.json({ users });
  });

  router.patch('/users/:id/roles', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'ID de usuario inválido.' });
    }

    const target = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!target) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const canDnd = req.body?.can_dnd !== undefined ? Boolean(req.body.can_dnd) : Boolean(target.can_dnd);
    const canPlans = req.body?.can_plans !== undefined ? Boolean(req.body.can_plans) : Boolean(target.can_plans);

    if (!canDnd && !canPlans) {
      return res.status(400).json({ error: 'El usuario debe tener acceso al menos a un calendario.' });
    }

    db.prepare('UPDATE users SET can_dnd = ?, can_plans = ? WHERE id = ?').run(
      canDnd ? 1 : 0,
      canPlans ? 1 : 0,
      id
    );

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    return res.json({ user: serializeUser(updated) });
  });

  return router;
}
