import React from 'react';

export const BG_COLOR_PALETTE = [
  { hex: '#6366f1', name: 'Índigo' },
  { hex: '#8b5cf6', name: 'Violeta' },
  { hex: '#ec4899', name: 'Rosa' },
  { hex: '#f43f5e', name: 'Coral' },
  { hex: '#f97316', name: 'Naranja' },
  { hex: '#eab308', name: 'Ámbar' },
  { hex: '#22c55e', name: 'Verde' },
  { hex: '#10b981', name: 'Esmeralda' },
  { hex: '#14b8a6', name: 'Turquesa' },
  { hex: '#06b6d4', name: 'Cian' },
  { hex: '#3b82f6', name: 'Azul' },
  { hex: '#64748b', name: 'Pizarra' },
];

export function getContrastColor(hex) {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return '#ffffff';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.65 ? '#0f172a' : '#ffffff';
}

export const PRESET_ICONS = [
  {
    id: 'd20',
    label: 'Dado D20',
    render: (color) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 21 7 21 17 12 22 3 17 3 7" />
        <polygon points="12 6.5 17.5 16 6.5 16" />
        <line x1="12" y1="2" x2="12" y2="6.5" />
        <line x1="21" y1="7" x2="17.5" y2="16" />
        <line x1="3" y1="7" x2="6.5" y2="16" />
        <line x1="12" y1="22" x2="17.5" y2="16" />
        <line x1="12" y1="22" x2="6.5" y2="16" />
      </svg>
    ),
  },
  {
    id: 'sword',
    label: 'Espada',
    render: (color) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
        <path d="M13 19l6-6" />
        <path d="M16 16l4 4" />
        <path d="M19 21l2-2" />
      </svg>
    ),
  },
  {
    id: 'wizard',
    label: 'Mago',
    render: (color) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 19h18" />
        <path d="M6 19l6-15 6 15" />
        <path d="M8.5 13h7" />
        <circle cx="12" cy="10" r="1" fill={color} />
      </svg>
    ),
  },
  {
    id: 'dragon',
    label: 'Escudo',
    render: (color) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z" />
        <path d="M12 8v8" />
        <path d="M9 11h6" />
      </svg>
    ),
  },
  {
    id: 'cat',
    label: 'Gato',
    render: (color) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 9V4l4 3h8l4-3v5c0 6-3 10-8 10S4 15 4 9z" />
        <circle cx="9.5" cy="12" r="1" fill={color} />
        <circle cx="14.5" cy="12" r="1" fill={color} />
        <path d="M10.5 15c1 .8 2 .8 3 0" />
      </svg>
    ),
  },
  {
    id: 'fox',
    label: 'Zorro',
    render: (color) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 5l5 4h6l5-4-1 9-7 6-7-6-1-9z" />
        <circle cx="9.5" cy="12.5" r="0.9" fill={color} />
        <circle cx="14.5" cy="12.5" r="0.9" fill={color} />
        <path d="M11 16h2" />
      </svg>
    ),
  },
  {
    id: 'frog',
    label: 'Rana',
    render: (color) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="2.5" />
        <circle cx="16" cy="8" r="2.5" />
        <path d="M5 13c0 4 3 6.5 7 6.5s7-2.5 7-6.5c0-1.5-.8-2.8-2-3.5" />
        <path d="M9 15.5c1.5 1 4.5 1 6 0" />
      </svg>
    ),
  },
  {
    id: 'ghost',
    label: 'Fantasma',
    render: (color) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 20V11a7 7 0 0 1 14 0v9l-2.5-2-2.2 2-2.3-2-2.3 2-2.2-2L5 20z" />
        <circle cx="9.5" cy="11" r="1" fill={color} />
        <circle cx="14.5" cy="11" r="1" fill={color} />
      </svg>
    ),
  },
  {
    id: 'gamepad',
    label: 'Gamer',
    render: (color) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2.5" y="7" width="19" height="10" rx="5" />
        <path d="M6.5 12h4" />
        <path d="M8.5 10v4" />
        <circle cx="15.5" cy="11" r="0.9" fill={color} />
        <circle cx="17.5" cy="13" r="0.9" fill={color} />
      </svg>
    ),
  },
  {
    id: 'pizza',
    label: 'Pizza',
    render: (color) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l8.5 16.5a16 16 0 0 1-17 0L12 3z" />
        <circle cx="11" cy="12" r="1" fill={color} />
        <circle cx="14" cy="15" r="1" fill={color} />
        <circle cx="9.5" cy="16.5" r="0.9" fill={color} />
      </svg>
    ),
  },
  {
    id: 'coffee',
    label: 'Café',
    render: (color) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 9h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9z" />
        <path d="M16 10h2a2.5 2.5 0 0 1 0 5h-2" />
        <path d="M7 5c0-1 1-1.5 1-2.5" />
        <path d="M11 5c0-1 1-1.5 1-2.5" />
      </svg>
    ),
  },
  {
    id: 'rocket',
    label: 'Cohete',
    render: (color) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.5 16.5c-1.5 1.3-2 3.5-2 3.5s2.2-.5 3.5-2" />
        <path d="M12 15l-3-3a22 22 0 0 1 2-3.9A12.8 12.8 0 0 1 21 3a12.8 12.8 0 0 1-5.1 10A22 22 0 0 1 12 15z" />
        <circle cx="15" cy="9" r="1.2" fill={color} />
      </svg>
    ),
  },
  {
    id: 'music',
    label: 'Música',
    render: (color) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V6l11-2v12" />
        <circle cx="6.5" cy="18" r="2.5" />
        <circle cx="17.5" cy="16" r="2.5" />
      </svg>
    ),
  },
  {
    id: 'star',
    label: 'Estrella',
    render: (color) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 3 14.9 8.9 21.4 9.8 16.7 14.4 17.8 20.8 12 17.7 6.2 20.8 7.3 14.4 2.6 9.8 9.1 8.9 12 3" />
      </svg>
    ),
  },
  {
    id: 'bolt',
    label: 'Rayo',
    render: (color) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 4 14 11.5 14 10.5 22 20 10 12.5 10 13 2" />
      </svg>
    ),
  },
  {
    id: 'crown',
    label: 'Corona',
    render: (color) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 18h18l-1.5-10-4.5 4-3-6-3 6-4.5-4L3 18z" />
      </svg>
    ),
  },
];

export const PRESET_ICON_MAP = Object.fromEntries(PRESET_ICONS.map((icon) => [icon.id, icon]));
