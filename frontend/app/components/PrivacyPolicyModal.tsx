import React from 'react';
import { View, Text, ScrollView, SafeAreaView, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles';

interface PrivacyPolicyModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ visible, onClose }) => (
  <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
    <SafeAreaView style={styles.modalContainer}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Privacy Policy</Text>
        <TouchableOpacity onPress={onClose} data-testid="close-privacy-modal">
          <Ionicons name="close" size={24} color="#00ffff" />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.modalContent}>
        <Text style={styles.privacyHeading}>Street Shield Privacy Policy</Text>
        <Text style={styles.privacyDate}>Last updated: April 2, 2026</Text>

        <Text style={styles.privacySectionTitle}>1. Information We Collect</Text>
        <Text style={styles.privacyText}>
          Street Shield collects location data (GPS coordinates) only while the app is actively in use and the shield is activated. We also collect device sensor data (accelerometer, pedometer) for activity insights. All data is processed locally on your device or via our secure servers.
        </Text>

        <Text style={styles.privacySectionTitle}>2. How We Use Your Information</Text>
        <Text style={styles.privacyText}>
          Your location data is used solely to provide real-time safety analysis and environmental awareness. Activity data (steps, motion) is used to provide personalized activity insights. We do not sell, share, or distribute your personal data to third parties.
        </Text>

        <Text style={styles.privacySectionTitle}>3. Data Storage &amp; Security</Text>
        <Text style={styles.privacyText}>
          Safety analysis data is stored temporarily on our encrypted servers and automatically deleted after 24 hours. Trusted contact information is stored locally on your device using encrypted storage. We use industry-standard encryption for all data transmissions.
        </Text>

        <Text style={styles.privacySectionTitle}>4. Trusted Contacts</Text>
        <Text style={styles.privacyText}>
          Phone numbers you provide as trusted contacts are stored locally on your device. When a quick alert is triggered, your location is shared only with those contacts. We do not retain or access your contacts list.
        </Text>

        <Text style={styles.privacySectionTitle}>5. Third-Party Services</Text>
        <Text style={styles.privacyText}>
          Street Shield uses AI services for safety analysis and weather APIs for environmental data. These services receive anonymized location data only. No personally identifiable information is shared with these providers.
        </Text>

        <Text style={styles.privacySectionTitle}>6. Your Rights</Text>
        <Text style={styles.privacyText}>
          You can delete all locally stored data at any time by clearing the app data. You can revoke location permissions through your device settings. You may request deletion of any server-side data by contacting us.
        </Text>

        <Text style={styles.privacySectionTitle}>7. Children's Privacy</Text>
        <Text style={styles.privacyText}>
          Street Shield is designed for users aged 13 and above. We do not knowingly collect data from children under 13.
        </Text>

        <Text style={styles.privacySectionTitle}>8. Changes to This Policy</Text>
        <Text style={styles.privacyText}>
          We may update this privacy policy from time to time. Users will be notified of significant changes through in-app notifications.
        </Text>

        <Text style={styles.privacySectionTitle}>9. Disclaimer</Text>
        <Text style={styles.privacyText}>
          This app is not a medical device or emergency service. It is intended for informational purposes only and should not be relied upon in situations requiring professional assistance. Always contact appropriate professional services when needed.
        </Text>

        <Text style={[styles.privacyText, { marginTop: 20, marginBottom: 40, textAlign: 'center', color: '#555' }]}>
          Contact: support@streetshield.app
        </Text>
      </ScrollView>
    </SafeAreaView>
  </Modal>
);
