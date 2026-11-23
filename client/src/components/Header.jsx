import React from 'react';
import { ChevronLeft, ChevronRight, Moon, Sun, CalendarDays } from 'lucide-react';
import { formatMonthTitle } from '../utils/dates.js';
import { AuthDropdown } from './AuthDropdown.jsx';

export function Header({
  activeCalendar,
  onSelectCalendar,
  month,
  onPrevMonth,
  onNextMonth,
  onToday,
  theme,
  onToggleTheme,
  user,
  needsSetup,
  inviteCodeFromUrl,
  inviteUrlError,
  dropdownOpen,
  setDropdownOpen,
  onAuthSuccess,
  onInviteVerified,
  onLogout,
  onOpenProfileModal,
  onOpenAdminModal,
}) {
  const showDndTab = !user || user.is_admin || user.can_dnd;
  const showPlansTab = Boolean(user && (user.is_admin || user.can_plans));

  return (
    <header className="top-header">
      <div className="header-left">
        <div className="brand-title">
          <span className="brand-dot" aria-hidden="true">
            <CalendarDays size={17} />
          </span>
          <span>Calendario</span>
        </div>

        <nav className="calendar-tabs" aria-label="Calendarios">
          {showDndTab && (
            <button
              type="button"
              className={`cal-tab ${activeCalendar === 'dnd' ? 'active' : ''}`}
              onClick={() => onSelectCalendar('dnd')}
            >
              <span>🎲</span>
              <span>DnD</span>
            </button>
          )}
          {showPlansTab && (
            <button
              type="button"
              className={`cal-tab ${activeCalendar === 'plans' ? 'active' : ''}`}
              onClick={() => onSelectCalendar('plans')}
            >
              <span>✨</span>
              <span>Otros planes</span>
            </button>
          )}
        </nav>
      </div>

      <div className="header-center">
        <button
          type="button"
          className="icon-btn"
          onClick={onPrevMonth}
          aria-label="Mes anterior"
          title="Mes anterior"
        >
          <ChevronLeft size={17} />
        </button>

        <span className="month-label">{formatMonthTitle(month)}</span>

        <button
          type="button"
          className="icon-btn"
          onClick={onNextMonth}
          aria-label="Mes siguiente"
          title="Mes siguiente"
        >
          <ChevronRight size={17} />
        </button>

        <button type="button" className="icon-btn" onClick={onToday}>
          Hoy
        </button>
      </div>

      <div className="header-right">
        <button
          type="button"
          className="icon-btn"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <AuthDropdown
          user={user}
          needsSetup={needsSetup}
          inviteCodeFromUrl={inviteCodeFromUrl}
          inviteUrlError={inviteUrlError}
          open={dropdownOpen}
          setOpen={setDropdownOpen}
          onAuthSuccess={onAuthSuccess}
          onInviteVerified={onInviteVerified}
          onLogout={onLogout}
          onOpenProfileModal={onOpenProfileModal}
          onOpenAdminModal={onOpenAdminModal}
        />
      </div>
    </header>
  );
}
