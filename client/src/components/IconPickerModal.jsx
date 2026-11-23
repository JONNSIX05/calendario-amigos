import React, { useState } from 'react';
import { Upload, X, Check } from 'lucide-react';
import { api } from '../api/client.js';
import { BG_COLOR_PALETTE, PRESET_ICONS } from '../data/presetIcons.jsx';
import { UserAvatar } from './UserAvatar.jsx';

export function IconPickerModal({ user, onClose, onUserUpdated }) {
  const [displayName, setDisplayName] = useState(user.display_name || '');
  const [bgColor, setBgColor] = useState(user.icon_bg_color || '#6366f1');
  const [iconType, setIconType] = useState(user.icon_type || 'preset');
  const [iconValue, setIconValue] = useState(user.icon_value || 'd20');
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      let latestUser = user;

      const profilePayload = {
        displayName: displayName.trim(),
        iconBgColor: bgColor,
      };
      if (iconType === 'preset') {
        profilePayload.iconType = 'preset';
        profilePayload.iconValue = iconValue;
      }

      const patchRes = await api.updateProfile(profilePayload);
      latestUser = patchRes.user;

      if (pendingFile) {
        const uploadRes = await api.uploadIcon(pendingFile);
        latestUser = uploadRes.user;
      }

      onUserUpdated(latestUser);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const previewUser = {
    display_name: displayName || user.display_name,
    icon_bg_color: bgColor,
    icon_type: pendingPreviewUrl ? 'upload' : iconType,
    icon_value: pendingPreviewUrl || iconValue,
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-header">
          <h2 className="modal-title">Tu perfil, ícono y color</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>

        <form className="form-stack" onSubmit={handleSave} style={{ gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <UserAvatar user={previewUser} size="lg" status="available" />
            <div style={{ flex: 1 }}>
              <label className="field-label">
                Nombre visible
                <input
                  className="text-input"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={30}
                  required
                />
              </label>
            </div>
          </div>

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

          <div className="modal-footer-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              <Check size={15} />
              <span>{saving ? 'Guardando...' : 'Guardar cambios'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
