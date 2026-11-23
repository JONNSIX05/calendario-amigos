import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, KeyRound, LogIn, LogOut, Palette, Shield, UserRound } from 'lucide-react';
import { api } from '../api/client.js';
import { UserAvatar } from './UserAvatar.jsx';

export function AuthDropdown({
  user,
  needsSetup,
  inviteCodeFromUrl,
  inviteUrlError,
  open,
  setOpen,
  onAuthSuccess,
  onInviteVerified,
  onLogout,
  onOpenProfileModal,
  onOpenAdminModal,
}) {
  const containerRef = useRef(null);
  const [tab, setTab] = useState(inviteCodeFromUrl || needsSetup ? 'register' : 'login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState(inviteCodeFromUrl || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (inviteCodeFromUrl) {
      setInviteCode(inviteCodeFromUrl);
      setTab('register');
    } else if (needsSetup) {
      setTab('register');
    }
  }, [inviteCodeFromUrl, needsSetup]);

  useEffect(() => {
    if (inviteUrlError) {
      setTab('register');
      setError(inviteUrlError);
    }
  }, [inviteUrlError]);

  useEffect(() => {
    function handleOutsideClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open, setOpen]);

  async function handleLoginSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.login({ username, password });
      onAuthSuccess(res.user);
      setPassword('');
      setOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyInvite(e) {
    e.preventDefault();
    const trimmed = inviteCode.trim();
    if (!trimmed) {
      setError('Ingresa un código de invitación.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.previewInvite(trimmed);
      if (res?.valid) {
        setOpen(false);
        onInviteVerified(trimmed);
      } else {
        setError('El código de invitación no es válido o ya fue utilizado.');
      }
    } catch (err) {
      setError(err.message || 'El código de invitación no es válido o ya fue utilizado.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="menu-trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label="Menú de cuenta"
      >
        {user ? (
          <>
            <UserAvatar user={user} size="sm" />
            <span>{user.display_name}</span>
          </>
        ) : (
          <>
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: 'var(--accent-soft)',
                color: 'var(--accent-hover)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <UserRound size={15} />
            </span>
            <span>Menú</span>
          </>
        )}
        <ChevronDown size={15} style={{ opacity: 0.7 }} />
      </button>

      {open && (
        <div className="dropdown-panel">
          {user ? (
            <div>
              <div className="profile-card">
                <UserAvatar user={user} size="md" />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.94rem' }}>{user.display_name}</div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                    @{user.username}
                  </div>
                  <div className="role-badges">
                    {user.is_admin && <span className="badge">Admin</span>}
                    {user.can_dnd && <span className="badge avail">🎲 DnD</span>}
                    {user.can_plans && <span className="badge maybe">✨ Otros planes</span>}
                  </div>
                </div>
              </div>

              <div className="profile-actions">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setOpen(false);
                    onOpenProfileModal();
                  }}
                >
                  <Palette size={15} />
                  <span>Personalizar ícono y color</span>
                </button>

                {user.is_admin && (
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      setOpen(false);
                      onOpenAdminModal();
                    }}
                  >
                    <Shield size={15} />
                    <span>Invitaciones y roles</span>
                  </button>
                )}

                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => {
                    setOpen(false);
                    onLogout();
                  }}
                >
                  <LogOut size={15} />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="auth-tabs">
                <button
                  type="button"
                  className={`auth-tab-btn ${tab === 'login' ? 'active' : ''}`}
                  onClick={() => {
                    setTab('login');
                    setError('');
                  }}
                >
                  Iniciar sesión
                </button>
                <button
                  type="button"
                  className={`auth-tab-btn ${tab === 'register' ? 'active' : ''}`}
                  onClick={() => {
                    setTab('register');
                    setError('');
                  }}
                >
                  Registrarse
                </button>
              </div>

              {tab === 'register' && needsSetup && (
                <div className="alert-box info" style={{ marginBottom: 10 }}>
                  <strong>Configuración inicial:</strong> ingresa el código <code>ADMIN_SETUP_CODE</code> de tu{' '}
                  <code>.env</code> para crear la cuenta Administrador.
                </div>
              )}

              {error && (
                <div className="alert-box error" style={{ marginBottom: 10 }}>
                  {error}
                </div>
              )}

              {tab === 'login' ? (
                <form className="form-stack" onSubmit={handleLoginSubmit}>
                  <label className="field-label">
                    Usuario
                    <input
                      className="text-input"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="ej. alex_dnd"
                      autoComplete="username"
                      required
                    />
                  </label>

                  <label className="field-label">
                    Contraseña
                    <input
                      className="text-input"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Tu contraseña"
                      autoComplete="current-password"
                      required
                    />
                  </label>

                  <button type="submit" className="btn-primary" disabled={loading}>
                    <LogIn size={15} />
                    <span>{loading ? 'Entrando...' : 'Entrar'}</span>
                  </button>
                </form>
              ) : (
                <form className="form-stack" onSubmit={handleVerifyInvite}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    Primero valida tu código de invitación de un solo uso para desbloquear el registro.
                  </div>

                  <label className="field-label">
                    Código de invitación
                    <input
                      className="text-input"
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="Pega tu código aquí"
                      required
                    />
                  </label>

                  <button type="submit" className="btn-primary" disabled={loading}>
                    <KeyRound size={15} />
                    <span>{loading ? 'Validando...' : 'Validar código'}</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
