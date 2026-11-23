import React, { useState } from 'react';
import { Check, Upload, X } from 'lucide-react';
import { api } from '../api/client.js';
import { BG_COLOR_PALETTE, PRESET_ICONS } from '../data/presetIcons.jsx';
import { UserAvatar } from './UserAvatar.jsx';

export function RegisterModal({ inviteCode, onClose, onRegistered }) {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [bgColor, setBgColor] = useState('#6366f1');
  const [iconType, setIconType] = useState('preset');
  const [iconValue, setIconValue] = useState('d20');
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleFileChange(e) {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;

    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.svg') && !lower.endsWith('.png')) {
      setError('Solo se permiten archivos en formato .svg o .png.');
      return;
    }
    if (file.size > 512 * 1024) {
      setError('El archivo no debe superar los 512 KB.');
      return;
    }

    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    const preview = URL.createObjectURL(file);
    setPendingFile(file);
    setPendingPreviewUrl(preview);
    setIconType('upload');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const regRes = await api.register({
        username: username.trim(),
        displayName: displayName.trim() || username.trim(),
        password,
        inviteCode,
        iconValue: iconType === 'preset' ? iconValue : 'd20',
        iconBgColor: bgColor,
      });

      let finalUser = regRes.user;
      if (pendingFile) {
        try {
          const uploadRes = await api.uploadIcon(pendingFile);
          finalUser = uploadRes.user;
        } catch {
          // Account is already created; user can retry upload from profile if needed
        }
      }

      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
      onRegistered(finalUser);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const previewUser = {
    display_name: displayName || username || 'Nuevo amigo',
    icon_bg_color: bgColor,
    icon_type: pendingPreviewUrl ? 'upload' : iconType,
    icon_value: pendingPreviewUrl || iconValue,
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card wide">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Completa tu registro</h2>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
              Código verificado · Personaliza tu cuenta, ícono y color
            </div>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>

        <form className="form-stack" onSubmit={handleSubmit} style={{ gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <UserAvatar user={previewUser} size="lg" status="available" />
            <div style={{ flex: 1, minWidth: 200, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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
                Nombre visible
                <input
                  className="text-input"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="ej. Alex"
                  maxLength={30}
                />
              </label>
            </div>
          </div>

          <label className="field-label">
            Contraseña
            <input
              className="text-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </label>

          <div>
            <div className="field-label" style={{ marginBottom: 8 }}>
              Color de fondo de tu ícono
            </div>
            <div className="color-swatches">
              {BG_COLOR_PALETTE.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  className={`color-swatch ${bgColor.toLowerCase() === c.hex.toLowerCase() ? 'selected' : ''}`}
                  style={{ backgroundColor: c.hex }}
                  onClick={() => setBgColor(c.hex)}
                  title={c.name}
                  aria-label={c.name}
                />
              ))}
              <label className="color-input-pill" title="Elegir cualquier color">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                />
                <span>Libre</span>
              </label>
            </div>
          </div>

          <div>
            <div className="field-label" style={{ marginBottom: 8 }}>
              Subir tu propio ícono (.svg o .png, máx. 512 KB)
            </div>
            <label className="btn-ghost" style={{ width: '100%', cursor: 'pointer' }}>
              <Upload size={15} />
              <span>{pendingFile ? `Seleccionado: ${pendingFile.name}` : 'Elegir archivo .svg o .png'}</span>
              <input
                type="file"
                accept=".svg,.png,image/svg+xml,image/png"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          <div>
            <div className="field-label" style={{ marginBottom: 8 }}>
              O elige un ícono predeterminado
            </div>
            <div className="icon-grid">
              {PRESET_ICONS.map((preset) => {
                const isSelected = !pendingFile && iconType === 'preset' && iconValue === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    className={`icon-option ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      setPendingFile(null);
                      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
                      setPendingPreviewUrl(null);
                      setIconType('preset');
                      setIconValue(preset.id);
                    }}
                  >
                    <UserAvatar
                      user={{ icon_type: 'preset', icon_value: preset.id, icon_bg_color: bgColor }}
                      size="sm"
                    />
                    <span>{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {error && <div className="alert-box error">{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              <Check size={15} />
              <span>{submitting ? 'Creando cuenta...' : 'Crear mi cuenta'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
