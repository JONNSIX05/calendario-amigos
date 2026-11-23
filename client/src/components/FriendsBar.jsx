import React from 'react';
import { Link2, Zap, X } from 'lucide-react';
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
  onCopyMonthLink,
}) {
  const hasFilter = selectedUserIds.length > 0;

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
