import React from 'react';
import { WEEKDAY_SHORT_ES, buildMonthGrid, getTodayStr } from '../utils/dates.js';
import { UserAvatar } from './UserAvatar.jsx';

export function CalendarGrid({
  month,
  entriesByDate,
  usersById,
  activeUsersCount,
  quickPaint,
  onDayClick,
}) {
  const cells = buildMonthGrid(month);
  const today = getTodayStr();

  return (
    <section className="calendar-card" aria-label="Calendario mensual">
      <div className="weekdays-row">
        {WEEKDAY_SHORT_ES.map((dayName) => (
          <div key={dayName} className="weekday-cell">
            {dayName}
          </div>
        ))}
      </div>

      <div className="days-grid">
        {cells.map((cell) => {
          if (cell.type === 'empty') {
            return <div key={cell.key} className="day-cell empty" aria-hidden="true" />;
          }

          const items = entriesByDate[cell.date] || [];
          const availableCount = items.filter((e) => e.status === 'available').length;
          const allMatch = activeUsersCount >= 2 && availableCount === activeUsersCount;
          const isToday = cell.date === today;

          // Subtle heatmap intensity based on proportion of active users available
          let heatStyle = undefined;
          if (!allMatch && activeUsersCount > 0 && availableCount > 0) {
            const ratio = Math.min(1, availableCount / activeUsersCount);
            const alpha = (0.06 + ratio * 0.14).toFixed(3);
            heatStyle = {
              backgroundColor: `rgba(16, 185, 129, ${alpha})`,
            };
          }

          const maxVisible = 6;
          const visibleItems = items.slice(0, maxVisible);
          const overflowCount = items.length - visibleItems.length;

          return (
            <button
              key={cell.key}
              type="button"
              className={`day-cell ${isToday ? 'is-today' : ''} ${allMatch ? 'is-all-match' : ''}`}
              style={heatStyle}
              onClick={() => onDayClick(cell.date)}
              aria-label={`Día ${cell.day}, ${availableCount} disponibles`}
            >
              <div className="day-cell-header">
                <span className="day-num">{cell.day}</span>
                {allMatch && <span className="all-star-pill">¡Todos!</span>}
              </div>

              <div className="day-avatars">
                {visibleItems.map((entry) => {
                  const u = usersById[entry.user_id];
                  if (!u) return null;
                  return (
                    <span key={entry.user_id} className="avatar-tooltip-wrap">
                      <UserAvatar
                        user={u}
                        size="sm"
                        status={entry.status}
                        hasNote={Boolean(entry.note)}
                      />
                      <span className="avatar-tooltip" role="tooltip">
                        <strong>{u.display_name}</strong> ·{' '}
                        {entry.status === 'available' ? 'Disponible' : 'Quizás'}
                        {entry.note ? ` — "${entry.note}"` : ''}
                      </span>
                    </span>
                  );
                })}
                {overflowCount > 0 && <span className="more-pill">+{overflowCount}</span>}
              </div>
            </button>
          );
        })}
      </div>

      <div className="calendar-legend">
        <div className="legend-items">
          <span>
            <span className="legend-dot" style={{ background: 'var(--avail)' }} />
            Disponible
          </span>
          <span>
            <span className="legend-dot" style={{ background: 'var(--maybe)' }} />
            Quizás (?)
          </span>
          <span>
            <span className="legend-dot" style={{ background: 'var(--accent)' }} />
            Tiene nota
          </span>
        </div>

        <span>
          {quickPaint
            ? 'Modo rápido activo: haz clic en un día para marcar Disponible → Quizás → Quitar.'
            : 'Haz clic en cualquier día para ver notas o registrar tu disponibilidad.'}
        </span>
      </div>
    </section>
  );
}
