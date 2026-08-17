import { useColorScheme } from 'react-native';
import { accent, light, dark, Palette } from './colors';

export type { Palette };
export { accent };

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const typography = {
  display: 30,
  title: 21,
  body: 16,
  subhead: 14,
  caption: 12,
  label: 13,
} as const;

export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export type ThemeMode = 'light' | 'dark' | 'system';

export function useAppTheme(mode: ThemeMode = 'system'): Palette {
  const scheme = useColorScheme();
  const effective = mode === 'system' ? scheme : mode;
  return effective === 'dark' ? dark : light;
}

export function resolvePalette(mode: ThemeMode, system: 'light' | 'dark' | null): Palette {
  const effective = mode === 'system' ? system : mode;
  return effective === 'dark' ? dark : light;
}

export { light, dark };