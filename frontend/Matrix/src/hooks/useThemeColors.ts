import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/store/auth';

export const useThemeColors = () => {
  const systemScheme = useColorScheme();
  const themePreference = useAuthStore((s) => s.theme);

  const isDark =
    themePreference === 'dark' || (themePreference === 'system' && systemScheme === 'dark');

  return {
    colors: isDark ? Colors.dark : Colors.light,
    isDark,
  };
};
