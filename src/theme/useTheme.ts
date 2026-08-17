import { useColorScheme } from 'react-native';
import { light, dark, Palette } from './colors';

/**
 * Returns the current palette based on the system color scheme.
 * Component-level theming can be overridden via useUiStore in screens,
 * but this hook keeps presentational components simple.
 */
export function useTheme(): Palette {
  const scheme = useColorScheme();
  return scheme === 'dark' ? dark : light;
}