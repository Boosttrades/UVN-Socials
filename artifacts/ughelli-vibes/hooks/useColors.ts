import colors from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Returns the design tokens for the active palette.
 *
 * The active palette follows the user's Appearance preference set in
 * Settings ('light' / 'dark' / 'system'), not just the raw OS setting —
 * see contexts/ThemeContext.tsx.
 */
export function useColors() {
  const { resolvedScheme } = useTheme();
  const palette = resolvedScheme === 'dark' ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius };
}
