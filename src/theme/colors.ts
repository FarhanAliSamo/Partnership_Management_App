/**
 * Premium dark-first design system.
 * Primary accent: electric violet/purple.
 * Semantic: green = positive/earned, red = negative/owed, orange = pending,
 * blue = secondary/informational finance states.
 */

export const accent = {
  300: '#A78BFA',
  400: '#8B5CF6',
  500: '#7C3AED',
  600: '#6D28D9',
};

export const blue = {
  400: '#38BDF8',
  500: '#0EA5E9',
  600: '#0284C7',
};

export const light = {
  bg: '#F5F6FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F1F5',
  border: '#E6E8EE',
  text: '#10151C',
  textSecondary: '#5B6472',
  textMuted: '#98A1AE',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  info: accent[500],
  infoSecondary: blue[500],
};

export const dark = {
  bg: '#0B0F14',
  surface: '#131920',
  surfaceAlt: '#1A222B',
  border: '#232C38',
  text: '#E9EDF3',
  textSecondary: '#9AA6B2',
  textMuted: '#5E6A76',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: accent[400],
  infoSecondary: blue[400],
};

export type Palette = typeof dark;