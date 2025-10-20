import React from 'react';
import { Text, TextProps } from 'react-native';
import i18n from '../translations';

// Helper component for translated text
export const T = ({ tKey, style, ...props }: TextProps & { tKey: string }) => {
  return <Text style={style} {...props}>{i18n.t(tKey)}</Text>;
};

// Helper function for translated strings
export const t = (key: string, params?: object) => {
  return i18n.t(key, params);
};
