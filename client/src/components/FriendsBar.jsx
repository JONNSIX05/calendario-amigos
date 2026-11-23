import React, { useState } from 'react';
import { Link2, Zap, X, Repeat, CopyCheck } from 'lucide-react';
import { UserAvatar } from './UserAvatar.jsx';

export function FriendsBar({
  users,
  missingUsers,
  selectedUserIds,
  onToggleUserFilter,
  onClearFilter,
  canEdit,
  quickPaint,
  onToggleQuickPaint,
  canMirror,
  mirrorMode,
  onToggleMirrorMode,
  activeCalendar,
  myMonthEntriesCount,
  onMirrorMonth,
  onCopyMonthLink,
}) {
  const hasFilter = selectedUserIds.length > 0;
  const [mirrorMenuOpen, setMirrorMenuOpen] = useState(false);
  const [mirroring, setMirroring] = useState(false);

  const otherCalendarLabel = activeCalendar === 'dnd' ? '✨ Otros planes' : '🎲 DnD';
  const currentCalendarLabel = activeCalendar === 'dnd' ? '🎲 DnD' : '✨ Otros planes';

  async function handleRunMirrorMonth(overwrite) {
    setMirroring(true);
    try {
      await onMirrorMonth(overwrite);
      setMirrorMenuOpen(false);
    } finally {
      setMirroring(false);
    }
  }

  return (
    <section className="toolbar-card" aria-label="Amigos y herramientas">
      <div className="toolbar-top">
        <div className="friends-chips">
          {users.length === 0 ? (
            <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Aún no hay amigos registrados en este calendario.
            </span>
          ) : (
            users.map((u) => {
              const selected = selectedUserIds.includes(u.id);
              const dimmed = hasFilter && !selected;
              return (
                <button
                  key={u.id}
                  type="button"
                  className={`friend-chip ${selected ? 'selected' : ''} ${dimmed ? 'dimmed' : ''}`}
                  onClick={() => onToggleUserFilter(u.id)}
                  title={selected ? 'Quitar filtro' : `Filtrar por ${u.display_name}`}
                >
                  <UserAvatar user={u} size="sm" />
                  <span>{u.display_name}</span>
                </button>
              );
            })
          )}

          {hasFilter && (
            <button type="button" className="icon-btn" onClick={onClearFilter} style={{ height: 32 }}>
              <X size={14} />
              <span>Todos</span>
            </button>
          )}
        </div>

        <div className="toolbar-actions">
          {canEdit && (
            <button
              type="button"
              className={`icon-btn ${quickPaint ? 'active-pill' : ''}`}
              onClick={onToggleQuickPaint}
              title="Clic en un día para ciclar: Disponible → Quizás → Quitar"
            >
              <Zap size={15} />
              <span>{quickPaint ? 'Marcado rápido: ON' : 'Marcado rápido'}</span>
            </button>
          )}

          {canMirror && (
            <>
              <button
                type="button"
                className={`icon-btn ${mirrorMode ? 'active-pill' : ''}`}
                onClick={onToggleMirrorMode}
                title={`Al marcar o borrar un día, aplicarlo también en ${otherCalendarLabel}`}
              >
                <Repeat size={15} />
                <span>{mirrorMode ? 'Espejear al marcar: ON' : 'Espejear al marcar'}</span>
              </button>

              <div className="mirror-dropdown-wrap">
                <button
                  type="button"
                  className={`icon-btn ${mirrorMenuOpen ? 'active-pill' : ''}`}
                  onClick={() => setMirrorMenuOpen((prev) => !prev)}
                  title={`Copiar tus días ya marcados de este mes hacia ${otherCalendarLabel}`}
                >
                  <CopyCheck size={15} />
                  <span>Espejear mes a {otherCalendarLabel}</span>
                </button>

                {mirrorMenuOpen && (
                  <div className="mirror-popover">
                    <div style={{ fontWeight: 700, fontSize: '0.84rem', marginBottom: 4 }}>
                      Espejear tu mes a {otherCalendarLabel}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.4 }}>
                      Tienes <strong>{myMonthEntriesCount}</strong>{' '}
                      {myMonthEntriesCount === 1 ? 'día marcado' : 'días marcados'} este mes en {currentCalendarLabel}.
                    </div>

                    <div className="form-stack" style={{ gap: 6 }}>
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={mirroring || myMonthEntriesCount === 0}
                        onClick={() => handleRunMirrorMonth(false)}
                        style={{ fontSize: '0.8rem', padding: '8px 10px' }}
                      >
                        <CopyCheck size={14} />
                        <span>Copiar mis días marcados ({myMonthEntriesCount})</span>
                      </button>

                      <button
                        type="button"
                        className="btn-ghost"
                        disabled={mirroring}
                        onClick={() => handleRunMirrorMonth(true)}
                        style={{ fontSize: '0.78rem', padding: '7px 10px' }}
                        title="Deja el otro calendario con exactamente los mismos días que tienes marcados en este mes"
                      >
                        <Repeat size={14} />
                        <span>Sincronizar mes exacto (reemplazar)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <button type="button" className="icon-btn" onClick={onCopyMonthLink} title="Copiar enlace de este mes">
            <Link2 size={15} />
            <span>Copiar link</span>
          </button>
        </div>
      </div>

      {missingUsers.length > 0 && (
        <div className="missing-strip">
          <span>Faltan por marcar este mes:</span>
          {missingUsers.map((u) => (
            <span
              key={u.id}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 600 }}
            >
              <UserAvatar user={u} size="sm" />
              <span>{u.display_name}</span>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
