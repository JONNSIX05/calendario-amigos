import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api/client.js';
import { getCurrentMonthStr, shiftMonth } from './utils/dates.js';
import { Header } from './components/Header.jsx';
import { FriendsBar } from './components/FriendsBar.jsx';
import { CalendarGrid } from './components/CalendarGrid.jsx';
import { BestDaysList } from './components/BestDaysList.jsx';
import { DayDetailPanel } from './components/DayDetailPanel.jsx';
import { IconPickerModal } from './components/IconPickerModal.jsx';
import { AdminPanelModal } from './components/AdminPanelModal.jsx';
import { RegisterModal } from './components/RegisterModal.jsx';

function readInitialQuery() {
  const params = new URLSearchParams(window.location.search);
  const invite = params.get('invite') || '';
  const monthParam = params.get('month') || '';
  const month = /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : getCurrentMonthStr();
  return { invite, month };
}

export default function App() {
  const initial = useMemo(() => readInitialQuery(), []);

  const [theme, setTheme] = useState(() => localStorage.getItem('cal_theme') || 'dark');
  const [user, setUser] = useState(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [activeCalendar, setActiveCalendar] = useState('dnd');
  const [month, setMonth] = useState(initial.month);

  const [users, setUsers] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loadingCal, setLoadingCal] = useState(true);

  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [quickPaint, setQuickPaint] = useState(false);
  const [mirrorMode, setMirrorMode] = useState(false);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [verifiedInviteCode, setVerifiedInviteCode] = useState('');
  const [inviteUrlError, setInviteUrlError] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = useCallback((msg) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cal_theme', theme);
  }, [theme]);

  // Initial session & setup status
  useEffect(() => {
    let active = true;
    async function boot() {
      try {
        const [meRes, statusRes] = await Promise.all([api.getMe(), api.getAuthStatus()]);
        if (!active) return;
        const loggedUser = meRes.user || null;
        setUser(loggedUser);
        setNeedsSetup(Boolean(statusRes.needsSetup));

        if (loggedUser) {
          // Default to DnD if allowed; otherwise switch to Plans
          if (loggedUser.is_admin || loggedUser.can_dnd) {
            setActiveCalendar('dnd');
          } else if (loggedUser.can_plans) {
            setActiveCalendar('plans');
          }
        } else if (initial.invite) {
          // Auto-validate invite link from URL
          try {
            const invRes = await api.previewInvite(initial.invite);
            if (!active) return;
            if (invRes?.valid) {
              setVerifiedInviteCode(initial.invite);
            } else {
              setInviteUrlError('El código de invitación no es válido o ya fue utilizado.');
              setDropdownOpen(true);
            }
          } catch (err) {
            if (!active) return;
            setInviteUrlError(err.message || 'El código de invitación no es válido o ya fue utilizado.');
            setDropdownOpen(true);
          }
        } else if (statusRes.needsSetup) {
          setDropdownOpen(true);
        }
      } catch {
        // Ignore initial boot error
      }
    }
    boot();
    return () => {
      active = false;
    };
  }, []);

  const fetchCalendar = useCallback(async () => {
    setLoadingCal(true);
    try {
      const data = await api.getAvailability(month, activeCalendar);
      setUsers(data.users || []);
      setEntries(data.entries || []);
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        setActiveCalendar('dnd');
      } else {
        showToast(err.message);
      }
    } finally {
      setLoadingCal(false);
    }
  }, [month, activeCalendar, showToast]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  // Reset user filter when switching calendar tab
  useEffect(() => {
    setSelectedUserIds([]);
  }, [activeCalendar]);

  const canEditActiveCalendar = useMemo(() => {
    if (!user) return false;
    if (user.is_admin) return true;
    return activeCalendar === 'dnd' ? user.can_dnd : user.can_plans;
  }, [user, activeCalendar]);

  const canMirrorCalendars = useMemo(() => {
    if (!user) return false;
    if (user.is_admin) return true;
    return Boolean(user.can_dnd && user.can_plans);
  }, [user]);

  const myMonthEntriesCount = useMemo(() => {
    if (!user) return 0;
    return entries.filter((e) => e.user_id === user.id).length;
  }, [entries, user]);

  const usersById = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u])),
    [users]
  );

  const filteredEntries = useMemo(() => {
    if (selectedUserIds.length === 0) return entries;
    const allowed = new Set(selectedUserIds);
    return entries.filter((e) => allowed.has(e.user_id));
  }, [entries, selectedUserIds]);

  const entriesByDate = useMemo(() => {
    const map = {};
    for (const entry of filteredEntries) {
      if (!map[entry.date]) map[entry.date] = [];
      map[entry.date].push(entry);
    }
    return map;
  }, [filteredEntries]);

  const missingUsers = useMemo(() => {
    const respondedIds = new Set(entries.map((e) => e.user_id));
    return users.filter((u) => !respondedIds.has(u.id));
  }, [users, entries]);

  const activeUsersCount = selectedUserIds.length > 0 ? selectedUserIds.length : users.length;

  function handleAuthSuccess(loggedUser) {
    setUser(loggedUser);
    setNeedsSetup(false);
    if (loggedUser.is_admin || loggedUser.can_dnd) {
      setActiveCalendar('dnd');
    } else if (loggedUser.can_plans) {
      setActiveCalendar('plans');
    }
    // Remove ?invite=... from URL cleanly after registration
    if (window.location.search.includes('invite=')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('invite');
      window.history.replaceState({}, '', url.toString());
    }
    showToast(`¡Bienvenido, ${loggedUser.display_name}!`);
    fetchCalendar();
  }

  async function handleLogout() {
    await api.logout();
    setUser(null);
    setQuickPaint(false);
    setMirrorMode(false);
    setActiveCalendar('dnd');
    showToast('Sesión cerrada');
  }

  async function handleSaveAvailability(date, status, note, mirror = mirrorMode) {
    const shouldMirror = Boolean(canMirrorCalendars && mirror);
    const res = await api.setAvailability(date, {
      calendar: activeCalendar,
      status,
      note,
      mirror: shouldMirror,
    });
    setEntries((prev) => {
      const without = prev.filter((e) => !(e.user_id === user.id && e.date === date));
      return [...without, res.entry];
    });
    const statusText = status === 'available' ? 'Disponible' : 'Quizás';
    showToast(
      shouldMirror
        ? `Marcado como ${statusText} (en ambos calendarios)`
        : `Marcado como ${statusText}`
    );
  }

  async function handleDeleteAvailability(date, mirror = mirrorMode) {
    const shouldMirror = Boolean(canMirrorCalendars && mirror);
    await api.deleteAvailability(date, activeCalendar, shouldMirror);
    setEntries((prev) => prev.filter((e) => !(e.user_id === user.id && e.date === date)));
    showToast(
      shouldMirror ? 'Disponibilidad eliminada de ambos calendarios' : 'Disponibilidad eliminada'
    );
  }

  async function handleMirrorSingleDay(date) {
    if (!canMirrorCalendars) return;
    const targetCal = activeCalendar === 'dnd' ? 'plans' : 'dnd';
    const targetLabel = targetCal === 'dnd' ? '🎲 DnD' : '✨ Otros planes';
    try {
      await api.mirrorAvailability({
        fromCalendar: activeCalendar,
        toCalendar: targetCal,
        dates: [date],
        overwrite: true,
      });
      showToast(`Día espejeado a ${targetLabel}`);
    } catch (err) {
      showToast(err.message);
    }
  }

  async function handleMirrorMonth(overwrite = false) {
    if (!canMirrorCalendars) return;
    const targetCal = activeCalendar === 'dnd' ? 'plans' : 'dnd';
    const targetLabel = targetCal === 'dnd' ? '🎲 DnD' : '✨ Otros planes';
    try {
      const res = await api.mirrorAvailability({
        fromCalendar: activeCalendar,
        toCalendar: targetCal,
        month,
        overwrite,
      });
      showToast(
        overwrite
          ? `Mes sincronizado en ${targetLabel} (${res.mirroredCount} días)`
          : `${res.mirroredCount} ${res.mirroredCount === 1 ? 'día espejeado' : 'días espejeados'} a ${targetLabel}`
      );
    } catch (err) {
      showToast(err.message);
    }
  }

  async function handleDayClick(date) {
    if (quickPaint && canEditActiveCalendar && user) {
      const current = entries.find((e) => e.user_id === user.id && e.date === date);
      try {
        if (!current) {
          await handleSaveAvailability(date, 'available', '', mirrorMode);
        } else if (current.status === 'available') {
          await handleSaveAvailability(date, 'maybe', current.note || '', mirrorMode);
        } else {
          await handleDeleteAvailability(date, mirrorMode);
        }
      } catch (err) {
        showToast(err.message);
      }
      return;
    }
    setSelectedDate(date);
  }

  function handleToggleUserFilter(userId) {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  async function handleCopyMonthLink() {
    const url = `${window.location.origin}/?month=${month}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Enlace del mes copiado');
    } catch {
      showToast(url);
    }
  }

  return (
    <div className="app-shell">
      <Header
        activeCalendar={activeCalendar}
        onSelectCalendar={setActiveCalendar}
        month={month}
        onPrevMonth={() => setMonth((m) => shiftMonth(m, -1))}
        onNextMonth={() => setMonth((m) => shiftMonth(m, 1))}
        onToday={() => setMonth(getCurrentMonthStr())}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        user={user}
        needsSetup={needsSetup}
        inviteCodeFromUrl={initial.invite}
        inviteUrlError={inviteUrlError}
        dropdownOpen={dropdownOpen}
        setDropdownOpen={setDropdownOpen}
        onAuthSuccess={handleAuthSuccess}
        onInviteVerified={(code) => {
          setInviteUrlError('');
          setVerifiedInviteCode(code);
        }}
        onLogout={handleLogout}
        onOpenProfileModal={() => setProfileModalOpen(true)}
        onOpenAdminModal={() => setAdminModalOpen(true)}
      />

      <FriendsBar
        users={users}
        missingUsers={missingUsers}
        selectedUserIds={selectedUserIds}
        onToggleUserFilter={handleToggleUserFilter}
        onClearFilter={() => setSelectedUserIds([])}
        canEdit={canEditActiveCalendar}
        quickPaint={quickPaint}
        onToggleQuickPaint={() => setQuickPaint((q) => !q)}
        canMirror={canMirrorCalendars}
        mirrorMode={mirrorMode}
        onToggleMirrorMode={() => setMirrorMode((m) => !m)}
        activeCalendar={activeCalendar}
        myMonthEntriesCount={myMonthEntriesCount}
        onMirrorMonth={handleMirrorMonth}
        onCopyMonthLink={handleCopyMonthLink}
      />

      {loadingCal && users.length === 0 ? (
        <div className="calendar-card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
          Cargando calendario...
        </div>
      ) : (
        <>
          <CalendarGrid
            month={month}
            entriesByDate={entriesByDate}
            usersById={usersById}
            activeUsersCount={activeUsersCount}
            quickPaint={quickPaint}
            onDayClick={handleDayClick}
          />

          <BestDaysList
            entriesByDate={entriesByDate}
            usersById={usersById}
            activeUsersCount={activeUsersCount}
            activeCalendar={activeCalendar}
            onSelectDate={setSelectedDate}
          />
        </>
      )}

      {selectedDate && (
        <DayDetailPanel
          date={selectedDate}
          entries={entries.filter((e) => e.date === selectedDate)}
          usersById={usersById}
          currentUser={user}
          canEdit={canEditActiveCalendar}
          canMirror={canMirrorCalendars}
          defaultMirror={mirrorMode}
          activeCalendar={activeCalendar}
          onSave={handleSaveAvailability}
          onDelete={handleDeleteAvailability}
          onMirrorSingleDay={handleMirrorSingleDay}
          onOpenLogin={() => setDropdownOpen(true)}
          onClose={() => setSelectedDate(null)}
        />
      )}

      {verifiedInviteCode && !user && (
        <RegisterModal
          inviteCode={verifiedInviteCode}
          onClose={() => setVerifiedInviteCode('')}
          onRegistered={handleAuthSuccess}
        />
      )}

      {profileModalOpen && user && (
        <IconPickerModal
          user={user}
          onClose={() => setProfileModalOpen(false)}
          onUserUpdated={(updatedUser) => {
            setUser(updatedUser);
            setUsers((prev) =>
              prev.map((u) =>
                u.id === updatedUser.id
                  ? {
                      ...u,
                      display_name: updatedUser.display_name,
                      icon_type: updatedUser.icon_type,
                      icon_value: updatedUser.icon_value,
                      icon_bg_color: updatedUser.icon_bg_color,
                    }
                  : u
              )
            );
            showToast('Perfil actualizado');
          }}
        />
      )}

      {adminModalOpen && user?.is_admin && (
        <AdminPanelModal
          onClose={() => setAdminModalOpen(false)}
          onShowToast={showToast}
          onRolesChanged={fetchCalendar}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
