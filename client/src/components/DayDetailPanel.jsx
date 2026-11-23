import React, { useEffect, useState } from 'react';
import { Check, HelpCircle, Trash2, X } from 'lucide-react';
import { formatFullDateEs } from '../utils/dates.js';
import { UserAvatar } from './UserAvatar.jsx';

export function DayDetailPanel({
  date,
  entries,
  usersById,
  currentUser,
  canEdit,
  activeCalendar,
  onSave,
  onDelete,
  onOpenLogin,
  onClose,
}) {
  const myEntry = currentUser ? entries.find((e) => e.user_id === currentUser.id) : null;
  const [status, setStatus] = useState(myEntry?.status || 'available');
  const [note, setNote] = useState(myEntry?.note || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatus(myEntry?.status || 'available');
    setNote(myEntry?.note || '');
  }, [date, myEntry?.status, myEntry?.note]);

  const availableEntries = entries.filter((e) => e.status === 'available');
  const maybeEntries = entries.filter((e) => e.status === 'maybe');

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(date, status, note);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setSaving(true);
    try {
      await onDelete(date);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <h2 className="modal-title" style={{ textTransform: 'capitalize' }}>
              {formatFullDateEs(date)}
            </h2>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
              Calendario: {activeCalendar === 'dnd' ? '🎲 DnD' : '✨ Otros planes'}
            </div>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>

        {canEdit ? (
          <form
            onSubmit={handleSave}
            className="form-stack"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 14,
              padding: 14,
              marginBottom: 18,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>Tu disponibilidad</div>

            <div className="status-toggle-group">
              <button
                type="button"
                className={`status-choice ${status === 'available' ? 'active-avail' : ''}`}
                onClick={() => setStatus('available')}
              >
                <Check size={15} />
                <span>Disponible</span>
              </button>

              <button
                type="button"
                className={`status-choice ${status === 'maybe' ? 'active-maybe' : ''}`}
                onClick={() => setStatus('maybe')}
              >
                <HelpCircle size={15} />
                <span>Quizás</span>
              </button>

              {myEntry && (
                <button
                  type="button"
                  className="btn-danger"
                  onClick={handleRemove}
                  disabled={saving}
                  title="Quitar mi disponibilidad"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>

            <label className="field-label">
              Nota adicional (opcional)
              <input
                className="text-input"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="ej. Libre después de las 7pm, llevo botana..."
                maxLength={160}
              />
            </label>

            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : myEntry ? 'Actualizar disponibilidad' : 'Guardar disponibilidad'}
            </button>
          </form>
        ) : !currentUser ? (
          <div
            className="alert-box info"
            style={{
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <span>Inicia sesión para marcar tu disponibilidad en este día.</span>
            <button
              type="button"
              className="btn-primary"
              style={{ padding: '6px 11px', fontSize: '0.8rem' }}
              onClick={() => {
                onClose();
                onOpenLogin();
              }}
            >
              Entrar
            </button>
          </div>
        ) : null}

        <div className="form-stack" style={{ gap: 14 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.84rem', marginBottom: 8, color: 'var(--avail)' }}>
              Disponibles ({availableEntries.length})
            </div>
            {availableEntries.length === 0 ? (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Nadie todavía.</div>
            ) : (
              <div className="day-entry-list">
                {availableEntries.map((entry) => {
                  const u = usersById[entry.user_id];
                  if (!u) return null;
                  return (
                    <div key={entry.user_id} className="day-entry-row">
                      <UserAvatar user={u} size="sm" status="available" />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{u.display_name}</div>
                        {entry.note && (
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                            {entry.note}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {maybeEntries.length > 0 && (
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.84rem', marginBottom: 8, color: 'var(--maybe)' }}>
                Quizás ({maybeEntries.length})
              </div>
              <div className="day-entry-list">
                {maybeEntries.map((entry) => {
                  const u = usersById[entry.user_id];
                  if (!u) return null;
                  return (
                    <div key={entry.user_id} className="day-entry-row">
                      <UserAvatar user={u} size="sm" status="maybe" />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{u.display_name}</div>
                        {entry.note && (
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                            {entry.note}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
