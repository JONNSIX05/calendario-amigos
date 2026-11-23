import React, { useEffect, useState } from 'react';
import { Copy, Plus, Trash2, X } from 'lucide-react';
import { api } from '../api/client.js';
import { UserAvatar } from './UserAvatar.jsx';

export function AdminPanelModal({ onClose, onShowToast, onRolesChanged }) {
  const [tab, setTab] = useState('invites');
  const [invites, setInvites] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // New invite form (all invites are strictly single-use)
  const [label, setLabel] = useState('');
  const [canDnd, setCanDnd] = useState(true);
  const [canPlans, setCanPlans] = useState(false);
  const [creating, setCreating] = useState(false);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [invRes, usrRes] = await Promise.all([api.getInvites(), api.getAdminUsers()]);
      setInvites(invRes.invites || []);
      setUsers(usrRes.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function buildInviteUrl(code) {
    return `${window.location.origin}/?invite=${encodeURIComponent(code)}`;
  }

  async function copyInvite(code) {
    const url = buildInviteUrl(code);
    try {
      await navigator.clipboard.writeText(url);
      onShowToast('Enlace de invitación copiado');
    } catch {
      onShowToast(`Código: ${code}`);
    }
  }

  async function handleCreateInvite(e) {
    e.preventDefault();
    setError('');
    if (!canDnd && !canPlans) {
      setError('Selecciona al menos un calendario (DnD u Otros planes).');
      return;
    }
    setCreating(true);
    try {
      const res = await api.createInvite({
        label,
        can_dnd: canDnd,
        can_plans: canPlans,
      });
      setInvites((prev) => [res.invite, ...prev]);
      setLabel('');
      await copyInvite(res.invite.code);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteInvite(id) {
    try {
      await api.deleteInvite(id);
      setInvites((prev) => prev.filter((i) => i.id !== id));
      onShowToast('Invitación eliminada');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleToggleRole(targetUser, field) {
    setError('');
    const nextDnd = field === 'can_dnd' ? !targetUser.can_dnd : targetUser.can_dnd;
    const nextPlans = field === 'can_plans' ? !targetUser.can_plans : targetUser.can_plans;

    if (!nextDnd && !nextPlans) {
      setError('Cada amigo debe tener acceso al menos a un calendario.');
      return;
    }

    try {
      const res = await api.updateUserRoles(targetUser.id, {
        can_dnd: nextDnd,
        can_plans: nextPlans,
      });
      setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? res.user : u)));
      onRolesChanged();
      onShowToast(`Permisos actualizados para ${targetUser.display_name}`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card wide">
        <div className="modal-header">
          <h2 className="modal-title">Invitaciones y roles</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>

        <div className="auth-tabs" style={{ marginBottom: 16 }}>
          <button
            type="button"
            className={`auth-tab-btn ${tab === 'invites' ? 'active' : ''}`}
            onClick={() => setTab('invites')}
          >
            Enlaces de invitación
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${tab === 'users' ? 'active' : ''}`}
            onClick={() => setTab('users')}
          >
            Roles de amigos ({users.length})
          </button>
        </div>

        {error && (
          <div className="alert-box error" style={{ marginBottom: 12 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)' }}>
            Cargando...
          </div>
        ) : tab === 'invites' ? (
          <div className="form-stack" style={{ gap: 16 }}>
            <form
              onSubmit={handleCreateInvite}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 14,
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Crear nuevo enlace de invitación</div>

              <label className="field-label">
                Etiqueta opcional (para recordar a quién se lo mandaste)
                <input
                  className="text-input"
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="ej. Invitación mesa DnD o Para Sofía"
                  maxLength={60}
                />
              </label>

              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.86rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={canDnd}
                    onChange={(e) => setCanDnd(e.target.checked)}
                  />
                  <span>🎲 Acceso a DnD</span>
                </label>

                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.86rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={canPlans}
                    onChange={(e) => setCanPlans(e.target.checked)}
                  />
                  <span>✨ Acceso a Otros planes</span>
                </label>

                <span className="badge">Un solo uso</span>
              </div>

              <button type="submit" className="btn-primary" disabled={creating}>
                <Plus size={15} />
                <span>{creating ? 'Generando...' : 'Generar y copiar enlace'}</span>
              </button>
            </form>

            <div className="form-stack" style={{ gap: 8 }}>
              {invites.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: 12 }}>
                  Aún no has creado enlaces de invitación.
                </div>
              ) : (
                invites.map((inv) => {
                  const exhausted = inv.uses_count >= 1 || !inv.active;
                  return (
                    <div key={inv.id} className="invite-row" style={{ opacity: exhausted ? 0.55 : 1 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                          <code>{inv.code}</code>
                          {inv.label ? ` · ${inv.label}` : ''}
                        </div>
                        <div className="role-badges">
                          {inv.can_dnd && <span className="badge avail">🎲 DnD</span>}
                          {inv.can_plans && <span className="badge maybe">✨ Otros planes</span>}
                          <span className={`badge ${exhausted ? '' : 'avail'}`}>
                            {exhausted ? 'Usado' : 'Disponible (1 uso)'}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => copyInvite(inv.code)}
                          title="Copiar enlace"
                        >
                          <Copy size={14} />
                          <span>Copiar</span>
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => handleDeleteInvite(inv.id)}
                          title="Revocar invitación"
                          style={{ color: 'var(--danger)' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div className="form-stack" style={{ gap: 8 }}>
            {users.map((u) => (
              <div key={u.id} className="invite-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <UserAvatar user={u} size="sm" />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                      {u.display_name}{' '}
                      {u.is_admin && <span className="badge">Admin</span>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      @{u.username}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className={`icon-btn ${u.can_dnd ? 'active-pill' : ''}`}
                    onClick={() => handleToggleRole(u, 'can_dnd')}
                  >
                    🎲 DnD: {u.can_dnd ? 'Sí' : 'No'}
                  </button>
                  <button
                    type="button"
                    className={`icon-btn ${u.can_plans ? 'active-pill' : ''}`}
                    onClick={() => handleToggleRole(u, 'can_plans')}
                  >
                    ✨ Planes: {u.can_plans ? 'Sí' : 'No'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
