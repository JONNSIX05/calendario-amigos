import { Router } from 'express';
import { serializePublicUser } from '../db.js';

const MONTH_RE = /^\d{4}-\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_CALENDARS = new Set(['dnd', 'plans']);
const VALID_STATUSES = new Set(['available', 'maybe']);

function userCanAccessCalendar(user, calendar) {
  if (!user) return false;
  if (user.is_admin) return true;
  return calendar === 'dnd' ? Boolean(user.can_dnd) : Boolean(user.can_plans);
}

function userCanAccessBothCalendars(user) {
  if (!user) return false;
  if (user.is_admin) return true;
  return Boolean(user.can_dnd && user.can_plans);
}

function getOtherCalendar(calendar) {
  return calendar === 'dnd' ? 'plans' : 'dnd';
}

export function createAvailabilityRouter({ db, auth }) {
  const router = Router();

  router.get('/', (req, res) => {
    const calendar = String(req.query.calendar || 'dnd').toLowerCase();
    if (!VALID_CALENDARS.has(calendar)) {
      return res.status(400).json({ error: 'Calendario inválido. Usa "dnd" o "plans".' });
    }

    // Access control:
    // - 'dnd' is public read-only when logged out, or requires can_dnd when logged in
    // - 'plans' always requires login + can_plans (or admin)
    if (calendar === 'plans') {
      if (!req.user) {
        return res.status(401).json({ error: 'Inicia sesión para ver el calendario de Otros planes.' });
      }
      if (!userCanAccessCalendar(req.user, 'plans')) {
        return res.status(403).json({ error: 'No tienes permiso para ver el calendario de Otros planes.' });
      }
    } else if (req.user && !userCanAccessCalendar(req.user, 'dnd')) {
      return res.status(403).json({ error: 'No tienes permiso para ver el calendario de DnD.' });
    }

    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const month = String(req.query.month || defaultMonth);

    if (!MONTH_RE.test(month)) {
      return res.status(400).json({ error: 'Formato de mes inválido. Usa YYYY-MM.' });
    }

    const roleCol = calendar === 'dnd' ? 'can_dnd' : 'can_plans';
    const users = db
      .prepare(`SELECT * FROM users WHERE ${roleCol} = 1 OR is_admin = 1 ORDER BY display_name COLLATE NOCASE ASC`)
      .all()
      .map(serializePublicUser);

    const entries = db
      .prepare(
        `SELECT a.id, a.user_id, a.calendar_type, a.date, a.status, a.note, a.updated_at
         FROM availability a
         INNER JOIN users u ON u.id = a.user_id
         WHERE a.calendar_type = ?
           AND a.date LIKE ?
           AND (u.${roleCol} = 1 OR u.is_admin = 1)
         ORDER BY a.date ASC, a.id ASC`
      )
      .all(calendar, `${month}-%`);

    return res.json({ calendar, month, users, entries });
  });

  // Bulk mirror existing days of a month (or specific dates) from one calendar to the other
  router.post('/mirror', auth.requireAuth, (req, res) => {
    if (!userCanAccessBothCalendars(req.user)) {
      return res.status(403).json({
        error: 'Necesitas tener acceso tanto a DnD como a Otros planes para espejear días.',
      });
    }

    const fromCalendar = String(req.body?.fromCalendar || 'dnd').toLowerCase();
    const toCalendar = String(req.body?.toCalendar || getOtherCalendar(fromCalendar)).toLowerCase();
    const month = req.body?.month ? String(req.body.month) : null;
    const dates = Array.isArray(req.body?.dates) ? req.body.dates.map(String) : null;
    const overwrite = Boolean(req.body?.overwrite);

    if (!VALID_CALENDARS.has(fromCalendar) || !VALID_CALENDARS.has(toCalendar) || fromCalendar === toCalendar) {
      return res.status(400).json({ error: 'Calendarios origen y destino inválidos.' });
    }

    if (month && !MONTH_RE.test(month)) {
      return res.status(400).json({ error: 'Formato de mes inválido. Usa YYYY-MM.' });
    }

    if (dates) {
      if (dates.length === 0 || dates.length > 62 || !dates.every((d) => DATE_RE.test(d))) {
        return res.status(400).json({ error: 'Lista de fechas inválida.' });
      }
    } else if (!month) {
      return res.status(400).json({ error: 'Debes indicar un mes (YYYY-MM) o una lista de fechas.' });
    }

    const upsertStmt = db.prepare(
      `INSERT INTO availability (user_id, calendar_type, date, status, note, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(user_id, calendar_type, date)
       DO UPDATE SET status = excluded.status, note = excluded.note, updated_at = datetime('now')`
    );

    const count = db.transaction(() => {
      let sourceEntries = [];
      if (dates) {
        const placeholders = dates.map(() => '?').join(', ');
        sourceEntries = db
          .prepare(
            `SELECT date, status, note FROM availability
             WHERE user_id = ? AND calendar_type = ? AND date IN (${placeholders})`
          )
          .all(req.user.id, fromCalendar, ...dates);

        if (overwrite) {
          db.prepare(
            `DELETE FROM availability
             WHERE user_id = ? AND calendar_type = ? AND date IN (${placeholders})`
          ).run(req.user.id, toCalendar, ...dates);
        }
      } else {
        sourceEntries = db
          .prepare(
            `SELECT date, status, note FROM availability
             WHERE user_id = ? AND calendar_type = ? AND date LIKE ?`
          )
          .all(req.user.id, fromCalendar, `${month}-%`);

        if (overwrite) {
          db.prepare(
            `DELETE FROM availability
             WHERE user_id = ? AND calendar_type = ? AND date LIKE ?`
          ).run(req.user.id, toCalendar, `${month}-%`);
        }
      }

      for (const item of sourceEntries) {
        upsertStmt.run(req.user.id, toCalendar, item.date, item.status, item.note);
      }

      return sourceEntries.length;
    })();

    return res.json({
      ok: true,
      mirroredCount: count,
      fromCalendar,
      toCalendar,
    });
  });

  router.put('/:date', auth.requireAuth, (req, res) => {
    const date = String(req.params.date || '');
    const calendar = String(req.body?.calendar || 'dnd').toLowerCase();
    const status = String(req.body?.status || '').toLowerCase();
    const note = String(req.body?.note || '').trim().slice(0, 160);
    const mirror = Boolean(req.body?.mirror);

    if (!DATE_RE.test(date)) {
      return res.status(400).json({ error: 'Fecha inválida. Usa formato YYYY-MM-DD.' });
    }
    if (!VALID_CALENDARS.has(calendar)) {
      return res.status(400).json({ error: 'Calendario inválido.' });
    }
    if (!userCanAccessCalendar(req.user, calendar)) {
      return res.status(403).json({ error: 'No tienes permiso para editar este calendario.' });
    }
    if (mirror && !userCanAccessBothCalendars(req.user)) {
      return res.status(403).json({
        error: 'Necesitas acceso a ambos calendarios para espejear tu disponibilidad.',
      });
    }
    if (!VALID_STATUSES.has(status)) {
      return res.status(400).json({ error: 'Estado inválido. Usa "available" o "maybe".' });
    }

    const upsertStmt = db.prepare(
      `INSERT INTO availability (user_id, calendar_type, date, status, note, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(user_id, calendar_type, date)
       DO UPDATE SET status = excluded.status, note = excluded.note, updated_at = datetime('now')`
    );

    db.transaction(() => {
      upsertStmt.run(req.user.id, calendar, date, status, note);
      if (mirror) {
        const otherCal = getOtherCalendar(calendar);
        upsertStmt.run(req.user.id, otherCal, date, status, note);
      }
    })();

    const entry = db
      .prepare(
        'SELECT id, user_id, calendar_type, date, status, note, updated_at FROM availability WHERE user_id = ? AND calendar_type = ? AND date = ?'
      )
      .get(req.user.id, calendar, date);

    return res.json({ entry, mirrored: mirror });
  });

  router.delete('/:date', auth.requireAuth, (req, res) => {
    const date = String(req.params.date || '');
    const calendar = String(req.query.calendar || req.body?.calendar || 'dnd').toLowerCase();
    const mirror = req.query.mirror === 'true' || Boolean(req.body?.mirror);

    if (!DATE_RE.test(date)) {
      return res.status(400).json({ error: 'Fecha inválida.' });
    }
    if (!VALID_CALENDARS.has(calendar)) {
      return res.status(400).json({ error: 'Calendario inválido.' });
    }
    if (!userCanAccessCalendar(req.user, calendar)) {
      return res.status(403).json({ error: 'No tienes permiso para editar este calendario.' });
    }
    if (mirror && !userCanAccessBothCalendars(req.user)) {
      return res.status(403).json({
        error: 'Necesitas acceso a ambos calendarios para espejear esta acción.',
      });
    }

    const deleteStmt = db.prepare(
      'DELETE FROM availability WHERE user_id = ? AND calendar_type = ? AND date = ?'
    );

    db.transaction(() => {
      deleteStmt.run(req.user.id, calendar, date);
      if (mirror) {
        deleteStmt.run(req.user.id, getOtherCalendar(calendar), date);
      }
    })();

    return res.json({ ok: true, mirrored: mirror });
  });

  return router;
}
