import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon, IconName } from './Icon';
import { Button } from './Button';
import { Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';

interface EmptyStateProps {
  icon?: IconName | string;
  title: string;
  description: string;
  actionTitle?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'calendar-blank-outline',
  title,
  description,
  actionTitle,
  onAction,
}) => {
  const { colors } = useThemeColors();

  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, { backgroundColor: colors.cardElevated }]}>
        <Icon name={icon} size={36} color={colors.primary} />
      </View>
      <Text style={[Typography.title2, { color: colors.text, marginTop: Spacing.lg }]}>
        {title}
      </Text>
      <Text
        style={[
          Typography.body,
          {
            color: colors.textMuted,
            textAlign: 'center',
            marginTop: Spacing.xs,
            marginBottom: Spacing.xl,
            paddingHorizontal: Spacing.xl,
          },
        ]}
      >
        {description}
      </Text>
      {actionTitle && onAction && (
        <Button title={actionTitle} onPress={onAction} size="md" />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
