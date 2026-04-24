import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../../translations';
import { styles } from '../styles';

interface HeaderProps {
  currentLanguage: string;
  onLanguagePress: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentLanguage, onLanguagePress }) => (
  <View style={styles.header}>
    <View style={styles.titleContainer}>
      <View style={styles.shieldIcon}>
        <Ionicons name="shield-checkmark" size={32} color="#00ffff" />
      </View>
      <View style={styles.titleText}>
        <Text style={styles.appTitle}>{i18n.t('appTitle')}</Text>
        <Text style={styles.appSubtitle}>Neural Safety Network</Text>
      </View>
    </View>
    <TouchableOpacity 
      style={styles.languageButton}
      onPress={onLanguagePress}
    >
      <Ionicons name="language" size={24} color="#00ffff" />
      <Text style={styles.languageCode}>{currentLanguage.toUpperCase()}</Text>
    </TouchableOpacity>
    <View style={styles.headerGlow} />
  </View>
);
