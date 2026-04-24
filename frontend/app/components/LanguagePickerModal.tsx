import React from 'react';
import { View, Text, ScrollView, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles';

interface LanguagePickerModalProps {
  visible: boolean;
  currentLanguage: string;
  onClose: () => void;
  onSelect: (lang: string) => void;
}

const LANGUAGES = ['en', 'es', 'fr', 'de', 'zh'];
const FLAGS: Record<string, string> = { en: '\u{1F1EC}\u{1F1E7}', es: '\u{1F1EA}\u{1F1F8}', fr: '\u{1F1EB}\u{1F1F7}', de: '\u{1F1E9}\u{1F1EA}', zh: '\u{1F1E8}\u{1F1F3}' };
const NAMES: Record<string, string> = { en: 'English', es: 'Español', fr: 'Français', de: 'Deutsch', zh: '中文' };

export const LanguagePickerModal: React.FC<LanguagePickerModalProps> = ({ visible, currentLanguage, onClose, onSelect }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={styles.languageModal}>
        <View style={styles.languageModalHeader}>
          <Text style={styles.languageModalTitle}>Select Language / Seleccionar idioma</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.languageList}>
          {LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang}
              style={[styles.languageOption, currentLanguage === lang && styles.languageOptionActive]}
              onPress={() => onSelect(lang)}
            >
              <Text style={styles.languageFlag}>{FLAGS[lang]}</Text>
              <Text style={[styles.languageName, currentLanguage === lang && styles.languageNameActive]}>
                {NAMES[lang]}
              </Text>
              {currentLanguage === lang && <Ionicons name="checkmark-circle" size={24} color="#00ffcc" />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  </Modal>
);
