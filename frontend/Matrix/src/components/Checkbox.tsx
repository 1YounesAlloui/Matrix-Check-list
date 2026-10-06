import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Icon } from './Icon';
import { Radius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';

interface CheckboxProps {
  checked: boolean;
  onToggle: () => void;
  color?: string;
  size?: number;
  disabled?: boolean;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onToggle,
  color,
  size = 24,
  disabled = false,
}) => {
  const { colors } = useThemeColors();
  const activeColor = color || colors.primary;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onToggle}
      disabled={disabled}
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: checked ? activeColor : colors.border,
          backgroundColor: checked ? activeColor : 'transparent',
          opacity: disabled ? 0.4 : 1,
        },
      ]}
    >
      {checked ? (
        <Icon name="check" size={size * 0.65} color="#FFFFFF" />
      ) : (
        <View style={{ width: size * 0.35, height: size * 0.35 }} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
