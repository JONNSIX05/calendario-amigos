import React from 'react';
import { Sparkles, MessageSquare } from 'lucide-react';
import { formatFullDateEs, rankBestDays } from '../utils/dates.js';
import { UserAvatar } from './UserAvatar.jsx';

export function BestDaysList({
  entriesByDate,
  usersById,
  activeUsersCount,
  activeCalendar,
  onSelectDate,
}) {
  const rankedDays = rankBestDays(entriesByDate, activeUsersCount);
  const calendarLabel = activeCalendar === 'dnd' ? 'DnD' : 'Otros planes';

  return (
    <section className="best-days-section" aria-label="Mejores días del mes">
      <div className="section-header">
        <h2 className="section-title">
          <Sparkles size={18} style={{ color: 'var(--avail)' }} />
          <span>Mejores días para {calendarLabel}</span>
        </h2>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Primero aparecen los días donde todos pueden
        </span>
      </div>

      {rankedDays.length === 0 ? (
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', padding: '8px 2px' }}>
          Todavía nadie ha marcado disponibilidad este mes en <strong>{calendarLabel}</strong>.
        </div>
      ) : (
        <div className="best-days-list">
          {rankedDays.map((day) => {
            const notesItems = [...day.available, ...day.maybe].filter((e) => e.note);
            return (
              <button
                key={day.date}
                type="button"
                className={`best-day-card ${day.allCanAttend ? 'all-match' : ''}`}
                onClick={() => onSelectDate(day.date)}
              >
                <div className="best-day-top">
                  <span className="best-day-date">{formatFullDateEs(day.date)}</span>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {day.allCanAttend && <span className="badge avail">🎉 Todos pueden</span>}
                    <span className="badge avail">
                      {day.available.length}
                      {activeUsersCount > 0 ? `/${activeUsersCount}` : ''} disp.
                    </span>
                    {day.maybe.length > 0 && (
                      <span className="badge maybe">+{day.maybe.length} quizás</span>
                    )}
                  </div>
                </div>

                <div className="day-avatars">
                  {[...day.available, ...day.maybe].map((entry) => {
                    const u = usersById[entry.user_id];
                    if (!u) return null;
                    return (
                      <UserAvatar
                        key={entry.user_id}
                        user={u}
                        size="sm"
                        status={entry.status}
                        hasNote={Boolean(entry.note)}
                      />
                    );
                  })}
                </div>

                {notesItems.length > 0 && (
                  <div className="best-day-notes">
                    {notesItems.slice(0, 2).map((entry) => {
                      const u = usersById[entry.user_id];
                      return (
                        <div
                          key={entry.user_id}
                          style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                        >
                          <MessageSquare size={12} style={{ flexShrink: 0, opacity: 0.7 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <strong>{u?.display_name}:</strong> {entry.note}
                          </span>
                        </div>
                      );
                    })}
                    {notesItems.length > 2 && (
                      <span style={{ opacity: 0.75 }}>+{notesItems.length - 2} notas más...</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
