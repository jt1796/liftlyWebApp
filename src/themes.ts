import type { ThemeOptions } from '@mui/material';

export interface ColorThemeDefinition {
  /** Unique key stored in localStorage */
  id: string;
  /** Display name shown in the theme picker */
  label: string;
  /** Short emoji shown as a swatch / icon */
  icon: string;
  /** MUI palette mode this theme is based on */
  baseMode: 'light' | 'dark';
  /** MUI ThemeOptions merged into createTheme */
  themeOptions: ThemeOptions;
}

export const COLOR_THEMES: ColorThemeDefinition[] = [
  // ── Dark themes ──────────────────────────────────────────────
  {
    id: 'dark',
    label: 'Default Dark',
    icon: '🌑',
    baseMode: 'dark',
    themeOptions: {
      palette: {
        mode: 'dark',
      },
    },
  },
  {
    id: 'midnight-blue',
    label: 'Midnight Blue',
    icon: '🌌',
    baseMode: 'dark',
    themeOptions: {
      palette: {
        mode: 'dark',
        primary: { main: '#60a5fa' },
        secondary: { main: '#818cf8' },
        background: { default: '#0f172a', paper: '#1e293b' },
      },
    },
  },
  {
    id: 'deep-purple',
    label: 'Deep Purple',
    icon: '🔮',
    baseMode: 'dark',
    themeOptions: {
      palette: {
        mode: 'dark',
        primary: { main: '#a78bfa' },
        secondary: { main: '#f472b6' },
        background: { default: '#1a1025', paper: '#271b36' },
      },
    },
  },
  {
    id: 'forest',
    label: 'Forest',
    icon: '🌲',
    baseMode: 'dark',
    themeOptions: {
      palette: {
        mode: 'dark',
        primary: { main: '#4ade80' },
        secondary: { main: '#a3e635' },
        background: { default: '#0d1f12', paper: '#162b1a' },
      },
    },
  },
  {
    id: 'ember',
    label: 'Ember',
    icon: '🔥',
    baseMode: 'dark',
    themeOptions: {
      palette: {
        mode: 'dark',
        primary: { main: '#f97316' },
        secondary: { main: '#fbbf24' },
        background: { default: '#1c1008', paper: '#2a1a0e' },
      },
    },
  },
  {
    id: 'cyberpunk',
    label: 'Cyberpunk',
    icon: '⚡',
    baseMode: 'dark',
    themeOptions: {
      palette: {
        mode: 'dark',
        primary: { main: '#06b6d4' },
        secondary: { main: '#e879f9' },
        background: { default: '#0a0a0f', paper: '#14141f' },
      },
    },
  },
  {
    id: 'rose-noir',
    label: 'Rosé Noir',
    icon: '🥀',
    baseMode: 'dark',
    themeOptions: {
      palette: {
        mode: 'dark',
        primary: { main: '#fb7185' },
        secondary: { main: '#fda4af' },
        background: { default: '#1a0a10', paper: '#2a1420' },
      },
    },
  },
  // ── Light themes ─────────────────────────────────────────────
  {
    id: 'light',
    label: 'Default Light',
    icon: '☀️',
    baseMode: 'light',
    themeOptions: {
      palette: {
        mode: 'light',
      },
    },
  },
  {
    id: 'ocean-breeze',
    label: 'Ocean Breeze',
    icon: '🌊',
    baseMode: 'light',
    themeOptions: {
      palette: {
        mode: 'light',
        primary: { main: '#0284c7' },
        secondary: { main: '#0891b2' },
        background: { default: '#f0f9ff', paper: '#ffffff' },
      },
    },
  },
  {
    id: 'lavender',
    label: 'Lavender',
    icon: '💜',
    baseMode: 'light',
    themeOptions: {
      palette: {
        mode: 'light',
        primary: { main: '#7c3aed' },
        secondary: { main: '#a855f7' },
        background: { default: '#faf5ff', paper: '#ffffff' },
      },
    },
  },
  {
    id: 'sakura',
    label: 'Sakura',
    icon: '🌸',
    baseMode: 'light',
    themeOptions: {
      palette: {
        mode: 'light',
        primary: { main: '#db2777' },
        secondary: { main: '#f472b6' },
        background: { default: '#fdf2f8', paper: '#ffffff' },
      },
    },
  },
  {
    id: 'mint',
    label: 'Mint',
    icon: '🍃',
    baseMode: 'light',
    themeOptions: {
      palette: {
        mode: 'light',
        primary: { main: '#059669' },
        secondary: { main: '#10b981' },
        background: { default: '#ecfdf5', paper: '#ffffff' },
      },
    },
  },
  {
    id: 'sand',
    label: 'Sand',
    icon: '🏜️',
    baseMode: 'light',
    themeOptions: {
      palette: {
        mode: 'light',
        primary: { main: '#b45309' },
        secondary: { main: '#d97706' },
        background: { default: '#fefce8', paper: '#fffbeb' },
      },
    },
  },
];

/** Look up a theme by ID, falling back to Default Dark */
export const getThemeById = (id: string): ColorThemeDefinition =>
  COLOR_THEMES.find((t) => t.id === id) ?? COLOR_THEMES[0];
