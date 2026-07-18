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
        primary: { main: '#6366f1' },
        secondary: { main: '#ec4899' },
        background: { default: '#0b0f19', paper: '#111827' },
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
        primary: { main: '#38bdf8' },
        secondary: { main: '#818cf8' },
        background: { default: '#030712', paper: '#0f172a' },
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
        primary: { main: '#c084fc' },
        secondary: { main: '#f472b6' },
        background: { default: '#090514', paper: '#140c24' },
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
        primary: { main: '#34d399' },
        secondary: { main: '#a3e635' },
        background: { default: '#022c22', paper: '#064e3b' },
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
        secondary: { main: '#facc15' },
        background: { default: '#180805', paper: '#2a140b' },
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
        secondary: { main: '#ec4899' },
        background: { default: '#04020a', paper: '#0d071a' },
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
        primary: { main: '#f43f5e' },
        secondary: { main: '#fb7185' },
        background: { default: '#0f050b', paper: '#1f0b18' },
      },
    },
  },
  {
    id: 'solarized-dark',
    label: 'Solarized Dark',
    icon: '🪐',
    baseMode: 'dark',
    themeOptions: {
      palette: {
        mode: 'dark',
        primary: { main: '#268bd2' },
        secondary: { main: '#2aa198' },
        background: { default: '#002b36', paper: '#073642' },
        text: {
          primary: '#93a1a1',
          secondary: '#839496',
          disabled: '#586e75',
        },
        divider: '#586e75',
      },
    },
  },
  {
    id: 'hacker-terminal',
    label: 'Hacker Terminal',
    icon: '💻',
    baseMode: 'dark',
    themeOptions: {
      palette: {
        mode: 'dark',
        primary: { main: '#00e676' },
        secondary: { main: '#76ff03' },
        background: { default: '#000000', paper: '#0a0f0a' },
        text: {
          primary: '#33ff33',
          secondary: '#1abf1a',
          disabled: '#0d6b0d',
        },
        divider: '#0d3d0d',
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
        primary: { main: '#2563eb' },
        secondary: { main: '#4f46e5' },
        background: { default: '#f8fafc', paper: '#ffffff' },
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
        secondary: { main: '#0ea5e9' },
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
        background: { default: '#fff1f2', paper: '#ffffff' },
      },
    },
  },
  {
    id: 'valentine-pink',
    label: 'Valentine Pink',
    icon: '💖',
    baseMode: 'light',
    themeOptions: {
      palette: {
        mode: 'light',
        primary: { main: '#e11d48' },
        secondary: { main: '#db2777' },
        background: { default: '#fff1f2', paper: '#ffffff' },
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
        background: { default: '#f0fdf4', paper: '#ffffff' },
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
        primary: { main: '#d97706' },
        secondary: { main: '#b45309' },
        background: { default: '#fdfaf2', paper: '#ffffff' },
      },
    },
  },
  {
    id: 'solarized-light',
    label: 'Solarized Light',
    icon: '🌅',
    baseMode: 'light',
    themeOptions: {
      palette: {
        mode: 'light',
        primary: { main: '#268bd2' },
        secondary: { main: '#2aa198' },
        background: { default: '#fdf6e3', paper: '#eee8d5' },
        text: {
          primary: '#586e75',
          secondary: '#657b83',
          disabled: '#93a1a1',
        },
        divider: '#eee8d5',
      },
    },
  },
];

/** Look up a theme by ID, falling back to Default Dark */
export const getThemeById = (id: string): ColorThemeDefinition =>
  COLOR_THEMES.find((t) => t.id === id) ?? COLOR_THEMES[0];
