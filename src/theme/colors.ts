/**
 * Single-accent design system colors (light + dark), per docs/10-ui-design.md.
 */

export const accent = {
  400: '#38BDF8',
  500: '#0EA5E9',
  600: '#0284C7',
};

export const light = {
  bg: '#F7F8FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F2F6',
  border: '#E5E7EB',
  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  info: accent[500],
};

export const dark = {
  bg: '#0B1220',
  surface: '#111A2C',
  surfaceAlt: '#1B2740',
  border: '#243355',
  text: '#F3F4F6',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: accent[400],
};

export type Palette = typeof light;