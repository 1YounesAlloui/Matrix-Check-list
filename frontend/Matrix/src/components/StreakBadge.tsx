import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from './Icon';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';

interface StreakBadgeProps {
  streak: number;
  size?: 'sm' | 'md';
}

export const StreakBadge: React.FC<StreakBadgeProps> = ({ streak, size = 'sm' }) => {
  const { colors } = useThemeColors();

  if (streak <= 0) return null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.streak + '20',
          borderColor: colors.streak + '40',
          paddingHorizontal: size === 'sm' ? Spacing.sm : Spacing.md,
          paddingVertical: size === 'sm' ? 2 : Spacing.xs,
        },
      ]}
    >
      <Icon
        name="fire"
        size={size === 'sm' ? 14 : 18}
        color={colors.streak}
        style={{ marginRight: 2 }}
      />
      <Text
        style={[
          Typography.captionMedium,
          {
            color: colors.streak,
            fontSize: size === 'sm' ? 12 : 14,
          },
        ]}
      >
        {streak}d
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    borderWidth: 1,
  },
});
