import React from 'react';
import { PRESET_ICON_MAP, getContrastColor } from '../data/presetIcons.jsx';

export function UserAvatar({
  user,
  size = 'sm',
  status = null, // 'available' | 'maybe' | null
  hasNote = false,
  className = '',
}) {
  const bg = user?.icon_bg_color || '#6366f1';
  const strokeColor = getContrastColor(bg);
  const preset = PRESET_ICON_MAP[user?.icon_value] || PRESET_ICON_MAP.d20;

  const statusClass =
    status === 'available'
      ? 'status-available'
      : status === 'maybe'
        ? 'status-maybe'
        : '';

  return (
    <span
      className={`user-avatar ${size} ${statusClass} ${className}`.trim()}
      style={{ backgroundColor: bg }}
      aria-label={user?.display_name || 'Usuario'}
    >
      {user?.icon_type === 'upload' && user?.icon_value ? (
        <img src={user.icon_value} alt={user.display_name || 'Ícono'} />
      ) : (
        preset.render(strokeColor)
      )}

      {status === 'maybe' && (
        <span className="avatar-mini-badge maybe" title="Quizás">
          ?
        </span>
      )}

      {hasNote && (
        <span className="avatar-mini-badge note" title="Tiene nota" />
      )}
    </span>
  );
}
