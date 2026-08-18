import { useColorScheme } from 'react-native';
import { light, dark, Palette } from './colors';
import { useUiStore } from '@/stores/useUiStore';

/**
 * Returns the active palette, honoring the user's appearance setting
 * (Light / Dark / System). Dark-first is the default experience,
 * but light mode is kept fully polished via the same palette contract.
 */
export function useTheme(): Palette {
  const scheme = useColorScheme();
  const mode = useUiStore((s) => s.theme);
  const effective = mode === 'system' ? scheme : mode;
  return effective === 'dark' ? dark : light;
}