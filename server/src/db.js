import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

export const PRESET_ICON_IDS = new Set([
  'd20',
  'sword',
  'wizard',
  'dragon',
  'cat',
  'fox',
  'frog',
  'ghost',
  'gamepad',
  'pizza',
  'coffee',
  'rocket',
  'music',
  'star',
  'bolt',
  'crown',
]);

export const DEFAULT_BG_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f43f5e',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
  '#a855f7',
  '#14b8a6',
];

export function createDatabase(dbPath) {
  const dir = path.dirname(dbPath);
  fs.mkdirSync(dir, { recursive: true });

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      icon_type TEXT NOT NULL DEFAULT 'preset' CHECK (icon_type IN ('preset', 'upload')),
      icon_value TEXT NOT NULL DEFAULT 'd20',
      icon_bg_color TEXT NOT NULL DEFAULT '#6366f1',
      is_admin INTEGER NOT NULL DEFAULT 0,
      can_dnd INTEGER NOT NULL DEFAULT 1,
      can_plans INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS invites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL DEFAULT '',
      can_dnd INTEGER NOT NULL DEFAULT 1,
      can_plans INTEGER NOT NULL DEFAULT 0,
      max_uses INTEGER,
      uses_count INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS availability (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      calendar_type TEXT NOT NULL DEFAULT 'dnd' CHECK (calendar_type IN ('dnd', 'plans')),
      date TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('available', 'maybe')),
      note TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, calendar_type, date)
    );

    CREATE INDEX IF NOT EXISTS idx_availability_cal_date
      ON availability(calendar_type, date);
  `);

  return db;
}

export function serializeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    icon_type: row.icon_type,
    icon_value: row.icon_value,
    icon_bg_color: row.icon_bg_color,
    is_admin: Boolean(row.is_admin),
    can_dnd: Boolean(row.can_dnd),
    can_plans: Boolean(row.can_plans),
    created_at: row.created_at,
  };
}

export function serializePublicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    icon_type: row.icon_type,
    icon_value: row.icon_value,
    icon_bg_color: row.icon_bg_color,
  };
}
