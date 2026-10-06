import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/store/auth';
import { Icon } from './Icon';
import { Radius } from '@/constants/theme';

interface ThemeToggleProps {
  style?: ViewStyle;
  size?: number;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ style, size = 38 }) => {
  const { colors, isDark } = useThemeColors();
  const setTheme = useAuthStore((s) => s.setTheme);

  const handleToggle = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handleToggle}
      style={[
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <Icon
        name={isDark ? 'weather-sunny' : 'weather-night'}
        size={Math.round(size * 0.52)}
        color={isDark ? '#F59E0B' : '#6366F1'}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
