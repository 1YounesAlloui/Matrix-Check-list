import React from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface IconProps {
  name: IconName | string;
  size?: number;
  color?: string;
  style?: object;
}

export const Icon: React.FC<IconProps> = ({ name, size = 20, color = '#fff', style }) => {
  // Safe cast for MaterialCommunityIcons glyphs
  const glyphName = (name as IconName) in MaterialCommunityIcons.glyphMap
    ? (name as IconName)
    : 'checkbox-blank-circle-outline';

  return <MaterialCommunityIcons name={glyphName} size={size} color={color} style={style} />;
};
